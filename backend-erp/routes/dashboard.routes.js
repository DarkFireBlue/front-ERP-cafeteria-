// Rutas para consolidacion de indicadores del panel de control principal
const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboard.service');
const { exigirSesion, soloPara } = require('../middleware/auth');

router.use(exigirSesion, soloPara('administrador'));

router.get('/', (req, res) => {
  dashboardService.obtenerResumenDashboard((error, resumen) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consolidar metricas del dashboard' });
    }
    res.json(resumen);
  });
});

module.exports = router;
