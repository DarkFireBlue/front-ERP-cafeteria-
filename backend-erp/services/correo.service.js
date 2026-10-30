// Servicio de despacho de correos electronicos con Nodemailer
// Adjunta la factura XML CFDI 4.0 y muestra un resumen HTML del pedido al comprador
const nodemailer = require('nodemailer');

let transportadorActivo = null;

// Inicializa el transportador SMTP una sola vez.
// Prioridad: variables SMTP_* del .env → cuenta Ethereal de pruebas → modo simulado en memoria
async function obtenerTransportador() {
  if (transportadorActivo) return transportadorActivo;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);

  if (host && user && pass) {
    transportadorActivo = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth  : { user, pass },
      tls   : { rejectUnauthorized: false }
    });
    console.log(`[Correo] Transportador SMTP configurado: ${host}:${port}`);
    return transportadorActivo;
  }

  // Cuenta de prueba Ethereal para entorno de desarrollo local
  try {
    const cuenta = await nodemailer.createTestAccount();
    transportadorActivo = nodemailer.createTransport({
      host  : cuenta.smtp.host,
      port  : cuenta.smtp.port,
      secure: cuenta.smtp.secure,
      auth  : { user: cuenta.user, pass: cuenta.pass }
    });
    console.log('[Correo] Cuenta Ethereal de prueba configurada:', cuenta.user);
    return transportadorActivo;
  } catch (_errCuenta) {
    // Modo simulado cuando no hay acceso a internet (por ejemplo en el sandbox)
    console.log('[Correo] Operando en modo simulado (sin envio real)');
    transportadorActivo = {
      sendMail: async (opciones) => {
        console.log(
          `[SIMULACION CORREO] Para: ${opciones.to} | ` +
          `Asunto: ${opciones.subject} | ` +
          `Adjunto: ${opciones.attachments?.[0]?.filename || 'ninguno'}`
        );
        return { messageId: `simulado-${Date.now()}` };
      }
    };
    return transportadorActivo;
  }
}

