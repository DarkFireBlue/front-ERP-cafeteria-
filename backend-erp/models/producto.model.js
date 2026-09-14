class Producto {
  constructor(id, nombre, descripcion, precio, stock, imagen) {
    this.id = id;
    this.nombre = nombre;
    this.descripcion = descripcion;
    this.precio = precio;
    this.stock = stock;
    this.imagen = imagen;
  }
}

module.exports = Producto;
