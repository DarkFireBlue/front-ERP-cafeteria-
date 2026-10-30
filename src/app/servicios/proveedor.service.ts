// Servicio Angular para gestion de proveedores y distribuidores
import { Injectable } from '@angular/core';
import { CallbackHttp, obtenerJSON, postJSON, putJSON, eliminarJSON } from './http-cliente';

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly url = 'http://localhost:3000/api/proveedores';

  obtenerProveedores(callback: CallbackHttp): void {
    obtenerJSON(this.url, callback);
  }

  agregarProveedor(datos: { nombre: string; contacto?: string; telefono?: string; correo?: string; direccion?: string }, callback: CallbackHttp): void {
    postJSON(this.url, datos, callback);
  }

  editarProveedor(id: number, datos: any, callback: CallbackHttp): void {
    putJSON(`${this.url}/${id}`, datos, callback);
  }

  eliminarProveedor(id: number, callback: CallbackHttp): void {
    eliminarJSON(`${this.url}/${id}`, callback);
  }
}
