// Servicio Angular para registro y consulta de compras a proveedores
import { Injectable } from '@angular/core';
import { CallbackHttp, obtenerJSON, postJSON } from './http-cliente';

@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly url = 'http://localhost:3000/api/compras';

  obtenerCompras(callback: CallbackHttp): void {
    obtenerJSON(this.url, callback);
  }

  crearCompra(datos: any, callback: CallbackHttp): void {
    postJSON(this.url, datos, callback);
  }
}
