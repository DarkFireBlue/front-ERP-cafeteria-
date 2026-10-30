// Servicio Angular para iniciar y capturar ordenes de pago con PayPal Sandbox
import { Injectable } from '@angular/core';
import { CallbackHttp, postJSON } from './http-cliente';

@Injectable({ providedIn: 'root' })
export class PaypalService {
  private readonly url = 'http://localhost:3000/api/paypal';

  // Crea la orden en PayPal validando el stock del inventario
  crearOrden(datos: any, callback: CallbackHttp): void {
    postJSON(`${this.url}/orden`, datos, callback);
  }

  // Captura la orden aprobada por el cliente en el portal de PayPal
  capturarOrden(ordenId: string, datosVenta: any, callback: CallbackHttp): void {
    postJSON(`${this.url}/capturar/${ordenId}`, datosVenta, callback);
  }
}
