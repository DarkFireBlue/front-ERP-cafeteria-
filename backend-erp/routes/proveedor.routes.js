// Rutas para administracion de proveedores y distribuidores
const express = require('express');
const router = express.Router();
const proveedorService = require('../services/proveedor.service');
const { exigirSesion, soloPara } = require('../middleware/auth');

router.use(exigirSesion, soloPara('administrador'));

router.get('/', (req, res) => {
  proveedorService.obtenerProveedores((error, proveedores) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar proveedores' });
    }
    res.json(proveedores);
  });
});

router.post('/', (req, res) => {
  proveedorService.agregarProveedor(req.body, (error, proveedor) => {
    if (error) {
      const status = error.codigo === 'VALIDACION' ? 400 : 500;
      return res.status(status).json({ mensaje: error.message || 'Error al agregar proveedor' });
    }
    res.status(201).json(proveedor);
  });
});

router.put('/:id', (req, res) => {
  proveedorService.editarProveedor(req.params.id, req.body, (error, proveedor) => {
    if (error) {
      const status = error.codigo === 'VALIDACION' ? 400 : 500;
      return res.status(status).json({ mensaje: error.message || 'Error al editar proveedor' });
    }
    res.json(proveedor);
  });
});

router.delete('/:id', (req, res) => {
  proveedorService.eliminarProveedor(req.params.id, (error, resultado) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al eliminar proveedor' });
    }
    res.json(resultado);
  });
});

module.exports = router;
