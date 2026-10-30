// Modelo transaccional para registro de compras a proveedores y actualizacion de stock
const db = require('../config/db');

const CompraModel = {
  // Devuelve el historial completo de compras con nombre de proveedor
  listarTodas: (callback) => {
    const sql = `
      SELECT c.*, p.nombre AS proveedor_nombre
      FROM compras c
      INNER JOIN proveedores p ON c.proveedor_id = p.id
      ORDER BY c.fecha DESC
    `;
    db.query(sql, callback);
  },

  // Devuelve el detalle de una compra especifica con informacion de productos
  obtenerDetalle: (compraId, callback) => {
    const sql = `
      SELECT dc.*, pr.nombre AS producto_nombre, pr.categoria
      FROM detalle_compras dc
      INNER JOIN productos pr ON dc.producto_id = pr.id
      WHERE dc.compra_id = ?
    `;
    db.query(sql, [compraId], callback);
  },

  // Registra una compra completa en una transaccion atomica:
  // 1. Inserta en 'compras', 2. Inserta en 'detalle_compras',
  // 3. Aumenta stock en 'productos', 4. Registra egreso en 'movimientos_financieros'
  registrar: (datos, callback) => {
    const { folio, proveedor_id, usuario_id = null, total, items, observaciones = null } = datos;

    db.beginTransaction((errTx) => {
      if (errTx) return callback(errTx);

      // Paso 1: Insertar cabecera de compra
      const sqlCompra = `
        INSERT INTO compras (folio, proveedor_id, usuario_id, total, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sqlCompra, [folio, proveedor_id, usuario_id, total, observaciones], (errC, resC) => {
        if (errC) return db.rollback(() => callback(errC));

        const compraId = resC.insertId;

        // Paso 2: Insertar detalles y actualizar stock de forma secuencial
        const insertarDetalle = (index) => {
          if (index >= items.length) {
            // Paso 4: Registrar egreso contable
            const sqlEgreso = `
              INSERT INTO movimientos_financieros
                (tipo_movimiento, monto, descripcion, compra_id)
              VALUES ('egreso', ?, ?, ?)
            `;
            const desc = `Compra ${folio} a proveedor ID ${proveedor_id}`;
            db.query(sqlEgreso, [total, desc, compraId], (errEgreso) => {
              if (errEgreso) return db.rollback(() => callback(errEgreso));

              db.commit((errCommit) => {
                if (errCommit) return db.rollback(() => callback(errCommit));
                callback(null, { compraId, folio, total });
              });
            });
            return;
          }

          const item = items[index];
          const subtotal = item.cantidad * item.precio_unitario;

          const sqlDetalle = `
            INSERT INTO detalle_compras
              (compra_id, producto_id, cantidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?)
          `;
          db.query(sqlDetalle, [compraId, item.producto_id, item.cantidad, item.precio_unitario, subtotal], (errD) => {
            if (errD) return db.rollback(() => callback(errD));

            // Paso 3: Aumentar stock del producto recibido
            const sqlStock = 'UPDATE productos SET stock = stock + ? WHERE id = ?';
            db.query(sqlStock, [item.cantidad, item.producto_id], (errS) => {
              if (errS) return db.rollback(() => callback(errS));
              insertarDetalle(index + 1);
            });
          });
        };

        insertarDetalle(0);
      });
    });
  }
};

module.exports = CompraModel;
