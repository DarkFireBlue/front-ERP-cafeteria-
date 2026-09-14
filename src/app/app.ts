import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ERPcafeteria');
  mostrarLayout = signal(false);

  constructor(private router: Router) {
    this.router.events.subscribe(() => {
      this.mostrarLayout.set(this.router.url !== '/');
    });
  }

  cerrarSesion(): void {
    this.router.navigate(['/']);
  }
}
