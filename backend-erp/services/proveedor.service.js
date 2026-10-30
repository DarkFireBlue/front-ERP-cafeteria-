// Servicio para gestion de proveedores y distribuidores
const db = require('../config/db');

function obtenerProveedores(callback) {
  const sql = 'SELECT id, nombre, contacto, telefono, correo, direccion FROM proveedores ORDER BY nombre';
  db.query(sql, (error, filas) => {
    if (error) {
      // Fallback a vista distribuidor
      return db.query('SELECT id, nombre FROM distribuidor ORDER BY nombre', callback);
    }
    callback(null, filas);
  });
}

function validarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    const error = new Error('El nombre del proveedor es obligatorio');
    error.codigo = 'VALIDACION';
    return error;
  }
  return null;
}

function agregarProveedor(datos, callback) {
  const errVal = validarNombre(datos.nombre);
  if (errVal) return callback(errVal, null);

  const { nombre, contacto = '', telefono = '', correo = '', direccion = '' } = datos;
  const sql = 'INSERT INTO proveedores (nombre, contacto, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)';

  db.query(sql, [nombre.trim(), contacto, telefono, correo, direccion], (error, resultado) => {
    if (error) {
      // Fallback si la tabla solo tiene nombre
      return db.query('INSERT INTO distribuidor (nombre) VALUES (?)', [nombre.trim()], (errSub, resSub) => {
        if (errSub) return callback(error, null);
        callback(null, { id: resSub.insertId, nombre: nombre.trim() });
      });
    }
    callback(null, { id: resultado.insertId, ...datos, nombre: nombre.trim() });
  });
}

function editarProveedor(id, datos, callback) {
  const errVal = validarNombre(datos.nombre);
  if (errVal) return callback(errVal, null);

  const { nombre, contacto = '', telefono = '', correo = '', direccion = '' } = datos;
  const sql = 'UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, correo = ?, direccion = ? WHERE id = ?';

  db.query(sql, [nombre.trim(), contacto, telefono, correo, direccion, id], (error) => {
    if (error) {
      return db.query('UPDATE distribuidor SET nombre = ? WHERE id = ?', [nombre.trim(), id], (errSub) => {
        if (errSub) return callback(error, null);
        callback(null, { id: Number(id), nombre: nombre.trim() });
      });
    }
    callback(null, { id: Number(id), ...datos, nombre: nombre.trim() });
  });
}

function eliminarProveedor(id, callback) {
  const sql = 'DELETE FROM proveedores WHERE id = ?';
  db.query(sql, [id], (error) => {
    if (error) {
      return db.query('DELETE FROM distribuidor WHERE id = ?', [id], (errSub) => {
        if (errSub) return callback(error, null);
        callback(null, { mensaje: 'Proveedor eliminado correctamente' });
      });
    }
    callback(null, { mensaje: 'Proveedor eliminado correctamente' });
  });
}

module.exports = {
  obtenerProveedores,
  agregarProveedor,
  editarProveedor,
  eliminarProveedor
};
