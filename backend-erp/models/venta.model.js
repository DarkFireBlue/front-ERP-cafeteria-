// Modelo transaccional para ventas: validacion de stock, registro y facturacion
const db = require('../config/db');

const VentaModel = {
  // Devuelve el historial de ventas con informacion basica del cliente
  listarTodas: (callback) => {
    const sql = `
      SELECT v.id, v.folio, v.nombre_cliente, v.correo_cliente, v.rfc_cliente,
             v.subtotal, v.iva, v.total, v.metodo_pago, v.referencia_pago,
             v.canal, v.fecha, v.estado,
             f.id AS factura_id, f.uuid_sat, f.archivo_xml
      FROM ventas v
      LEFT JOIN facturas f ON f.venta_id = v.id
      ORDER BY v.fecha DESC
    `;
    db.query(sql, callback);
  },

  // Devuelve el detalle de una venta con los productos vendidos
  obtenerDetalle: (ventaId, callback) => {
    const sql = `
      SELECT dv.*, p.nombre AS producto_nombre, p.categoria
      FROM detalle_ventas dv
      INNER JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = ?
    `;
    db.query(sql, [ventaId], callback);
  },

  // Verifica si hay stock disponible para todos los items del carrito
  validarStock: (items, callback) => {
    const ids = items.map(i => i.producto_id);
    const sql = 'SELECT id, nombre, stock FROM productos WHERE id IN (?)';
    db.query(sql, [ids], (error, productos) => {
      if (error) return callback(error);

      const sinStock = [];
      for (const item of items) {
        const prod = productos.find(p => p.id === item.producto_id);
        if (!prod) {
          sinStock.push({ producto_id: item.producto_id, nombre: 'Desconocido', disponible: 0 });
        } else if (prod.stock < item.cantidad) {
          sinStock.push({ producto_id: prod.id, nombre: prod.nombre, disponible: prod.stock });
        }
      }

      callback(null, sinStock);
    });
  },

  // Registra una venta completa en una transaccion atomica:
  // 1. Inserta en 'ventas', 2. Inserta 'detalle_ventas',
  // 3. Descuenta stock en 'productos', 4. Registra ingreso en 'movimientos_financieros'
  registrar: (datos, callback) => {
    const {
      folio, cliente_id = null, nombre_cliente = 'Publico general',
      correo_cliente = null, rfc_cliente = 'XAXX010101000',
      subtotal, iva, total, metodo_pago = 'Efectivo',
      referencia_pago = null, canal = 'Local', items
    } = datos;

    db.beginTransaction((errTx) => {
      if (errTx) return callback(errTx);

      const sqlVenta = `
        INSERT INTO ventas
          (folio, cliente_id, nombre_cliente, correo_cliente, rfc_cliente,
           subtotal, iva, total, metodo_pago, referencia_pago, canal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sqlVenta,
        [folio, cliente_id, nombre_cliente, correo_cliente, rfc_cliente,
         subtotal, iva, total, metodo_pago, referencia_pago, canal],
        (errV, resV) => {
          if (errV) return db.rollback(() => callback(errV));

          const ventaId = resV.insertId;

          const insertarDetalle = (index) => {
            if (index >= items.length) {
              // Registrar ingreso contable
              const sqlIngreso = `
                INSERT INTO movimientos_financieros
                  (tipo_movimiento, monto, descripcion, referencia_paypal, venta_id)
                VALUES ('ingreso', ?, ?, ?, ?)
              `;
              const desc = `Venta ${folio} - ${nombre_cliente}`;
              const refPaypal = metodo_pago === 'PayPal' ? referencia_pago : null;
              db.query(sqlIngreso, [total, desc, refPaypal, ventaId], (errI) => {
                if (errI) return db.rollback(() => callback(errI));

                db.commit((errCommit) => {
                  if (errCommit) return db.rollback(() => callback(errCommit));
                  callback(null, { ventaId, folio, total });
                });
              });
              return;
            }

            const item = items[index];
            const subItem = item.cantidad * item.precio_unitario;

            const sqlDetalle = `
              INSERT INTO detalle_ventas
                (venta_id, producto_id, cantidad, precio_unitario, subtotal)
              VALUES (?, ?, ?, ?, ?)
            `;
            db.query(sqlDetalle, [ventaId, item.producto_id, item.cantidad, item.precio_unitario, subItem], (errD) => {
              if (errD) return db.rollback(() => callback(errD));

              const sqlStock = 'UPDATE productos SET stock = stock - ? WHERE id = ?';
              db.query(sqlStock, [item.cantidad, item.producto_id], (errS) => {
                if (errS) return db.rollback(() => callback(errS));
                insertarDetalle(index + 1);
              });
            });
          };

          insertarDetalle(0);
        }
      );
    });
  },

  // Guarda el comprobante CFDI 4.0 XML generado vinculado a la venta
  guardarFactura: (datos, callback) => {
    const { folio, venta_id, cliente_id = null, orden_paypal_id = null, uuid_sat = null, archivo_xml } = datos;
    const sql = `
      INSERT INTO facturas (folio, venta_id, cliente_id, orden_paypal_id, uuid_sat, archivo_xml)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [folio, venta_id, cliente_id, orden_paypal_id, uuid_sat, archivo_xml], (error, resultado) => {
      if (error) return callback(error);
      callback(null, { facturaId: resultado.insertId });
    });
  },

  // Devuelve el XML de la factura de una venta para descarga
  obtenerFacturaXML: (ventaId, callback) => {
    const sql = 'SELECT folio, uuid_sat, archivo_xml FROM facturas WHERE venta_id = ? LIMIT 1';
    db.query(sql, [ventaId], (error, rows) => {
      if (error) return callback(error);
      callback(null, rows[0] || null);
    });
  }
};

module.exports = VentaModel;
