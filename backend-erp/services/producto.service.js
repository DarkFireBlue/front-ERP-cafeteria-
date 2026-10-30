// Servicio para operaciones de inventario y catalogo de productos
const db = require('../config/db');

// Determina el estado del inventario segun el stock disponible
function calcularEstado(stock) {
  const cantidad = Number(stock || 0);
  if (cantidad <= 0) return { estado: 'Agotado', clase: 'roja' };
  if (cantidad < 10) return { estado: 'Poco stock', clase: 'naranja' };
  return { estado: 'Disponible', clase: 'verde' };
}

// Obtiene todos los productos calculando su estado y clases visuales
function obtenerProductos(callback) {
  const sql = 'SELECT * FROM productos';
  db.query(sql, (error, filas) => {
    if (error) {
      // Fallback a vista 'producto' si aplica
      return db.query('SELECT * FROM producto', (errFallback, filasFallback) => {
        if (errFallback) return callback(error, null);
        procesarFilas(filasFallback, callback);
      });
    }
    procesarFilas(filas, callback);
  });
}

function procesarFilas(filas, callback) {
  const productos = filas.map((p) => {
    const stockVal = p.stock !== undefined ? p.stock : (p.cantidad !== undefined ? p.cantidad : 0);
    const { estado, clase } = calcularEstado(stockVal);
    const precioNum = Number(p.precio || 0);
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria || 'Bebidas',
      stock: stockVal,
      cantidad: stockVal,
      precio: precioNum,
      precioUnitario: precioNum,
      imagen: p.imagen || '',
      estado,
      claseEtiqueta: clase
    };
  });
  callback(null, productos);
}

// Inserta un nuevo producto en la tabla productos
function agregarProducto(datos, callback) {
  const { nombre, descripcion = '', categoria = 'Bebidas', precio, stock, cantidad, imagen = '' } = datos;
  const stockFinal = stock !== undefined ? Number(stock) : Number(cantidad || 0);
  const precioFinal = Number(precio || 0);

  const sql = 'INSERT INTO productos (nombre, descripcion, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [nombre, descripcion, categoria, precioFinal, stockFinal, imagen], (error, resultado) => {
    if (error) {
      // Intentar insercion directa en esquema compatible
      return db.query(
        'INSERT INTO productos (nombre, descripcion, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, precioFinal, stockFinal, imagen],
        (errSub, resSub) => {
          if (errSub) return callback(error, null);
          callback(null, { id: resSub.insertId, ...datos, stock: stockFinal, cantidad: stockFinal });
        }
      );
    }
    callback(null, { id: resultado.insertId, ...datos, stock: stockFinal, cantidad: stockFinal });
  });
}

// Actualiza los datos de un producto existente
function editarProducto(id, datos, callback) {
  const { nombre, descripcion = '', categoria = 'Bebidas', precio, stock, cantidad, imagen } = datos;
  const stockFinal = stock !== undefined ? Number(stock) : (cantidad !== undefined ? Number(cantidad) : 0);
  const precioFinal = Number(precio || 0);

  const sql = 'UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, precio = ?, stock = ?, imagen = COALESCE(?, imagen) WHERE id = ?';
  db.query(sql, [nombre, descripcion, categoria, precioFinal, stockFinal, imagen || null, id], (error) => {
    if (error) {
      return db.query(
        'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, imagen = COALESCE(?, imagen) WHERE id = ?',
        [nombre, descripcion, precioFinal, stockFinal, imagen || null, id],
        (errSub) => {
          if (errSub) return callback(error, null);
          callback(null, { id: Number(id), ...datos, stock: stockFinal, cantidad: stockFinal });
        }
      );
    }
    callback(null, { id: Number(id), ...datos, stock: stockFinal, cantidad: stockFinal });
  });
}

// Elimina un producto por su identificador
function eliminarProducto(id, callback) {
  const sql = 'DELETE FROM productos WHERE id = ?';
  db.query(sql, [id], (error) => {
    if (error) return callback(error, null);
    callback(null, { mensaje: 'Producto eliminado correctamente' });
  });
}

module.exports = {
  obtenerProductos,
  agregarProducto,
  editarProducto,
  eliminarProducto
};
