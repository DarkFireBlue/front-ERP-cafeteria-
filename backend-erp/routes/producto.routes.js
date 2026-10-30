// Rutas para gestion del catalogo de inventario y productos
const express = require('express');
const router = express.Router();
const productoService = require('../services/producto.service');
const { exigirSesion, soloPara } = require('../middleware/auth');

// Consulta de productos abierta al publico o clientes autenticados
router.get('/', (req, res) => {
  productoService.obtenerProductos((error, productos) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar el catalogo de productos' });
    }
    res.json(productos);
  });
});

// Creacion de un nuevo producto (solo administrador)
router.post('/', exigirSesion, soloPara('administrador'), (req, res) => {
  const { nombre, precio } = req.body;
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ mensaje: 'El nombre del producto es obligatorio' });
  }
  if (precio === undefined || isNaN(Number(precio)) || Number(precio) < 0) {
    return res.status(400).json({ mensaje: 'El precio debe ser un numero positivo' });
  }

  productoService.agregarProducto(req.body, (error, producto) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al agregar el producto al inventario' });
    }
    res.status(201).json(producto);
  });
});

// Modificacion de producto existente (solo administrador)
router.put('/:id', exigirSesion, soloPara('administrador'), (req, res) => {
  productoService.editarProducto(req.params.id, req.body, (error, producto) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar los datos del producto' });
    }
    res.json(producto);
  });
});

// Eliminacion de producto (solo administrador)
router.delete('/:id', exigirSesion, soloPara('administrador'), (req, res) => {
  productoService.eliminarProducto(req.params.id, (error, resultado) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al eliminar el producto del inventario' });
    }
    res.json(resultado);
  });
});

module.exports = router;
