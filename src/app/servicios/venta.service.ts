// Servicio Angular para ventas, resumen diario y descarga de facturas XML
import { Injectable } from '@angular/core';
import { CallbackHttp, obtenerJSON, postJSON, descargarArchivo } from './http-cliente';

@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly url = 'http://localhost:3000/api/ventas';

  obtenerResumen(callback: CallbackHttp): void {
    obtenerJSON(`${this.url}/resumen`, callback);
  }

  obtenerVentas(callback: CallbackHttp, clienteId?: number): void {
    const query = clienteId ? `?cliente_id=${clienteId}` : '';
    obtenerJSON(`${this.url}${query}`, callback);
  }

  crearVenta(datos: any, callback: CallbackHttp): void {
    postJSON(this.url, datos, callback);
  }

  // Obtiene el objeto JSON de la factura vinculada a una venta
  obtenerFactura(idOFolio: string | number, callback: CallbackHttp, clienteId?: number | null): void {
    const query = clienteId ? `?cliente_id=${clienteId}` : '';
    obtenerJSON(`${this.url}/${idOFolio}/factura${query}`, callback);
  }

  // Descarga el XML CFDI 4.0 de una venta directamente como archivo en el navegador
  descargarFacturaXML(ventaId: string | number, folio: string): void {
    const nombreArchivo = `Factura-${folio || ventaId}.xml`;
    descargarArchivo(
      `${this.url}/${ventaId}/factura`,
      nombreArchivo,
      (error, _resultado) => {
        if (error) {
          console.error('[VentaService] Error al descargar la factura XML:', error.mensaje || error);
        }
      }
    );
  }
}
