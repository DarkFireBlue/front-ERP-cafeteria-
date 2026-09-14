import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-sesion',
  styleUrl: './sesion.css',
  templateUrl: './sesion.html',
})
export class Sesion {
  mostrarRegistro = false;

  alternarVista(): void {
    this.mostrarRegistro = !this.mostrarRegistro;
  }
}
