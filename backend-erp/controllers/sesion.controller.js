// Controlador para gestion de sesiones, inicio de sesion y registro de usuarios
const UsuarioModel = require('../models/usuario.model');
const { emitirToken } = require('../middleware/auth');

// Funciones de validacion basica de campos
function validarTexto(texto, campo, maxLen = 255) {
  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return `El campo "${campo}" no puede estar vacio.`;
  }
  const limpio = texto.trim();
  if (limpio.length > maxLen) {
    return `El campo "${campo}" no puede superar los ${maxLen} caracteres.`;
  }
  if (/[<>;]|\-\-/.test(limpio)) {
    return `El campo "${campo}" contiene caracteres especiales no permitidos (<, >, ;, --).`;
  }
  return null;
}

function validarCorreo(correo) {
  const errorTexto = validarTexto(correo, 'Correo electronico', 100);
  if (errorTexto) return errorTexto;
  const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!patronCorreo.test(correo.trim())) {
    return 'El formato de correo electronico es invalido (ejemplo@dominio.com).';
  }
  return null;
}

const SesionController = {
  // Procesa el inicio de sesion y emite el token JWT
  login: (req, res) => {
    const { correo, contrasena } = req.body;

    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) return res.status(400).json({ mensaje: errorCorreo });

    const errorPass = validarTexto(contrasena, 'Contrasena', 100);
    if (errorPass) return res.status(400).json({ mensaje: errorPass });

    UsuarioModel.buscarPorCredenciales(correo.trim(), contrasena, (error, resultado) => {
      if (error) {
        console.error('Error al verificar credenciales:', error);
        return res.status(500).json({ mensaje: 'Error al verificar las credenciales del usuario' });
      }

      if (!resultado || !resultado.existe) {
        return res.status(401).json({
          existe: false,
          mensaje: 'Correo o contrasena incorrectos. Verifique sus datos.'
        });
      }

      try {
        const token = emitirToken(resultado.usuario);
        res.json({
          existe: true,
          rol: resultado.rol,
          usuario: resultado.usuario,
          token,
          mensaje: 'Inicio de sesion exitoso'
        });
      } catch (errorToken) {
        console.error('Error al generar token JWT:', errorToken);
        res.status(errorToken.status || 500).json({
          mensaje: errorToken.message || 'No fue posible generar el token de sesion'
        });
      }
    });
  },

  // Registra un nuevo usuario con rol de cliente
  registro: (req, res) => {
    const { nombre, correo, contrasena } = req.body;

    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) return res.status(400).json({ mensaje: errorCorreo });

    const errorPass = validarTexto(contrasena, 'Contrasena', 100);
    if (errorPass) return res.status(400).json({ mensaje: errorPass });

    UsuarioModel.buscarPorCorreo(correo.trim(), (errBuscar, yaExiste) => {
      if (errBuscar) {
        return res.status(500).json({ mensaje: 'Error al verificar disponibilidad del correo' });
      }

      if (yaExiste) {
        return res.status(409).json({ mensaje: 'El correo electronico ya esta registrado' });
      }

      UsuarioModel.crearCliente({
        nombre: nombre ? nombre.trim() : 'Cliente',
        correo: correo.trim(),
        contrasena: contrasena.trim()
      }, (errCrear, nuevoCliente) => {
        if (errCrear) {
          console.error('Error al crear usuario:', errCrear);
          return res.status(500).json({ mensaje: 'Error al registrar la cuenta de usuario' });
        }

        const token = emitirToken({ id: nuevoCliente.id, rol: 'cliente', correo: nuevoCliente.correo });
        res.status(201).json({
          mensaje: 'Cuenta registrada exitosamente',
          cliente: nuevoCliente,
          token
        });
      });
    });
  }
};

module.exports = SesionController;
