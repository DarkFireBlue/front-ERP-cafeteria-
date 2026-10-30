// Modelo de datos para gestion de proveedores y distribuidores
const db = require('../config/db');

const ProveedorModel = {
  // Devuelve todos los proveedores registrados
  listarTodos: (callback) => {
    const sql = 'SELECT * FROM proveedores ORDER BY nombre ASC';
    db.query(sql, callback);
  },

  // Busca un proveedor por su ID
  buscarPorId: (id, callback) => {
    const sql = 'SELECT * FROM proveedores WHERE id = ?';
    db.query(sql, [id], (error, rows) => {
      if (error) return callback(error);
      callback(null, rows[0] || null);
    });
  },

  // Inserta un nuevo proveedor en la base de datos
  crear: (datos, callback) => {
    const { nombre, contacto = null, telefono = null, correo = null, direccion = null } = datos;
    const sql = `
      INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sql, [nombre, contacto, telefono, correo, direccion], (error, resultado) => {
      if (error) return callback(error);
      callback(null, { id: resultado.insertId, ...datos });
    });
  },

  // Actualiza los datos de un proveedor existente
  actualizar: (id, datos, callback) => {
    const { nombre, contacto, telefono, correo, direccion } = datos;
    const sql = `
      UPDATE proveedores
      SET nombre = ?, contacto = ?, telefono = ?, correo = ?, direccion = ?
      WHERE id = ?
    `;
    db.query(sql, [nombre, contacto, telefono, correo, direccion, id], (error, resultado) => {
      if (error) return callback(error);
      callback(null, resultado.affectedRows > 0);
    });
  },

  // Elimina un proveedor por ID
  eliminar: (id, callback) => {
    const sql = 'DELETE FROM proveedores WHERE id = ?';
    db.query(sql, [id], (error, resultado) => {
      if (error) return callback(error);
      callback(null, resultado.affectedRows > 0);
    });
  }
};

module.exports = ProveedorModel;
