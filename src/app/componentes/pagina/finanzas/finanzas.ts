import { Component } from '@angular/core';

export interface ResumenFinanzas {
  ingresosMes: string;
  egresosMes: string;
  utilidadNeta: string;
}

export interface GraficaSemanal {
  semana: string;
  porcentajeAltura: number;
}

export interface ReporteFinanciero {
  id: number;
  nombre: string;
  periodo: string;
  fecha: string;
  formato: string;
}

@Component({
  imports: [],
  selector: 'app-finanzas',
  styleUrl: './finanzas.css',
  templateUrl: './finanzas.html',
})
export class Finanzas {
  resumen: ResumenFinanzas = {
    ingresosMes: '$0.00',
    egresosMes: '$0.00',
    utilidadNeta: '$0.00'
  };

  datosGrafica: GraficaSemanal[] = [
    { semana: 'Sem 1', porcentajeAltura: 1 },
    { semana: 'Sem 2', porcentajeAltura: 1 },
    { semana: 'Sem 3', porcentajeAltura: 1 },
    { semana: 'Sem 4', porcentajeAltura: 1 }
  ];

  reportes: ReporteFinanciero[] = [
    { id: 1, nombre: '-----', periodo: '---- - ----', fecha: '00/00/0000', formato: '----' },
  ];

  exportarExcel(): void {  }
}
