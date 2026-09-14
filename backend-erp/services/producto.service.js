const db = require('../config/db');

function obtenerProductos(callback) {
  const sql = 'SELECT * FROM productos';
  db.query(sql, (error, resultados) => {
    if (error) {
      callback(error, null);
      return;
    }
    callback(null, resultados);
  });
}

module.exports = {
  obtenerProductos
};
