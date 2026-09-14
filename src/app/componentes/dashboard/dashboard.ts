import { Component, signal } from '@angular/core';

export interface TarjetaDashboard {
  id: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  esImagen: boolean;
  metrica1: {
    valor: string;
    etiqueta: string;
  };
  metrica2: {
    valor: string;
    etiqueta: string;
    esAlerta?: boolean;
  };
}

@Component({
  imports: [],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})

export class Dashboard {
  tarjetas: TarjetaDashboard[] = [
    {
      id: 'finanzas',
      titulo: 'Contabilidad y Finanzas',
      subtitulo: 'Estadísticas y balance.',
      icono: 'Finanzas.png',
      esImagen: true,
      metrica1: { valor: '$0.00', etiqueta: 'Ingresos mes' },
      metrica2: { valor: '---', etiqueta: 'Reportes' }
    },
    {
      id: 'inventario',
      titulo: 'Gestión de Inventario',
      subtitulo: 'Existencias de insumos.',
      icono: 'Hexagono.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Productos' },
      metrica2: { valor: '---', etiqueta: 'Stock -----', esAlerta: true }
    },
    {
      id: 'ventas',
      titulo: 'Ventas y Facturación',
      subtitulo: 'Ventas locales y online.',
      icono: 'Cuadrado.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Ventas hoy' },
      metrica2: { valor: '$0.00', etiqueta: 'Total día' }
    },
    {
      id: 'compras',
      titulo: 'Compras',
      subtitulo: 'Catálogo e insumos.',
      icono: 'Compras.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Proveedores' },
      metrica2: { valor: '---', etiqueta: 'Órdenes' }
    },
    {
      id: 'rh',
      titulo: 'Recursos Humanos',
      subtitulo: 'Plantilla de personal.',
      icono: 'Usuario.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Empleados' },
      metrica2: { valor: '---', etiqueta: 'Turnos hoy' }
    }
  ];
}