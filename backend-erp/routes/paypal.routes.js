// Rutas para creacion y captura de ordenes con PayPal Sandbox
const express = require('express');
const router = express.Router();
const paypalService = require('../services/paypal.service');
const ventaService = require('../services/venta.service');
const correoService = require('../services/correo.service');
const { exigirSesion } = require('../middleware/auth');

// Crea una orden en PayPal validando existencias en inventario
router.post('/orden', exigirSesion, (req, res) => {
  const productos = req.body.productos || req.body.items || [];
  const cliente = req.body.cliente || {
    nombre: req.body.nombreCliente || req.usuario?.nombre || 'Cliente',
    correo: req.body.correoCliente || req.usuario?.correo || '',
    rfc: req.body.rfcCliente || 'XAXX010101000'
  };

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ mensaje: 'No hay articulos en el carrito de compra' });
  }

  const items = productos.map((p) => ({
    producto_id: p.id || p.producto_id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    precio_unitario: p.precio || p.precio_unitario
  }));

  ventaService.validarStockOrden(items, (errStock, calculo) => {
    if (errStock) {
      return res.status(400).json({ mensaje: errStock.message });
    }

    paypalService.crearOrdenPayPal({
      subtotal: calculo.subtotal,
      iva: calculo.iva,
      total: calculo.total,
      items: calculo.detalle,
      cliente
    }, (errPayPal, ordenPayPal) => {
      if (errPayPal) {
        return res.status(500).json({ mensaje: 'Error al iniciar la transaccion con PayPal: ' + errPayPal.message });
      }

      res.json({
        id: ordenPayPal.id,
        orderID: ordenPayPal.id,
        status: ordenPayPal.status,
        total: calculo.total,
        urlPago: ordenPayPal.approveUrl,
        approveUrl: ordenPayPal.approveUrl,
        resumen: calculo
      });
    });
  });
});

// Captura una orden aprobada, registra la venta, genera la factura XML y despacha el correo
const manejarCaptura = (req, res) => {
  const orderID = req.params.orderId || req.body.orderID || req.body.orderId;
  const datosVenta = req.body.datosVenta || req.body || {};

  if (!orderID) {
    return res.status(400).json({ mensaje: 'El ID de la orden de PayPal es requerido' });
  }

  paypalService.capturarOrdenPayPal(orderID, (errCaptura, respuestaPayPal) => {
    if (errCaptura) {
      return res.status(500).json({
        estado: 'RECHAZADO',
        mensaje: 'Error al procesar el pago con PayPal: ' + errCaptura.message
      });
    }

    if (respuestaPayPal.estado !== 'APROBADO' && respuestaPayPal.estado !== 'PENDIENTE') {
      return res.status(400).json({
        estado: 'RECHAZADO',
        mensaje: respuestaPayPal.mensaje || 'El pago no fue completado en PayPal'
      });
    }

    // Registrar formalmente la venta con folio, desglose y factura XML
    const ventaPayload = {
      cliente_id: req.usuario?.id || null,
      nombre_cliente: datosVenta.nombre_cliente || req.usuario?.nombre || 'Cliente',
      correo_cliente: datosVenta.correo_cliente || req.usuario?.correo || '',
      rfc_cliente: datosVenta.rfc_cliente || 'XAXX010101000',
      metodo_pago: 'PayPal',
      orden_paypal_id: orderID,
      canal: 'PayPal',
      detalle: datosVenta.detalle || []
    };

    ventaService.crearVenta(ventaPayload, async (errVenta, resultadoVenta) => {
      if (errVenta) {
        return res.status(500).json({
          estado: 'ERROR_REGISTRO',
          mensaje: 'El pago fue procesado en PayPal pero ocurrio un problema al registrar la venta: ' + errVenta.message
        });
      }

      // Envio de correo electronico con el XML de la factura adjunto
      const correoEnviado = await correoService.enviarRecibo({
        cliente: {
          nombre: ventaPayload.nombre_cliente,
          correo: ventaPayload.correo_cliente
        },
        venta: {
          id: resultadoVenta.id,
          folio: resultadoVenta.folio,
          metodoPago: 'PayPal',
          subtotal: resultadoVenta.subtotal,
          iva: resultadoVenta.iva,
          total: resultadoVenta.total,
          orden_paypal_id: orderID
        },
        factura: {
          folio: resultadoVenta.folio,
          xml: resultadoVenta.archivo_xml
        },
        captureId: respuestaPayPal.transaccionId || orderID
      });

      res.json({
        mensaje: 'Venta concretada y cobro procesado con exito',
        orderId: orderID,
        captureId: respuestaPayPal.transaccionId || orderID,
        estado: 'APROBADO',
        folio: resultadoVenta.folio,
        correoEnviado,
        venta: resultadoVenta
      });
    });
  });
};

router.post('/capturar/:orderId', exigirSesion, manejarCaptura);
router.post('/capturar', exigirSesion, manejarCaptura);

module.exports = router;
