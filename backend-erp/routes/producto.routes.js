const express = require('express');
const router = express.Router();
const productoService = require('../services/producto.service');

router.get('/', (req, res) => {
  productoService.obtenerProductos((error, productos) => {
    if (error) {
      return res.status(500).json({
        mensaje: 'Error al consultar productos'
      });
    }
    res.json(productos);
  });
});

module.exports = router;
