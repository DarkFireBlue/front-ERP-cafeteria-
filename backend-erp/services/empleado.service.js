// Servicio para gestion de recursos humanos, control de asistencias y nominas
const db = require('../config/db');

// Obtiene la lista de empleados con su ultimo salario percibido
function obtenerEmpleados(callback) {
  const sql = `
    SELECT 
      e.id, 
      e.nombre, 
      e.puesto, 
      e.horario,
      COALESCE(
        (SELECT n.monto_a_pagar FROM nominas n WHERE n.empleado_id = e.id ORDER BY n.id DESC LIMIT 1),
        e.salario_base,
        0
      ) AS salario
    FROM empleados e
    ORDER BY e.nombre
  `;

  db.query(sql, (error, filas) => {
    if (error) {
      // Fallback a vista empleado
      return db.query('SELECT * FROM empleado', (errEmp, filasEmp) => {
        if (errEmp) return callback(error, null);
        const formateados = filasEmp.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          puesto: e.puesto,
          salario: '$0.00 / qna',
          turno: e.horario
        }));
        callback(null, formateados);
      });
    }

    const empleados = filas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      puesto: e.puesto,
      salario: e.salario ? `$${Number(e.salario).toFixed(2)} / qna` : '$0.00 / qna',
      turno: e.horario
    }));

    callback(null, empleados);
  });
}

function agregarEmpleado(datos, callback) {
  const { nombre, puesto, horario, salario_base = 0, usuario_id = null } = datos;
  if (!nombre || !puesto || !horario) {
    return callback(new Error('Nombre, puesto y turno/horario son campos requeridos'));
  }

  const sql = 'INSERT INTO empleados (nombre, puesto, horario, salario_base, usuario_id, fecha_ingreso, activo) VALUES (?, ?, ?, ?, ?, CURDATE(), 1)';
  db.query(sql, [nombre.trim(), puesto.trim(), horario.trim(), Number(salario_base || 0), usuario_id], (error, resultado) => {
    if (error) {
      return db.query(
        'INSERT INTO empleado (nombre, puesto, horario, administrador_id) VALUES (?, ?, ?, ?)',
        [nombre.trim(), puesto.trim(), horario.trim(), usuario_id],
        (errSub, resSub) => {
          if (errSub) return callback(error, null);
          callback(null, { id: resSub.insertId, ...datos });
        }
      );
    }
    callback(null, { id: resultado.insertId, ...datos });
  });
}

function editarEmpleado(id, datos, callback) {
  const { nombre, puesto, horario } = datos;
  const sql = 'UPDATE empleados SET nombre = ?, puesto = ?, horario = ? WHERE id = ?';

  db.query(sql, [nombre.trim(), puesto.trim(), horario.trim(), id], (error) => {
    if (error) {
      return db.query(
        'UPDATE empleado SET nombre = ?, puesto = ?, horario = ? WHERE id = ?',
        [nombre.trim(), puesto.trim(), horario.trim(), id],
        (errSub) => {
          if (errSub) return callback(error, null);
          callback(null, { id: Number(id), ...datos });
        }
      );
    }
    callback(null, { id: Number(id), ...datos });
  });
}

function eliminarEmpleado(id, callback) {
  const sql = 'DELETE FROM empleados WHERE id = ?';
  db.query(sql, [id], (error) => {
    if (error) {
      return db.query('DELETE FROM empleado WHERE id = ?', [id], (errSub) => {
        if (errSub) return callback(error, null);
        callback(null, { mensaje: 'Empleado eliminado correctamente' });
      });
    }
    callback(null, { mensaje: 'Empleado eliminado correctamente' });
  });
}

// Registra la asistencia diaria para el control de turnos
function registrarAsistencia(empleadoId, datos, callback) {
  const { fecha = new Date(), hora_entrada = null, hora_salida = null, estado = 'Asistencia' } = datos;
  const sql = 'INSERT INTO asistencias (empleado_id, fecha, hora_entrada, hora_salida, estado) VALUES (?, ?, ?, ?, ?)';

  db.query(sql, [empleadoId, fecha, hora_entrada, hora_salida, estado], (error, resultado) => {
    if (error) {
      return db.query(
        'INSERT INTO asistencia (empleado_id, fecha, hora_entrada, hora_salida, estado) VALUES (?, ?, ?, ?, ?)',
        [empleadoId, fecha, hora_entrada, hora_salida, estado],
        (errSub, resSub) => {
          if (errSub) return callback(error, null);
          callback(null, { id: resSub.insertId, empleadoId, ...datos });
        }
      );
    }
    callback(null, { id: resultado.insertId, empleadoId, ...datos });
  });
}

// Genera la nomina y asienta automaticamente el egreso en Finanzas
function generarNomina(empleadoId, datos, callback) {
  const { periodo, monto_a_pagar } = datos;
  const monto = Number(monto_a_pagar || 0);

  if (!periodo || monto <= 0) {
    return callback(new Error('Periodo y monto valido a pagar son requeridos'));
  }

  db.beginTransaction((errTx) => {
    if (errTx) return callback(errTx, null);

    const sqlNomina = 'INSERT INTO nominas (empleado_id, periodo, monto_a_pagar, fecha_pago) VALUES (?, ?, ?, NOW())';
    db.query(sqlNomina, [empleadoId, periodo, monto], (errNom, resNom) => {
      if (errNom) return db.rollback(() => callback(errNom, null));
      const nominaId = resNom.insertId;

      // Movimiento financiero de egreso por pago de personal
      const sqlMov = `
        INSERT INTO movimientos_financieros 
        (tipo_movimiento, monto, fecha, descripcion, nomina_id)
        VALUES ('egreso', ?, NOW(), 'Pago de nomina', ?)
      `;
      db.query(sqlMov, [monto, nominaId], (errMov) => {
        if (errMov) return db.rollback(() => callback(errMov, null));

        db.commit((errCommit) => {
          if (errCommit) return db.rollback(() => callback(errCommit, null));
          callback(null, { id: nominaId, empleadoId, periodo, monto_a_pagar: monto });
        });
      });
    });
  });
}

module.exports = {
  obtenerEmpleados,
  agregarEmpleado,
  editarEmpleado,
  eliminarEmpleado,
  registrarAsistencia,
  generarNomina
};
