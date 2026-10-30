// Rutas de administracion de ventas, facturas XML y resumen comercial
const express = require('express');
const router = express.Router();
const ventaService = require('../services/venta.service');
const correoService = require('../services/correo.service');
const { exigirSesion } = require('../middleware/auth');

router.use(exigirSesion);

// Consulta el resumen de ventas del dia
router.get('/resumen', (req, res) => {
  ventaService.obtenerResumenVentas((error, resumen) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar resumen de ventas' });
    }
    res.json(resumen);
  });
});

// Consulta el listado de ventas (clientes solo ven sus compras, administradores ven todas)
router.get('/', (req, res) => {
  const clienteId = req.usuario.rol === 'cliente' ? req.usuario.id : req.query.cliente_id;
  ventaService.obtenerVentas(clienteId, (error, ventas) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar listado de ventas' });
    }
    res.json(ventas);
  });
});

// Registra una nueva venta manual (en mostrador)
router.post('/', (req, res) => {
  const datosVenta = {
    ...req.body,
    cliente_id: req.usuario.rol === 'cliente' ? req.usuario.id : null
  };

  ventaService.crearVenta(datosVenta, async (error, venta) => {
    if (error) {
      return res.status(400).json({ mensaje: error.message || 'Error al registrar la venta' });
    }

    // Despacho de comprobante si se cuenta con correo
    if (datosVenta.correo_cliente) {
      await correoService.enviarRecibo({
        cliente: {
          nombre: datosVenta.nombre_cliente,
          correo: datosVenta.correo_cliente
        },
        venta: {
          id: venta.id,
          folio: venta.folio,
          metodoPago: datosVenta.metodo_pago || 'Efectivo',
          subtotal: venta.subtotal,
          iva: venta.iva,
          total: venta.total
        },
        factura: {
          folio: venta.folio,
          xml: venta.archivo_xml
        }
      });
    }

    res.status(201).json(venta);
  });
});

// Obtiene la factura XML asociada a una venta
router.get('/:id/factura', (req, res) => {
  const clienteId = req.usuario.rol === 'cliente' ? req.usuario.id : null;
  ventaService.obtenerFacturaPorVenta(req.params.id, clienteId, (error, factura) => {
    if (error) {
      return res.status(500).json({ mensaje: 'Error al consultar la factura electronica' });
    }
    if (!factura) {
      return res.status(404).json({ mensaje: 'Factura no encontrada o no autorizada para el usuario' });
    }
    res.json(factura);
  });
});

module.exports = router;
