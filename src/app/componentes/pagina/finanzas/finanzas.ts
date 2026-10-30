// Componente Standalone de finanzas: resumen contable, grafica semanal y exportacion de reportes
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanzaService } from '../../../servicios/finanza.service';

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
  monto?: string;
  tipo?: string;
}

@Component({
  imports: [CommonModule],
  selector: 'app-finanzas',
  standalone: true,
  styleUrl: './finanzas.css',
  templateUrl: './finanzas.html',
})
export class Finanzas implements OnInit {
  private readonly finanzaService = inject(FinanzaService);
  private readonly cdr = inject(ChangeDetectorRef);

  resumen: ResumenFinanzas = {
    ingresosMes: '$0.00',
    egresosMes: '$0.00',
    utilidadNeta: '$0.00'
  };

  datosGrafica: GraficaSemanal[] = [
    { semana: 'Sem 1', porcentajeAltura: 5 },
    { semana: 'Sem 2', porcentajeAltura: 5 },
    { semana: 'Sem 3', porcentajeAltura: 5 },
    { semana: 'Sem 4', porcentajeAltura: 5 }
  ];

  reportes: ReporteFinanciero[] = [];
  cargando = false;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    // Resumen de ingresos, egresos y utilidad del mes en curso
    this.finanzaService.obtenerResumen((error, datos) => {
      if (!error && datos) {
        this.resumen = datos;
        this.cdr.detectChanges();
      }
    });

    // Alturas dinamicas por semana para el grafico de barras
    this.finanzaService.obtenerGrafica((error, datos) => {
      if (!error && Array.isArray(datos) && datos.length > 0) {
        // Cubrir las cuatro semanas mapeando la respuesta
        const mapa = new Map(datos.map((d: any) => [d.semana, Number(d.porcentajeAltura || 5)]));
        this.datosGrafica = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((s) => ({
          semana: s,
          porcentajeAltura: (mapa.get(s) as number) ?? 5
        }));
        this.cdr.detectChanges();
      }
    });

    // Historial de movimientos contables para la tabla de reportes
    this.finanzaService.obtenerReportes((error, datos) => {
      this.cargando = false;
      if (!error && Array.isArray(datos)) {
        this.reportes = datos;
      }
      this.cdr.detectChanges();
    });
  }

  // Genera y descarga los reportes contables en formato CSV compatible con Excel mediante el servicio
  exportarExcel(): void {
    if (!this.reportes || this.reportes.length === 0) {
      alert('No hay reportes disponibles para exportar.');
      return;
    }
    this.finanzaService.exportarExcel(this.reportes);
  }
}
