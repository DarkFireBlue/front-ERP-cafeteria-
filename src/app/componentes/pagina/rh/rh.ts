import { Component } from '@angular/core';

export interface Empleado {
  id: number;
  nombre: string;
  puesto: string;
  salario: string;
  turno: string;
}

export interface DiaCalendario {
  numero: number;
  activo: boolean;
}

@Component({
  imports: [],
  selector: 'app-rh',
  styleUrl: './rh.css',
  templateUrl: './rh.html',
})
export class Rh {
  empleados: Empleado[] = [
    { id: 1, nombre: '------', puesto: '-------', salario: '$0.00 / qna', turno: '-----' },
  ];

  diasCalendario: DiaCalendario[] = [
    { numero: 1, activo: false },
    { numero: 2, activo: true },
    { numero: 3, activo: false },
    { numero: 4, activo: true },
    { numero: 5, activo: false },
    { numero: 6, activo: false },
    { numero: 7, activo: false }
  ];

  agregarEmpleado(): void {}
}
