import { Component } from '@angular/core';

export interface ProductoInventario {
  id: number;
  producto: string;
  categoria: string;
  cantidad: string;
  precioUnitario: string;
  estado: string;
  claseEstado: string;
}

@Component({
  imports: [],
  selector: 'app-inventario',
  styleUrl: './inventario.css',
  templateUrl: './inventario.html',
})
export class Inventario {
  productos: ProductoInventario[] = [
    { id: 1, producto: '-----', categoria: '------', cantidad: '0', precioUnitario: '$0.00', estado: 'Suficiente', claseEstado: 'verde' },
  ];

  agregarProducto(): void {}
}