// Construye el cuerpo HTML enriquecido del correo transaccional
function construirHtml({ nombreCliente, folioFactura, metodoPago, subtotal, iva, total, captureId }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .contenedor { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .cabecera { background: #4e342e; color: #fff; padding: 24px 32px; }
    .cabecera h1 { margin: 0; font-size: 22px; }
    .cabecera p  { margin: 4px 0 0; font-size: 13px; opacity: .85; }
    .cuerpo { padding: 28px 32px; color: #333; }
    .tabla-resumen { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .tabla-resumen td { padding: 9px 12px; border-bottom: 1px solid #eee; }
    .tabla-resumen td:first-child { color: #666; }
    .tabla-resumen td:last-child  { font-weight: bold; text-align: right; }
    .total-row td { background: #fbe9e7; font-size: 16px; }
    .aviso { background: #e8f5e9; border-left: 4px solid #43a047; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #2e7d32; margin-top: 20px; }
    .pie { text-align: center; padding: 18px; font-size: 12px; color: #999; background: #fafafa; }
  </style>
</head>
<body>
  <div class="contenedor">
    <div class="cabecera">
      <h1>ERP Cafeteria</h1>
      <p>Comprobante de compra #${folioFactura}</p>
    </div>
    <div class="cuerpo">
      <p>Hola <strong>${nombreCliente}</strong>, gracias por tu compra.</p>
      <p>A continuacion encontraras el resumen de tu pedido y adjunto tu factura electronica en formato XML (CFDI 4.0).</p>

      <table class="tabla-resumen">
        <tr><td>Folio de venta</td><td>${folioFactura}</td></tr>
        <tr><td>Fecha</td><td>${new Date().toLocaleString('es-MX')}</td></tr>
        <tr><td>Metodo de pago</td><td>${metodoPago}</td></tr>
        ${captureId ? `<tr><td>ID de transaccion PayPal</td><td>${captureId}</td></tr>` : ''}
        <tr><td>Subtotal</td><td>$${subtotal} MXN</td></tr>
        <tr><td>IVA (16%)</td><td>$${iva} MXN</td></tr>
        <tr class="total-row"><td>Total pagado</td><td>$${total} MXN</td></tr>
      </table>

      <div class="aviso">
        Tu comprobante fiscal digital (CFDI 4.0) en formato XML se encuentra adjunto a este correo.
        Conservalo para efectos fiscales.
      </div>
    </div>
    <div class="pie">ERP Cafeteria &mdash; Sistema de Gestion Empresarial &mdash; Comprobante generado automaticamente</div>
  </div>
</body>
</html>`;
}

// Envia el recibo de compra con el XML adjunto al correo del cliente.
// Devuelve true si el correo fue despachado correctamente, false en caso contrario.
async function enviarRecibo({ cliente, venta, factura, captureId }) {
  const correoDestino = (cliente?.correo || cliente?.correo_cliente || '').trim();

  if (!correoDestino) {
    console.log(
      '[Correo] Sin destino de correo para la venta:',
      venta?.folio || venta?.id
    );
    return false;
  }

  const nombreCliente    = cliente?.nombre || cliente?.nombre_cliente || 'Cliente';
  const folioFactura     = factura?.folio || venta?.folio || String(venta?.id || 'CFDI');
  const metodoPago       = venta?.metodoPago || venta?.metodo_pago || 'Pago en linea';
  const totalNum         = Number(venta?.total   || 0).toFixed(2);
  const ivaNum           = Number(venta?.iva     || 0).toFixed(2);
  const subtotalNum      = Number(venta?.subtotal || (Number(totalNum) - Number(ivaNum))).toFixed(2);
  const contenidoXML     = factura?.xml || factura?.archivo_xml || '';

  const textoPlano = [
    `Hola ${nombreCliente}, gracias por tu compra en ERP Cafeteria.`,
    '',
    '=== RESUMEN DE COMPRA ===',
    `Folio:        ${folioFactura}`,
    `Fecha:        ${new Date().toLocaleString('es-MX')}`,
    `Metodo pago:  ${metodoPago}`,
    captureId ? `ID PayPal:    ${captureId}` : '',
    `Subtotal:     $${subtotalNum} MXN`,
    `IVA (16%):    $${ivaNum} MXN`,
    `Total:        $${totalNum} MXN`,
    '',
    'Adjunto encontraras tu comprobante fiscal (CFDI 4.0) en formato XML.',
    '',
    'Atentamente,',
    'ERP Cafeteria'
  ].filter(Boolean).join('\n');

  const asunto = `Comprobante de Compra #${folioFactura} - ERP Cafeteria`;
  const remitente = process.env.MAIL_FROM || '"ERP Cafeteria" <facturacion@erpcafeteria.com>';

  const adjuntos = [];
  if (contenidoXML) {
    adjuntos.push({
      filename   : `Factura-${folioFactura}.xml`,
      content    : contenidoXML,
      contentType: 'application/xml'
    });
  }

  try {
    const transportador = await obtenerTransportador();

    const info = await transportador.sendMail({
      from       : remitente,
      to         : correoDestino,
      subject    : asunto,
      text       : textoPlano,
      html       : construirHtml({
        nombreCliente,
        folioFactura,
        metodoPago,
        subtotal : subtotalNum,
        iva      : ivaNum,
        total    : totalNum,
        captureId: captureId || null
      }),
      attachments: adjuntos
    });

    // Muestra la URL de vista previa cuando se usa Ethereal en desarrollo
    const urlPrevia = nodemailer.getTestMessageUrl?.(info);
    if (urlPrevia) {
      console.log('[Correo] Vista previa Ethereal:', urlPrevia);
    }

    console.log(`[Correo] Enviado a ${correoDestino} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('[Correo] Error al enviar con Nodemailer:', error.message);
    return false;
  }
}

module.exports = {
  enviarRecibo
};
