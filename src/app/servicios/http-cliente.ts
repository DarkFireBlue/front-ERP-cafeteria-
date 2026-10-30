// Utilidad de peticiones HTTP con inyeccion automatica de token JWT y validaciones
export type CallbackHttp = (error: any, datos: any) => void;

function peticion(metodo: string, url: string, datos: any, callback: CallbackHttp): void {
  const xhr = new XMLHttpRequest();
  xhr.open(metodo, url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // Adjunta el token de autorizacion si existe sesion activa
  const token = localStorage.getItem('token');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onload = function () {
    let cuerpo: any = null;
    try {
      cuerpo = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (errorParseo) {
      callback(errorParseo, null);
      return;
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      callback(null, cuerpo);
    } else {
      const mensaje = (cuerpo && cuerpo.mensaje) ? cuerpo.mensaje : `Error en la peticion (${xhr.status})`;
      callback({ status: xhr.status, mensaje }, null);
    }
  };

  xhr.onerror = function () {
    callback({ mensaje: 'No fue posible conectar con el servidor backend' }, null);
  };

  xhr.send(datos !== undefined && datos !== null ? JSON.stringify(datos) : undefined);
}

export function obtenerJSON(url: string, callback: CallbackHttp): void {
  peticion('GET', url, null, callback);
}

export function postJSON(url: string, datos: any, callback: CallbackHttp): void {
  peticion('POST', url, datos, callback);
}

export function putJSON(url: string, datos: any, callback: CallbackHttp): void {
  peticion('PUT', url, datos, callback);
}

export function eliminarJSON(url: string, callback: CallbackHttp): void {
  peticion('DELETE', url, null, callback);
}

// Descarga un archivo de texto plano (XML, CSV) desde una URL autenticada
// y lo dispara como descarga del navegador con el nombre de archivo indicado
export function descargarArchivo(url: string, nombreArchivo: string, callback: CallbackHttp): void {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  const token = localStorage.getItem('token');
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  }

  xhr.onload = function () {
    if (xhr.status >= 200 && xhr.status < 300) {
      const blob = new Blob([xhr.responseText], { type: 'application/octet-stream' });
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(enlace.href);
      callback(null, { descargado: true, archivo: nombreArchivo });
    } else {
      let cuerpo: any = null;
      try { cuerpo = JSON.parse(xhr.responseText); } catch (_) {}
      callback({ status: xhr.status, mensaje: cuerpo?.mensaje || `Error al descargar (${xhr.status})` }, null);
    }
  };

  xhr.onerror = function () {
    callback({ mensaje: 'No fue posible conectar con el servidor para descargar el archivo' }, null);
  };

  xhr.send();
}

// Funciones de validacion para formularios del sistema
export function validarTexto(texto: string | null | undefined, maxLongitud: number = 255): string | null {
  if (!texto || !texto.trim()) {
    return 'Este campo no puede estar vacio';
  }
  const limpio = texto.trim();
  if (limpio.length > maxLongitud) {
    return `La longitud maxima permitida es de ${maxLongitud} caracteres`;
  }
  if (/[<>;]|\-\-/.test(limpio)) {
    return 'No se permiten caracteres especiales no validos (<, >, ;, --)';
  }
  return null;
}

export function validarCorreo(correo: string | null | undefined): string | null {
  const errorTexto = validarTexto(correo, 100);
  if (errorTexto) return errorTexto;
  const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!patronCorreo.test(correo!.trim())) {
    return 'El formato de correo electronico es invalido (ejemplo@dominio.com)';
  }
  return null;
}

export function validarNumero(val: number | string | null | undefined, esEntero: boolean = false): string | null {
  if (val === null || val === undefined || val === '') {
    return 'Este campo numerico no puede estar vacio';
  }
  const num = Number(val);
  if (isNaN(num) || num < 0) {
    return 'Debe ingresar un numero valido mayor o igual a 0';
  }
  if (esEntero && !Number.isInteger(num)) {
    return 'Debe ingresar un numero entero';
  }
  return null;
}
