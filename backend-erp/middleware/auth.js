// Middlewares de autenticacion JWT y control de autorizacion por rol
const path = require('path');
if (!process.env.JWT_SECRET) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}
const jwt = require('jsonwebtoken');

// Clase personalizada para manejar codigos de estado HTTP y mensajes claros
class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Obtiene la clave secreta configurada en el archivo de entorno
function secretoJWT() {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 16) {
    throw new ErrorHttp(500, 'La clave JWT no esta configurada adecuadamente en el backend');
  }
  return secreto;
}

// Genera un token firmado con vigencia de 8 horas
function emitirToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol, correo: usuario.correo },
    secretoJWT(),
    { expiresIn: '8h' }
  );
}

// Verifica que la peticion incluya un token Bearer valido en la cabecera
function exigirSesion(req, res, next) {
  const encabezado = req.get('authorization') || '';
  const [tipo, credencial] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !credencial) {
    return next(new ErrorHttp(401, 'Debes iniciar sesion para acceder a este recurso'));
  }

  try {
    req.usuario = jwt.verify(credencial, secretoJWT());
    return next();
  } catch (error) {
    if (error instanceof ErrorHttp) {
      return next(error);
    }
    return next(new ErrorHttp(401, 'La sesion no es valida o ha expirado'));
  }
}

// Restringe el acceso unicamente a los roles autorizados
function soloPara(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return next(new ErrorHttp(403, 'No cuentas con los permisos necesarios para realizar esta accion'));
    }
    return next();
  };
}

// Manejador centralizado de errores para respuestas uniformes
function manejarErrores(error, req, res, next) {
  if (error instanceof ErrorHttp || error.status) {
    return res.status(error.status).json({ mensaje: error.message });
  }

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ mensaje: 'El registro ya existe en el sistema' });
  }

  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ mensaje: 'No es posible eliminar el registro porque tiene datos relacionados' });
  }

  console.error('Error interno no controlado:', error);
  return res.status(500).json({ mensaje: 'Ocurrio un error interno en el servidor' });
}

module.exports = {
  ErrorHttp,
  emitirToken,
  exigirSesion,
  soloPara,
  manejarErrores
};
