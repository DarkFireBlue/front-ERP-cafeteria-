// Componente Standalone de Recursos Humanos: gestion de empleados, calendario y registro de personal
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoService } from '../../../servicios/empleado.service';
import { AuthService } from '../../../servicios/auth.service';
import { validarTexto, validarNumero } from '../../../servicios/http-cliente';

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
  imports: [CommonModule, FormsModule],
  selector: 'app-rh',
  standalone: true,
  styleUrl: './rh.css',
  templateUrl: './rh.html',
})
export class Rh implements OnInit {
  readonly authService = inject(AuthService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly cdr = inject(ChangeDetectorRef);

  empleados: Empleado[] = [];
  cargando = false;

  // Dias del mes actual calculados dinamicamente
  diasCalendario: DiaCalendario[] = [];

  // Modal para agregar empleado
  mostrarModal = false;
  guardando = false;
  errorMensaje = '';

  formNombre = '';
  formPuesto = '';
  formTurno = 'Matutino (08:00 - 16:00)';
  formSalario = '';

  turnosDisponibles = [
    'Matutino (08:00 - 16:00)',
    'Vespertino (14:00 - 22:00)',
    'Mixto (10:00 - 18:00)',
    'Fines de semana'
  ];

  ngOnInit(): void {
    this.generarDiasMes();
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    this.cargando = true;
    this.empleadoService.obtenerEmpleados((error, datos) => {
      this.cargando = false;
      if (!error && Array.isArray(datos)) {
        this.empleados = datos;
      }
      this.cdr.detectChanges();
    });
  }

  // Genera el listado de dias del mes actual marcando como activos los dias laborables hasta la fecha de hoy
  generarDiasMes(): void {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const totalDias = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();

    const dias: DiaCalendario[] = [];
    for (let i = 1; i <= totalDias; i++) {
      const fechaDia = new Date(hoy.getFullYear(), hoy.getMonth(), i);
      const diaSemana = fechaDia.getDay(); // 0: Domingo, 6: Sabado
      const esLaborable = diaSemana !== 0;
      dias.push({
        numero: i,
        activo: i <= diaActual && esLaborable
      });
    }
    this.diasCalendario = dias;
  }

  agregarEmpleado(): void {
    this.formNombre = '';
    this.formPuesto = '';
    this.formTurno = 'Matutino (08:00 - 16:00)';
    this.formSalario = '';
    this.errorMensaje = '';
    this.guardando = false;
    this.mostrarModal = true;
    this.cdr.detectChanges();
  }

  cerrarModal(): void {
    if (this.guardando) return;
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  guardarEmpleado(): void {
    if (this.guardando) return;

    const errNombre = validarTexto(this.formNombre, 100);
    if (errNombre) {
      this.errorMensaje = `Nombre: ${errNombre}`;
      return;
    }

    const errPuesto = validarTexto(this.formPuesto, 100);
    if (errPuesto) {
      this.errorMensaje = `Puesto: ${errPuesto}`;
      return;
    }

    const errSalario = validarNumero(this.formSalario);
    if (errSalario) {
      this.errorMensaje = `Salario: ${errSalario}`;
      return;
    }

    this.errorMensaje = '';
    this.guardando = true;

    const payload = {
      nombre: this.formNombre.trim(),
      puesto: this.formPuesto.trim(),
      horario: this.formTurno,
      salario_base: Number(this.formSalario)
    };

    this.empleadoService.agregarEmpleado(payload, (error) => {
      this.guardando = false;
      if (error) {
        this.errorMensaje = error.mensaje || 'Error al guardar el empleado.';
        this.cdr.detectChanges();
        return;
      }
      this.mostrarModal = false;
      this.cargarEmpleados();
    });
  }
}
