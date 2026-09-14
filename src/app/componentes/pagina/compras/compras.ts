import { Component } from '@angular/core';

export interface ProductoCompra {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  estado: 'Disponible' | 'Poco stock' | 'Agotado';
  claseEtiqueta: 'verde' | 'naranja' | 'roja';
}

@Component({
  imports: [],
  selector: 'app-compras',
  styleUrl: './compras.css',
  templateUrl: './compras.html',
})
export class Compras {
  productos: ProductoCompra[] = [
    { id: 1, nombre: '----', categoria: '-----', precio: 0.00, estado: 'Disponible', claseEtiqueta: 'verde' },
  ];
  agregarCompra(): void {}
}