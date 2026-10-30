// Servicio para gestion de compras a proveedores, incremento de existencias y registro de egreso contable
const db = require('../config/db');

// Obtiene el historial de compras realizadas a proveedores
function obtenerCompras(callback) {
  const sql = `
    SELECT 
      c.id,
      c.folio,
      c.total,
      c.fecha,
      c.estado,
      p.nombre AS proveedor,
      (SELECT COUNT(*) FROM detalle_compras dc WHERE dc.compra_id = c.id) AS total_articulos
    FROM compras c
    LEFT JOIN proveedores p ON p.id = c.proveedor_id
    ORDER BY c.fecha DESC
  `;

  db.query(sql, (error, filas) => {
    if (error) return callback(error, null);
    const compras = filas.map((c) => ({
      id: c.id,
      folio: c.folio,
      proveedor: c.proveedor || 'Proveedor general',
      total: `$${Number(c.total || 0).toFixed(2)}`,
      fecha: new Date(c.fecha).toLocaleDateString(),
      estado: c.estado || 'Completada',
      articulos: c.total_articulos || 0
    }));
    callback(null, compras);
  });
}

// Registra una compra atomica: crea registro, suma stock a productos y asienta egreso contable
function crearCompra(datos, callback) {
  const {
    proveedor_id,
    usuario_id = null,
    observaciones = '',
    detalle = []
  } = datos;

  if (!proveedor_id) {
    return callback(new Error('Debe especificar un proveedor valido'));
  }
  if (!Array.isArray(detalle) || detalle.length === 0) {
    return callback(new Error('Debe agregar al menos un producto en la orden de compra'));
  }

  let totalCompra = 0;
  for (const item of detalle) {
    const cant = Number(item.cantidad || 0);
    const precio = Number(item.precio_unitario || item.precio || 0);
    if (cant <= 0 || precio < 0) {
      return callback(new Error('Cantidad y precio unitario deben ser mayores a cero'));
    }
    totalCompra += cant * precio;
  }
  totalCompra = Number(totalCompra.toFixed(2));

  const folioCompra = 'CMP-' + Date.now().toString().slice(-6);

  db.beginTransaction((errTx) => {
    if (errTx) return callback(errTx, null);

    // 1. Insertar cabecera de compra
    const sqlCompra = 'INSERT INTO compras (folio, proveedor_id, usuario_id, total, fecha, estado, observaciones) VALUES (?, ?, ?, ?, NOW(), "Completada", ?)';
    db.query(sqlCompra, [folioCompra, proveedor_id, usuario_id, totalCompra, observaciones], (errCmp, resCmp) => {
      if (errCmp) return db.rollback(() => callback(errCmp, null));
      const compraId = resCmp.insertId;

      // 2. Insertar detalles e incrementar stock
      function procesarDetalle(indice) {
        if (indice >= detalle.length) {
          return registrarEgreso(compraId);
        }

        const it = detalle[indice];
        const cant = Number(it.cantidad || 0);
        const precio = Number(it.precio_unitario || it.precio || 0);
        const subtotal = Number((cant * precio).toFixed(2));
        const prodId = Number(it.producto_id || it.id);

        const sqlDet = 'INSERT INTO detalle_compras (compra_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)';
        db.query(sqlDet, [compraId, prodId, cant, precio, subtotal], (errDet) => {
          if (errDet) return db.rollback(() => callback(errDet, null));

          // Incremento de existencias en el inventario
          db.query(
            'UPDATE productos SET stock = stock + ?, fecha_modificacion = NOW() WHERE id = ?',
            [cant, prodId],
            (errStock) => {
              if (errStock) return db.rollback(() => callback(errStock, null));
              procesarDetalle(indice + 1);
            }
          );
        });
      }

      // 3. Registrar movimiento de egreso contable en Finanzas
      function registrarEgreso(idCompra) {
        const sqlMov = `
          INSERT INTO movimientos_financieros 
          (tipo_movimiento, monto, fecha, descripcion, compra_id)
          VALUES ('egreso', ?, NOW(), ?, ?)
        `;
        const descripcion = `Compra de insumos (${folioCompra})`;
        db.query(sqlMov, [totalCompra, descripcion, idCompra], (errMov) => {
          if (errMov) return db.rollback(() => callback(errMov, null));

          db.commit((errCommit) => {
            if (errCommit) return db.rollback(() => callback(errCommit, null));
            callback(null, {
              id: idCompra,
              folio: folioCompra,
              proveedor_id,
              total: totalCompra,
              estado: 'Completada'
            });
          });
        });
      }

      procesarDetalle(0);
    });
  });
}

module.exports = {
  obtenerCompras,
  crearCompra
};
