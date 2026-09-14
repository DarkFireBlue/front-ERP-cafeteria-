import { Routes } from '@angular/router';
import { Dashboard } from './componentes/dashboard/dashboard';
import { Sesion } from './componentes/sesion/sesion';
import { Compras } from './componentes/pagina/compras/compras';
import { Finanzas } from './componentes/pagina/finanzas/finanzas';
import { Inventario } from './componentes/pagina/inventario/inventario';
import { Rh } from './componentes/pagina/rh/rh';
import { Ventas } from './componentes/pagina/ventas/ventas';
import { App } from './app';

export const routes: Routes = [
    { path: '', component: Sesion },
    { path: 'dashboard', component: Dashboard },
    { path: 'compras', component: Compras },
    { path: 'finanzas', component: Finanzas },
    { path: 'inventario', component: Inventario },
    { path: 'rh', component: Rh },
    { path: 'ventas', component: Ventas }
];
