// Servicio transaccional de ventas, reduccion de stock, facturacion XML y registro contable
const db = require('../config/db');
const { generarFacturaXML } = require('./xml.service');

// Obtiene el balance diario de ventas para las tarjetas de resumen
function obtenerResumenVentas(callback) {
  const sql = `
    SELECT 
      COUNT(*) AS ventasHoy,
      COALESCE(SUM(monto), 0) AS totalDia,
      COALESCE(SUM(ROUND(monto * 0.16 / 1.16, 2)), 0) AS ivaAcumulado
    FROM movimientos_financieros
    WHERE tipo_movimiento = 'ingreso' AND DATE(fecha) = CURDATE()
  `;

  db.query(sql, (error, filas) => {
    if (error) {
      // Fallback a vista movimiento_financiero
      return db.query(
        "SELECT COUNT(*) AS ventasHoy, COALESCE(SUM(monto), 0) AS totalDia, COALESCE(SUM(ROUND(monto * 0.16 / 1.16, 2)), 0) AS ivaAcumulado FROM movimiento_financiero WHERE tipo_movimiento = 'ingreso' AND DATE(fecha) = CURDATE()",
        (errFallback, filasFallback) => {
          if (errFallback) return callback(error, null);
          const r = filasFallback[0] || { ventasHoy: 0, totalDia: 0, ivaAcumulado: 0 };
          formatearResumen(r, callback);
        }
      );
    }
    const r = filas[0] || { ventasHoy: 0, totalDia: 0, ivaAcumulado: 0 };
    formatearResumen(r, callback);
  });
}

function formatearResumen(r, callback) {
  callback(null, {
    ventasHoy: Number(r.ventasHoy || 0),
    totalDia: `$${Number(r.totalDia || 0).toFixed(2)}`,
    ivaAcumulado: `$${Number(r.ivaAcumulado || 0).toFixed(2)}`
  });
}

// Obtiene el listado historico de ventas y comprobantes
function obtenerVentas(clienteId, callback) {
  let sql = `
    SELECT 
      v.id,
      v.folio,
      COALESCE(v.nombre_cliente, u.nombre, 'Publico general') AS cliente,
      COALESCE(v.referencia_pago, v.canal, 'Local') AS canal,
      v.total,
      v.iva,
      v.fecha,
      f.id AS factura_id,
      f.archivo_xml,
      'Facturada' AS estadoFactura
    FROM ventas v
    LEFT JOIN usuarios u ON u.id = v.cliente_id
    LEFT JOIN facturas f ON f.venta_id = v.id
  `;

  const params = [];
  if (clienteId) {
    sql += ' WHERE v.cliente_id = ?';
    params.push(clienteId);
  }
  sql += ' ORDER BY v.fecha DESC';

  db.query(sql, params, (error, filas) => {
    if (error) {
      // Fallback a vista 'factura'
      return db.query('SELECT * FROM factura ORDER BY fecha_emision DESC', (errFac, filasFac) => {
        if (errFac) return callback(error, null);
        const lista = filasFac.map((f) => ({
          id: f.id,
          folio: String(f.id),
          cliente: 'Cliente general',
          canal: f.orden_paypal_id || 'PayPal',
          total: '$0.00',
          iva: '$0.00',
          estadoFactura: 'Facturada',
          claseEstado: 'verde'
        }));
        callback(null, lista);
      });
    }

    const ventas = filas.map((v) => ({
      id: v.id,
      folio: v.folio || String(v.id),
      cliente: v.cliente,
      canal: v.canal,
      total: `$${Number(v.total || 0).toFixed(2)}`,
      iva: `$${Number(v.iva || 0).toFixed(2)}`,
      estadoFactura: v.estadoFactura,
      claseEstado: 'verde',
      factura_id: v.factura_id
    }));

    callback(null, ventas);
  });
}

// Verifica existencias suficientes de stock antes de autorizar la venta
function validarStockOrden(items, callback) {
  if (!items || !items.length) {
    return callback(new Error('El carrito no contiene productos'));
  }

  const ids = items.map((it) => Number(it.producto_id || it.id)).filter((id) => !isNaN(id) && id > 0);
  if (!ids.length) {
    return callback(new Error('Identificadores de producto invalidos'));
  }

  db.query('SELECT id, nombre, precio, stock FROM productos WHERE id IN (?)', [ids], (error, productos) => {
    if (error) return callback(error);

    const mapa = new Map(productos.map((p) => [p.id, p]));
    const detalleVerificado = [];
    let subtotal = 0;

    for (const it of items) {
      const prodId = Number(it.producto_id || it.id);
      const prod = mapa.get(prodId);
      if (!prod) {
        return callback(new Error(`Producto no encontrado en inventario (ID ${prodId})`));
      }

      const cant = Number(it.cantidad || 1);
      const stockActual = Number(prod.stock !== undefined ? prod.stock : 0);

      if (stockActual < cant) {
        return callback(new Error(`Stock insuficiente para "${prod.nombre}". Existencias: ${stockActual}`));
      }

      const precioUnit = Number(prod.precio || 0);
      const itemSub = Number((cant * precioUnit).toFixed(2));
      subtotal += itemSub;

      detalleVerificado.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        cantidad: cant,
        precio_unitario: precioUnit,
        subtotal: itemSub
      });
    }

    const iva = Number((subtotal * 0.16).toFixed(2));
    const total = Number((subtotal + iva).toFixed(2));
    callback(null, { subtotal, iva, total, detalle: detalleVerificado });
  });
}

