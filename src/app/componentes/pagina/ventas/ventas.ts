import { Component } from '@angular/core';

export interface ResumenVentas {
  ventasHoy: number;
  totalDia: string;
  ivaAcumulado: string;
}

export interface Venta {
  folio: string;
  cliente: string;
  canal: string;
  total: string;
  iva: string;
  estadoFactura: string;
  claseEstado: string;
}

@Component({
  imports: [],
  selector: 'app-ventas',
  styleUrl: './ventas.css',
  templateUrl: './ventas.html',
})
export class Ventas {
  resumen: ResumenVentas = {
    ventasHoy: 0,
    totalDia: '$0.00',
    ivaAcumulado: '$0.00'
  };

  ventas: Venta[] = [
    { folio: '----', cliente: '------', canal: '-----', total: '$0.00', iva: '$0.00', estadoFactura: '-----', claseEstado: '-----' },
    ];

  nuevaVenta(): void {  }
}
