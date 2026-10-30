// Guardian de ruta Standalone: asegura que el usuario tenga sesion activa
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../servicios/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado()) {
    return true;
  }

  // Redireccion al inicio de sesion si no esta autenticado
  return router.createUrlTree(['/']);
};
