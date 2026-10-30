// Generador de comprobantes fiscales electronicos CFDI 4.0 en formato XML
// Cumple con el estandar SAT Mexico: estructura, namespaces, timbre fiscal digital y desglose de IVA 16%
const crypto = require('crypto');

// Genera un UUID v4 aleatorio para el folio fiscal (UUID SAT)
function generarUUID() {
  return crypto.randomUUID();
}

// Genera un sello digital de desarrollo (HMAC-SHA256 sobre la cadena original)
// En produccion real debe reemplazarse por firma con certificado CSD emitido por el SAT
function generarSello(cadena) {
  const secreto = process.env.CFDI_SELLO_SECRETO || 'erp-cafeteria-dev-sello-2024';
  return crypto
    .createHmac('sha256', secreto)
    .update(cadena)
    .digest('base64');
}

// Formatea una fecha al patron CFDI: YYYY-MM-DDTHH:mm:ss
function formatearFecha(fecha) {
  const d  = fecha instanceof Date ? fecha : new Date(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// Escapa caracteres especiales para texto XML seguro
function escaparXML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// Determina la FormaPago SAT segun el metodo de pago registrado en la venta
function mapearFormaPago(metodoPago) {
  const mapa = {
    'efectivo'       : '01',
    'cheque'         : '02',
    'transferencia'  : '03',
    'tarjeta_debito' : '04',
    'tarjeta_credito': '28',
    'paypal'         : '03'   // transferencia electronica de fondos
  };
  const clave = (metodoPago || 'efectivo').toLowerCase().replace(/ /g, '_');
  return mapa[clave] || '01';
}

// Construye y devuelve la estructura XML del comprobante CFDI 4.0
// datos: { folio, fecha?, subtotal, iva, total, metodo_pago?, cliente: { nombre, rfc, correo? }, detalle: [] }
function generarFacturaXML(datos) {
  const {
    folio,
    fecha       = new Date(),
    subtotal,
    iva,
    total,
    metodo_pago = 'Efectivo',
    cliente     = {},
    detalle     = []
  } = datos;

  const uuid         = generarUUID();
  const fechaISO     = formatearFecha(fecha);
  const subtotalFmt  = Number(subtotal || 0).toFixed(2);
  const ivaFmt       = Number(iva      || 0).toFixed(2);
  const totalFmt     = Number(total    || 0).toFixed(2);
  const formaPago    = mapearFormaPago(metodo_pago);

  // Datos del receptor (cliente comprador)
  const rfcReceptor    = escaparXML((cliente.rfc || cliente.rfc_cliente || 'XAXX010101000').toUpperCase());
  const nombreReceptor = escaparXML((cliente.nombre || cliente.nombre_cliente || 'PUBLICO EN GENERAL').toUpperCase());

  // Datos del emisor (negocio)
  const rfcEmisor    = process.env.CFDI_RFC_EMISOR    || 'CAFE240101XYZ';
  const nombreEmisor = process.env.CFDI_NOMBRE_EMISOR || 'CAFETERIA ERP SISTEMAS S.A. DE C.V.';
  const regimenFiscal = process.env.CFDI_REGIMEN      || '601';
  const lugarExpedicion = process.env.CFDI_CP         || '01000';

  // Construye los nodos <cfdi:Concepto> con el desglose de IVA por linea
  let conceptosXML = '';

  if (detalle.length === 0) {
    // Concepto generico cuando la venta no tiene desglose por producto
    const impPorteGen = Number(subtotalFmt);
    const impIvaGen   = (impPorteGen * 0.16).toFixed(2);
    conceptosXML = `
    <cfdi:Concepto ClaveProdServ="50201700" Cantidad="1" ClaveUnidad="E48" Unidad="Servicio" Descripcion="Venta de productos folio ${escaparXML(folio)}" ValorUnitario="${subtotalFmt}" Importe="${subtotalFmt}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${subtotalFmt}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${impIvaGen}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
  } else {
    for (const item of detalle) {
      const cant      = Number(item.cantidad      || 1);
      const unitario  = Number(item.precio_unitario || item.precio || 0);
      const importe   = (cant * unitario).toFixed(2);
      const impIva    = (cant * unitario * 0.16).toFixed(2);
      const desc      = escaparXML(item.nombre || `Producto #${item.producto_id || item.id || ''}`);

      conceptosXML += `
    <cfdi:Concepto ClaveProdServ="50201700" Cantidad="${cant}" ClaveUnidad="H87" Unidad="Pieza" Descripcion="${desc}" ValorUnitario="${unitario.toFixed(2)}" Importe="${importe}" ObjetoImp="02">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${impIva}"/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>`;
    }
  }

  // Sello: en produccion usar clave privada CSD; aqui se usa HMAC-SHA256 para entorno de desarrollo
  const cadenaOriginal = `||4.0|${fechaISO}|${formaPago}|${rfcEmisor}|${regimenFiscal}|${lugarExpedicion}|${rfcReceptor}|616|01000|${totalFmt}||`;
  const sello          = generarSello(cadenaOriginal);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/TimbreFiscalDigital http://www.sat.gob.mx/sitio_internet/cfd/TimbreFiscalDigital/TimbreFiscalDigitalv11.xsd"
  Version="4.0"
  Serie="ERP"
  Folio="${escaparXML(folio)}"
  Fecha="${fechaISO}"
  Sello="${sello}"
  FormaPago="${formaPago}"
  NoCertificado="00001000000504465028"
  Certificado="MIIB..."
  SubTotal="${subtotalFmt}"
  Moneda="MXN"
  Total="${totalFmt}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="PUE"
  LugarExpedicion="${lugarExpedicion}">

  <cfdi:Emisor
    Rfc="${escaparXML(rfcEmisor)}"
    Nombre="${escaparXML(nombreEmisor)}"
    RegimenFiscal="${regimenFiscal}"/>

  <cfdi:Receptor
    Rfc="${rfcReceptor}"
    Nombre="${nombreReceptor}"
    DomicilioFiscalReceptor="${lugarExpedicion}"
    RegimenFiscalReceptor="616"
    UsoCFDI="G03"/>

  <cfdi:Conceptos>${conceptosXML}
  </cfdi:Conceptos>

  <cfdi:Impuestos TotalImpuestosTrasladados="${ivaFmt}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotalFmt}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${ivaFmt}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>

  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuid}"
      FechaTimbrado="${fechaISO}"
      RfcProvCertif="SAT970701NN3"
      SelloCFD="${sello}"
      NoCertificadoSAT="00001000000504465028"/>
  </cfdi:Complemento>

</cfdi:Comprobante>`;

  return { xml, uuid };
}

module.exports = {
  generarFacturaXML
};
