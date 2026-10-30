// Componente principal Standalone: gestion de layout y sesion activa
import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './servicios/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ERPcafeteria');
  mostrarLayout = signal(false);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.subscribe(() => {
      const rutaActual = this.router.url;
      const tieneSesion = this.authService.estaAutenticado();
      this.mostrarLayout.set(rutaActual !== '/' && tieneSesion);
    });
  }

  // Cierra la sesion activa y limpia el almacenamiento
  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
