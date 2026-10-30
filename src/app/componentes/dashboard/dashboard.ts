// Componente Standalone del panel principal: carga metricas reales de todos los modulos
import { Component, OnInit, ChangeDetectorRef, inject, signal } from '@angular/core';
import { DashboardService } from '../../servicios/dashboard.service';
import { AuthService } from '../../servicios/auth.service';

export interface TarjetaDashboard {
  id: string;
  titulo: string;
  subtitulo: string;
  icono: string;
  esImagen: boolean;
  metrica1: { valor: string; etiqueta: string };
  metrica2: { valor: string; etiqueta: string; esAlerta?: boolean };
}

@Component({
  imports: [],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Datos iniciales en cero hasta que llegue la respuesta del servidor
  tarjetas: TarjetaDashboard[] = [
    {
      id: 'finanzas',
      titulo: 'Contabilidad y Finanzas',
      subtitulo: 'Estadisticas y balance.',
      icono: 'Finanzas.png',
      esImagen: true,
      metrica1: { valor: '$0.00', etiqueta: 'Ingresos mes' },
      metrica2: { valor: '---', etiqueta: 'Reportes' }
    },
    {
      id: 'inventario',
      titulo: 'Gestion de Inventario',
      subtitulo: 'Existencias de insumos.',
      icono: 'Hexagono.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Productos' },
      metrica2: { valor: '---', etiqueta: 'Stock bajo', esAlerta: true }
    },
    {
      id: 'ventas',
      titulo: 'Ventas y Facturacion',
      subtitulo: 'Ventas locales y en linea.',
      icono: 'Cuadrado.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Ventas hoy' },
      metrica2: { valor: '$0.00', etiqueta: 'Total dia' }
    },
    {
      id: 'compras',
      titulo: 'Compras',
      subtitulo: 'Catalogo e insumos.',
      icono: 'Compras.png',
      esImagen: true,
      metrica1: { valor: '---', etiqueta: 'Proveedores' },
      metrica2: { valor: '---', etiqueta: 'Ordenes' }
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

  ngOnInit(): void {
    // Solo el administrador puede ver las metricas reales del dashboard
    if (this.authService.esAdmin()) {
      this.cargarDatos();
    }
  }

  cargarDatos(): void {
    this.dashboardService.obtenerResumen((error, datos) => {
      if (error || !datos) return;

      // Mapear respuesta del servidor a cada tarjeta por su identificador
      this.tarjetas = this.tarjetas.map((t) => {
        switch (t.id) {
          case 'finanzas':
            return {
              ...t,
              metrica1: { valor: datos.finanzas?.ingresosMes || '$0.00', etiqueta: 'Ingresos mes' },
              metrica2: { valor: datos.finanzas?.reportes || '---', etiqueta: 'Reportes' }
            };
          case 'inventario':
            return {
              ...t,
              metrica1: { valor: datos.inventario?.productos || '---', etiqueta: 'Productos' },
              metrica2: { valor: datos.inventario?.stockBajo || '---', etiqueta: 'Stock bajo', esAlerta: true }
            };
          case 'ventas':
            return {
              ...t,
              metrica1: { valor: datos.ventas?.ventasHoy || '---', etiqueta: 'Ventas hoy' },
              metrica2: { valor: datos.ventas?.totalDia || '$0.00', etiqueta: 'Total dia' }
            };
          case 'compras':
            return {
              ...t,
              metrica1: { valor: datos.compras?.proveedores || '---', etiqueta: 'Proveedores' },
              metrica2: { valor: datos.compras?.ordenes || '---', etiqueta: 'Ordenes' }
            };
          case 'rh':
            return {
              ...t,
              metrica1: { valor: datos.rh?.empleados || '---', etiqueta: 'Empleados' },
              metrica2: { valor: datos.rh?.turnosHoy || '---', etiqueta: 'Turnos hoy' }
            };
          default:
            return t;
        }
      });

      this.cdr.detectChanges();
    });
  }
}
