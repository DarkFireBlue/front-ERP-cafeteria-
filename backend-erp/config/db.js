// Configuracion de conexion a la base de datos MySQL en phpMyAdmin / XAMPP
const path = require('path');
if (!process.env.DB_NAME) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}
const mysql = require('mysql2');

const conexion = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp'
});

conexion.connect((error) => {
  if (error) {
    console.error('Error al conectar con la base de datos:', error.message);
    return;
  }
  console.log('Conexion exitosa con MySQL en la base de datos:', process.env.DB_NAME || 'erp');
});

module.exports = conexion;
