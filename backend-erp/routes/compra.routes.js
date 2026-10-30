// Rutas para gestion de ordenes de compra e ingreso de insumos
const express = require('express');
const router = express.Router();
const compraService = require('../services/compra.service');
const { exigirSesion, soloPara } = require('../middleware/auth');

router.use(exigirSesion, soloPara('administrador'));

router.get('/', (req, res) => {
  compraService.obtenerCompras((error, compras) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar historial de compras' });
    }
    res.json(compras);
  });
});

router.post('/', (req, res) => {
  const datosCompra = {
    ...req.body,
    usuario_id: req.usuario?.id || null
  };

  compraService.crearCompra(datosCompra, (error, compra) => {
    if (error) {
      return res.status(400).json({ mensaje: error.message || 'Error al registrar la compra' });
    }
    res.status(201).json(compra);
  });
});

module.exports = router;
