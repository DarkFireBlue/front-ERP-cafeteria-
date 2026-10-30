// Rutas para consulta de metricas financieras, graficas y reportes contables
const express = require('express');
const router = express.Router();
const finanzaService = require('../services/finanza.service');
const { exigirSesion, soloPara } = require('../middleware/auth');

router.use(exigirSesion, soloPara('administrador'));

router.get('/resumen', (req, res) => {
  finanzaService.obtenerResumen((error, resumen) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar resumen financiero' });
    }
    res.json(resumen);
  });
});

router.get('/grafica', (req, res) => {
  finanzaService.obtenerGraficaSemanal((error, grafica) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar datos de la grafica' });
    }
    res.json(grafica);
  });
});

router.get('/reportes', (req, res) => {
  finanzaService.obtenerReportes((error, reportes) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar historial de reportes' });
    }
    res.json(reportes);
  });
});

router.post('/movimiento', (req, res) => {
  const { tipo_movimiento, monto, descripcion } = req.body;
  if (!tipo_movimiento || !monto || isNaN(Number(monto)) || Number(monto) <= 0) {
    return res.status(400).json({ mensaje: 'Datos de movimiento financiero incompletos o invalidos' });
  }

  finanzaService.registrarMovimiento(req.body, (error, resultado) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al asentar movimiento financiero' });
    }
    res.status(201).json({ id: resultado.insertId, ...req.body });
  });
});

module.exports = router;
