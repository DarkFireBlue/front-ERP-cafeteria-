// Definicion de rutas del sistema ERP con proteccion mediante authGuard y roleGuard Standalone
import { Routes } from '@angular/router';
import { Dashboard }   from './componentes/dashboard/dashboard';
import { Sesion }      from './componentes/sesion/sesion';
import { Compras }     from './componentes/pagina/compras/compras';
import { Finanzas }    from './componentes/pagina/finanzas/finanzas';
import { Inventario }  from './componentes/pagina/inventario/inventario';
import { Rh }          from './componentes/pagina/rh/rh';
import { Ventas }      from './componentes/pagina/ventas/ventas';
import { authGuard }   from './guard/auth-guard';
import { roleGuard }   from './guard/role-guard';

export const routes: Routes = [
  // Ruta publica: pantalla de inicio de sesion y registro
  { path: '', component: Sesion },

  // Panel principal: accesible para todos los roles autenticados
  {
    path       : 'dashboard',
    component  : Dashboard,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador', 'empleado', 'cliente'] }
  },

  // Inventario: solo administrador y empleado pueden gestionarlo
  {
    path       : 'inventario',
    component  : Inventario,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador', 'empleado'] }
  },

  // Ventas: administrador, empleado y cliente pueden ver y realizar compras
  {
    path       : 'ventas',
    component  : Ventas,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador', 'empleado', 'cliente'] }
  },

  // Compras a proveedores: solo administrador
  {
    path       : 'compras',
    component  : Compras,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador'] }
  },

  // Recursos Humanos: solo administrador
  {
    path       : 'rh',
    component  : Rh,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador'] }
  },

  // Finanzas y contabilidad: solo administrador
  {
    path       : 'finanzas',
    component  : Finanzas,
    canActivate: [authGuard, roleGuard],
    data       : { roles: ['administrador'] }
  },

  // Ruta comodin: redirige al inicio de sesion
  { path: '**', redirectTo: '' }
];
