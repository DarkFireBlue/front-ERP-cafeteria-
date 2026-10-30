// Guardian de ruta Standalone: verifica que el rol del usuario coincida con los permisos de la ruta
import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const rolesPermitidos = (route.data?.['roles'] as string[]) ?? [];

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/']);
  }

  // Permitir acceso si no hay restriccion especifica o el rol es valido
  if (rolesPermitidos.length === 0 || authService.tieneRol(rolesPermitidos)) {
    return true;
  }

  // Redirigir a la vista predeterminada si no cuenta con el rol requerido
  return router.createUrlTree(['/dashboard']);
};
