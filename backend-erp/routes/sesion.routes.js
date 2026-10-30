// Enrutador de autenticacion y control de acceso
const express = require('express');
const router = express.Router();
const SesionController = require('../controllers/sesion.controller');

router.post('/login', SesionController.login);
router.post('/registro', SesionController.registro);

module.exports = router;