// Registra la venta de forma atomica: resta stock, guarda venta, factura XML y movimiento contable
function crearVenta(datos, callback) {
  const {
    cliente_id = null,
    nombre_cliente = 'Publico general',
    correo_cliente = '',
    rfc_cliente = 'XAXX010101000',
    metodo_pago = 'Efectivo',
    orden_paypal_id = null,
    canal = orden_paypal_id ? 'PayPal' : 'Local',
    detalle = []
  } = datos;

  validarStockOrden(detalle, (errVal, calculo) => {
    if (errVal) return callback(errVal, null);

    const { subtotal, iva, total, detalle: itemsVerificados } = calculo;
    const folioVenta = 'VNT-' + Date.now().toString().slice(-6);

    db.beginTransaction((errTx) => {
      if (errTx) return callback(errTx, null);

      // 1. Descontar stock de cada producto involucrado
      function actualizarStock(indice) {
        if (indice >= itemsVerificados.length) {
          return insertarVenta();
        }

        const item = itemsVerificados[indice];
        db.query(
          'UPDATE productos SET stock = stock - ?, fecha_modificacion = NOW() WHERE id = ?',
          [item.cantidad, item.producto_id],
          (errStock) => {
            if (errStock) return db.rollback(() => callback(errStock, null));
            actualizarStock(indice + 1);
          }
        );
      }

      // 2. Insertar cabecera de la venta
      function insertarVenta() {
        const sqlVenta = `
          INSERT INTO ventas 
          (folio, cliente_id, nombre_cliente, correo_cliente, rfc_cliente, subtotal, iva, total, metodo_pago, referencia_pago, canal, fecha, estado)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Completada')
        `;
        const paramsVenta = [
          folioVenta,
          cliente_id,
          nombre_cliente,
          correo_cliente,
          rfc_cliente,
          subtotal,
          iva,
          total,
          metodo_pago,
          orden_paypal_id,
          canal
        ];

        db.query(sqlVenta, paramsVenta, (errVenta, resVenta) => {
          if (errVenta) return db.rollback(() => callback(errVenta, null));
          const ventaId = resVenta.insertId;

          // 3. Insertar detalle de productos
          insertarDetalles(ventaId, 0);
        });
      }

      function insertarDetalles(ventaId, indice) {
        if (indice >= itemsVerificados.length) {
          return generarYGuardarFactura(ventaId);
        }

        const item = itemsVerificados[indice];
        const sqlDet = 'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)';
        db.query(sqlDet, [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal], (errDet) => {
          if (errDet) return db.rollback(() => callback(errDet, null));
          insertarDetalles(ventaId, indice + 1);
        });
      }

      // 4. Generar y registrar comprobante fiscal CFDI 4.0 XML
      function generarYGuardarFactura(ventaId) {
        const facturaXML = generarFacturaXML({
          folio: folioVenta,
          subtotal,
          iva,
          total,
          cliente: {
            nombre: nombre_cliente,
            correo: correo_cliente,
            rfc: rfc_cliente
          },
          detalle: itemsVerificados
        });

        const sqlFac = `
          INSERT INTO facturas 
          (folio, venta_id, cliente_id, orden_paypal_id, uuid_sat, fecha_emision, archivo_xml, estado)
          VALUES (?, ?, ?, ?, ?, NOW(), ?, 'Facturada')
        `;
        db.query(sqlFac, [folioVenta, ventaId, cliente_id, orden_paypal_id, facturaXML.uuid, facturaXML.xml], (errFac, resFac) => {
          if (errFac) return db.rollback(() => callback(errFac, null));

          // 5. Registrar movimiento de ingreso en Finanzas
          const descripcionMov = orden_paypal_id
            ? `Venta en linea PayPal (${orden_paypal_id}) - ${nombre_cliente}`
            : `Venta en mostrador - ${nombre_cliente}`;

          const sqlMov = `
            INSERT INTO movimientos_financieros 
            (tipo_movimiento, monto, fecha, descripcion, referencia_paypal, venta_id)
            VALUES ('ingreso', ?, NOW(), ?, ?, ?)
          `;
          db.query(sqlMov, [total, descripcionMov, orden_paypal_id, ventaId], (errMov) => {
            if (errMov) return db.rollback(() => callback(errMov, null));

            db.commit((errCommit) => {
              if (errCommit) return db.rollback(() => callback(errCommit, null));

              callback(null, {
                id: ventaId,
                folio: folioVenta,
                total,
                iva,
                subtotal,
                factura_id: resFac.insertId,
                archivo_xml: facturaXML.xml,
                uuid_sat: facturaXML.uuid,
                orden_paypal_id
              });
            });
          });
        });
      }

      actualizarStock(0);
    });
  });
}

// Obtiene el XML de una factura por folio, ID de venta o referencia PayPal
function obtenerFacturaPorVenta(criterio, clienteId, callback) {
  let sql = 'SELECT * FROM facturas WHERE (id = ? OR folio = ? OR venta_id = ? OR orden_paypal_id = ?)';
  const params = [criterio, criterio, criterio, criterio];

  if (clienteId) {
    sql += ' AND cliente_id = ?';
    params.push(clienteId);
  }

  db.query(sql, params, (error, filas) => {
    if (error) return callback(error, null);
    callback(null, filas[0] || null);
  });
}

module.exports = {
  obtenerResumenVentas,
  obtenerVentas,
  validarStockOrden,
  crearVenta,
  obtenerFacturaPorVenta
};
