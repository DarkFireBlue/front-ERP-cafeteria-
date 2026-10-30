// Servicio Angular para consultas financieras, graficas, reportes y exportacion a Excel
import { Injectable } from '@angular/core';
import { CallbackHttp, obtenerJSON, postJSON } from './http-cliente';

@Injectable({ providedIn: 'root' })
export class FinanzaService {
  private readonly url = 'http://localhost:3000/api/finanzas';

  obtenerResumen(callback: CallbackHttp): void {
    obtenerJSON(`${this.url}/resumen`, callback);
  }

  obtenerGrafica(callback: CallbackHttp): void {
    obtenerJSON(`${this.url}/grafica`, callback);
  }

  obtenerReportes(callback: CallbackHttp): void {
    obtenerJSON(`${this.url}/reportes`, callback);
  }

  registrarMovimiento(datos: any, callback: CallbackHttp): void {
    postJSON(`${this.url}/movimiento`, datos, callback);
  }

  // Exporta los movimientos financieros a un archivo CSV descargable en el navegador
  exportarExcel(reportes: any[]): void {
    if (!reportes || reportes.length === 0) {
      console.warn('[FinanzaService] No hay reportes para exportar');
      return;
    }

    const encabezados = ['ID', 'Descripcion', 'Tipo', 'Monto', 'Fecha'];
    const filas = reportes.map((r) => [
      r.id ?? '',
      `"${(r.nombre || r.descripcion || '').replace(/"/g, '""')}"`,
      r.tipo ?? r.tipo_movimiento ?? '',
      (r.monto ?? '').toString().replace('$', ''),
      r.fecha ?? r.periodo ?? ''
    ]);

    const contenidoCSV = [
      encabezados.join(','),
      ...filas.map((f) => f.join(','))
    ].join('\r\n');

    const bom  = '\uFEFF'; // BOM para compatibilidad con Excel en Windows
    const blob = new Blob([bom + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    const fecha  = new Date().toISOString().slice(0, 10);

    enlace.href     = URL.createObjectURL(blob);
    enlace.download = `Reporte-Financiero-${fecha}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(enlace.href);
  }
}
