// Servicio de comunicacion OAuth2 y Checkout API v2 con PayPal Sandbox
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

// Lee las credenciales del archivo .env
function obtenerCredenciales() {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Las credenciales de PayPal Sandbox no estan configuradas ' +
      '(PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en .env)'
    );
  }

  return { clientId, clientSecret };
}

// Obtiene un token de acceso OAuth2 fresco en cada llamada
// (para produccion se recomienda cachear con TTL)
async function obtenerToken() {
  const { clientId, clientSecret } = obtenerCredenciales();

  const respuesta = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method : 'POST',
    headers: {
      Authorization  : `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type' : 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.access_token) {
    throw new Error(
      datos.error_description ||
      `Fallo de autenticacion OAuth2 con PayPal (${respuesta.status})`
    );
  }

  return datos.access_token;
}

// Realiza una peticion autenticada a cualquier endpoint de la API de PayPal
async function solicitarPayPal(ruta, opciones = {}) {
  const token = await obtenerToken();

  const respuesta = await fetch(`${PAYPAL_API_URL}${ruta}`, {
    ...opciones,
    headers: {
      Authorization  : `Bearer ${token}`,
      'Content-Type' : 'application/json',
      ...(opciones.headers || {})
    }
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    const detalle =
      datos.details?.[0]?.description ||
      datos.message ||
      `Error PayPal HTTP ${respuesta.status}`;
    throw new Error(detalle);
  }

  return datos;
}

// Crea una orden de pago en PayPal Sandbox con los montos, iva y lineas de producto
// datos: { subtotal, iva, total, items: [{nombre, cantidad, precio_unitario}], cliente }
function crearOrdenPayPal(datos, callback) {
  const totalNum    = Number(datos.total);
  const subtotalNum = Number(datos.subtotal || 0);
  const ivaNum      = Number(datos.iva || 0);

  if (!Number.isFinite(totalNum) || totalNum <= 0) {
    return callback(
      new Error('El importe total no es valido para procesar con PayPal')
    );
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  // Construye las lineas de articulo para el desglose del pago
  const lineasArticulos = Array.isArray(datos.items) && datos.items.length > 0
    ? datos.items.map((item) => ({
        name       : String(item.nombre || 'Producto').substring(0, 127),
        unit_amount: {
          currency_code: 'MXN',
          value        : Number(item.precio_unitario || 0).toFixed(2)
        },
        quantity: String(Number(item.cantidad || 1))
      }))
    : undefined;

  const breakdown = {
    item_total: { currency_code: 'MXN', value: subtotalNum.toFixed(2) },
    tax_total  : { currency_code: 'MXN', value: ivaNum.toFixed(2) }
  };

  // Si no hay desglose de subtotal + iva, se envia solo el total sin breakdown
  const amount = subtotalNum > 0
    ? {
        currency_code: 'MXN',
        value        : totalNum.toFixed(2),
        breakdown
      }
    : {
        currency_code: 'MXN',
        value        : totalNum.toFixed(2)
      };

  const purchaseUnit = {
    amount,
    description: 'Compra en ERP Cafeteria'
  };

  if (lineasArticulos) {
    purchaseUnit.items = lineasArticulos;
  }

  const cuerpoOrden = {
    intent: 'CAPTURE',
    application_context: {
      brand_name : 'ERP Cafeteria',
      locale     : 'es-MX',
      return_url : `${frontendUrl}/ventas`,
      cancel_url : `${frontendUrl}/ventas?cancel=true`,
      user_action: 'PAY_NOW'
    },
    purchase_units: [purchaseUnit]
  };

  solicitarPayPal('/v2/checkout/orders', {
    method : 'POST',
    headers: { Prefer: 'return=representation' },
    body   : JSON.stringify(cuerpoOrden)
  })
    .then((respuesta) => {
      const approveLink = respuesta.links?.find(
        (l) => l.rel === 'payer-action' || l.rel === 'approve'
      );

      callback(null, {
        id         : respuesta.id,
        status     : respuesta.status,
        total      : respuesta.purchase_units?.[0]?.amount?.value || totalNum.toFixed(2),
        approveUrl : approveLink?.href || null
      });
    })
    .catch((error) => callback(error));
}

// Captura una orden de PayPal ya aprobada por el comprador
// Devuelve: { estado: 'APROBADO'|'RECHAZADO', transaccionId, mensaje }
function capturarOrdenPayPal(orderId, callback) {
  if (!orderId || typeof orderId !== 'string') {
    return callback(new Error('El identificador de orden de PayPal es requerido'));
  }

  solicitarPayPal(
    `/v2/checkout/orders/${encodeURIComponent(orderId.trim())}/capture`,
    {
      method : 'POST',
      headers: { Prefer: 'return=representation' },
      body   : '{}'
    }
  )
    .then((respuesta) => {
      // Busca la captura completada o la primera disponible entre todas las unidades de compra
      const capturas = respuesta.purchase_units?.flatMap(
        (u) => u.payments?.captures || []
      ) || [];

      const captura =
        capturas.find((c) => c.status === 'COMPLETED') ||
        capturas[0] ||
        null;

      const estadoCaptura = captura?.status;
      const esValido =
        respuesta.status === 'COMPLETED' ||
        estadoCaptura === 'COMPLETED'     ||
        estadoCaptura === 'PENDING';

      callback(null, {
        estado       : esValido ? 'APROBADO' : 'RECHAZADO',
        transaccionId: captura?.id || orderId,
        monto        : captura?.amount?.value || null,
        moneda       : captura?.amount?.currency_code || 'MXN',
        mensaje      :
          estadoCaptura === 'PENDING'
            ? 'Pago en retencion preventiva por Sandbox de PayPal'
            : esValido
              ? 'Pago capturado y aprobado exitosamente'
              : `Estado de captura no reconocido: ${estadoCaptura}`
      });
    })
    .catch((error) => callback(error));
}

module.exports = {
  crearOrdenPayPal,
  capturarOrdenPayPal
};
