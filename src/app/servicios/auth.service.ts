// Servicio Standalone de autenticacion y control de sesion de usuario
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CallbackHttp, postJSON } from './http-cliente';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly url = 'http://localhost:3000/api/sesion';

  constructor(private router: Router) {}

  // Autentica al usuario en el backend y almacena credenciales locales
  iniciarSesion(correo: string, contrasena: string, callback: CallbackHttp): void {
    postJSON(`${this.url}/login`, { correo, contrasena }, (error, data) => {
      if (error) {
        callback(error, null);
        return;
      }
      if (data && data.existe) {
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('usuarioId', String(data.usuario.id));
        localStorage.setItem('usuarioNombre', data.usuario.nombre || 'Usuario');
        localStorage.setItem('usuarioCorreo', data.usuario.correo || '');
        callback(null, data);
      } else {
        callback({ mensaje: data?.mensaje || 'Credenciales incorrectas' }, null);
      }
    });
  }

  // Registra una nueva cuenta de cliente en la base de datos
  registrarCliente(datos: { nombre?: string; correo: string; contrasena: string }, callback: CallbackHttp): void {
    postJSON(`${this.url}/registro`, datos, (error, data) => {
      if (error) {
        callback(error, null);
        return;
      }
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', 'cliente');
        localStorage.setItem('usuarioId', String(data.cliente.id));
        localStorage.setItem('usuarioNombre', data.cliente.nombre || 'Cliente');
        localStorage.setItem('usuarioCorreo', data.cliente.correo || '');
      }
      callback(null, data);
    });
  }

  // Determina si existe una sesion activa en el navegador
  estaAutenticado(): boolean {
    return !!localStorage.getItem('rol') && !!localStorage.getItem('token');
  }

  // Comprueba si el usuario autenticado tiene rol de administrador
  esAdmin(): boolean {
    return localStorage.getItem('rol') === 'administrador';
  }

  // Comprueba si el usuario autenticado tiene rol de cliente
  esCliente(): boolean {
    return localStorage.getItem('rol') === 'cliente';
  }

  // Comprueba si el usuario autenticado tiene rol de empleado
  esEmpleado(): boolean {
    return localStorage.getItem('rol') === 'empleado';
  }

  // Obtiene el nombre del usuario o su correo como respaldo
  obtenerNombre(): string {
    return localStorage.getItem('usuarioNombre') || localStorage.getItem('usuarioCorreo') || 'Usuario';
  }

  // Obtiene el identificador numerico del usuario
  obtenerUsuarioId(): number | null {
    const id = localStorage.getItem('usuarioId');
    return id ? Number(id) : null;
  }

  // Retorna el token JWT vigente
  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  // Retorna el rol del usuario actual
  obtenerRol(): string | null {
    return localStorage.getItem('rol');
  }

  // Valida si el rol actual se encuentra dentro de los roles admitidos
  tieneRol(rolesPermitidos: string[]): boolean {
    const rol = this.obtenerRol();
    return rol !== null && rolesPermitidos.includes(rol);
  }

  // Elimina las credenciales locales y redirige a la pantalla de sesion
  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('usuarioNombre');
    localStorage.removeItem('usuarioCorreo');
    this.router.navigate(['/']);
  }
}
