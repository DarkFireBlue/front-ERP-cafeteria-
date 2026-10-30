// Componente Standalone de autenticacion: gestion de inicio de sesion y registro
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../servicios/auth.service';

@Component({
  selector: 'app-sesion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sesion.html',
  styleUrl: './sesion.css',
})
export class Sesion {
  mostrarRegistro = false;
  cargando = false;
  mensajeError = '';

  // Control de modales legales
  modalTerminosAbierto = false;
  modalPrivacidadAbierto = false;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Formulario reactivo para Inicio de Sesion
  loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.maxLength(100)]]
  });

  // Formulario reactivo para Registro (Crear Cuenta) con aceptacion obligatoria
  registroForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', [Validators.required, Validators.maxLength(100)]],
    aceptaTerminos: [false, [Validators.requiredTrue]]
  });

  // Alterna entre la vista de acceso y la de registro
  alternarVista(): void {
    this.mostrarRegistro = !this.mostrarRegistro;
    this.mensajeError = '';
    this.loginForm.reset();
    this.registroForm.reset({ aceptaTerminos: false });
    this.cdr.detectChanges();
  }

  // Apertura y cierre de modales
  abrirTerminos(): void {
    this.modalTerminosAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarTerminos(): void {
    this.modalTerminosAbierto = false;
    this.cdr.detectChanges();
  }

  abrirPrivacidad(): void {
    this.modalPrivacidadAbierto = true;
    this.cdr.detectChanges();
  }

  cerrarPrivacidad(): void {
    this.modalPrivacidadAbierto = false;
    this.cdr.detectChanges();
  }

  // Procesa el envio del formulario activo
  enviarFormulario(): void {
    this.mensajeError = '';

    if (this.mostrarRegistro) {
      if (this.registroForm.invalid) {
        this.registroForm.markAllAsTouched();
        if (this.registroForm.get('aceptaTerminos')?.invalid) {
          this.mensajeError = 'Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.';
        } else {
          this.mensajeError = 'Por favor completa todos los campos correctamente.';
        }
        return;
      }

      this.cargando = true;
      const { nombre, correo, contrasena } = this.registroForm.value;

      this.authService.registrarCliente({
        nombre: nombre.trim(),
        correo: correo.trim(),
        contrasena: contrasena.trim()
      }, (error, _data) => {
        this.cargando = false;
        if (error) {
          this.mensajeError = error.mensaje || 'Error al registrar la cuenta';
          this.cdr.detectChanges();
          return;
        }
        this.router.navigate(['/dashboard']);
      });

    } else {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        this.mensajeError = 'Por favor ingresa un correo y contraseña válidos.';
        return;
      }

      this.cargando = true;
      const { correo, contrasena } = this.loginForm.value;

      this.authService.iniciarSesion(correo.trim(), contrasena.trim(), (error, _data) => {
        this.cargando = false;
        if (error) {
          this.mensajeError = error.mensaje || 'Credenciales inválidas';
          this.cdr.detectChanges();
          return;
        }
        this.router.navigate(['/dashboard']);
      });
    }
  }
}
