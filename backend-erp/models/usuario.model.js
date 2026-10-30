// Modelo de datos para gestion y autenticacion de usuarios
const db = require('../config/db');

const UsuarioModel = {
  // Busca un usuario por correo y contrasena en la tabla usuarios
  buscarPorCredenciales: (correo, contrasena, callback) => {
    const sql = 'SELECT id, nombre, correo, rol FROM usuarios WHERE correo = ? AND contrasena = ?';
    db.query(sql, [correo, contrasena], (error, rows) => {
      if (error) {
        // En caso de que la tabla usuarios aun no este creada, intentar con vistas o tablas individuales
        return db.query(
          'SELECT id, correo FROM administrador WHERE correo = ? AND contrasena = ?',
          [correo, contrasena],
          (errAdmin, admins) => {
            if (errAdmin) return callback(error);
            if (admins && admins.length > 0) {
              return callback(null, {
                existe: true,
                rol: 'administrador',
                usuario: { id: admins[0].id, nombre: 'Administrador', correo: admins[0].correo, rol: 'administrador' }
              });
            }
            db.query(
              'SELECT id, correo FROM cliente WHERE correo = ? AND contrasena = ?',
              [correo, contrasena],
              (errCli, clientes) => {
                if (errCli) return callback(errCli);
                if (clientes && clientes.length > 0) {
                  return callback(null, {
                    existe: true,
                    rol: 'cliente',
                    usuario: { id: clientes[0].id, nombre: 'Cliente', correo: clientes[0].correo, rol: 'cliente' }
                  });
                }
                return callback(null, { existe: false });
              }
            );
          }
        );
      }

      if (rows.length > 0) {
        const u = rows[0];
        return callback(null, {
          existe: true,
          rol: u.rol,
          usuario: { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol }
        });
      }

      return callback(null, { existe: false });
    });
  },

  // Inserta un nuevo usuario con rol de cliente
  crearCliente: (datos, callback) => {
    const { nombre = 'Cliente Registrado', correo, contrasena } = datos;
    const sql = 'INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?, ?, ?, "cliente")';
    db.query(sql, [nombre, correo, contrasena], (error, resultado) => {
      if (error) {
        // Fallback a tabla cliente si la instalacion utiliza esquema simplificado
        return db.query(
          'INSERT INTO cliente (correo, contrasena) VALUES (?, ?)',
          [correo, contrasena],
          (errCli, resCli) => {
            if (errCli) return callback(error);
            return callback(null, { id: resCli.insertId, nombre, correo, rol: 'cliente' });
          }
        );
      }
      callback(null, { id: resultado.insertId, nombre, correo, rol: 'cliente' });
    });
  },

  // Verifica si un correo ya se encuentra registrado
  buscarPorCorreo: (correo, callback) => {
    const sql = 'SELECT id, correo FROM usuarios WHERE correo = ?';
    db.query(sql, [correo], (error, rows) => {
      if (error) {
        return db.query(
          'SELECT id, correo FROM cliente WHERE correo = ? UNION SELECT id, correo FROM administrador WHERE correo = ?',
          [correo, correo],
          (errFallback, rowsFallback) => {
            if (errFallback) return callback(error);
            return callback(null, rowsFallback.length > 0);
          }
        );
      }
      callback(null, rows.length > 0);
    });
  }
};

module.exports = UsuarioModel;
