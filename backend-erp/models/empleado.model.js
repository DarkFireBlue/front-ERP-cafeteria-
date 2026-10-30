// Modelo de datos para empleados, asistencias y nominas (RRHH)
const db = require('../config/db');

const EmpleadoModel = {
  // Devuelve todos los empleados activos con informacion de usuario vinculado
  listarTodos: (callback) => {
    const sql = `
      SELECT e.*, u.correo AS correo_usuario
      FROM empleados e
      LEFT JOIN usuarios u ON e.usuario_id = u.id
      WHERE e.activo = 1
      ORDER BY e.nombre ASC
    `;
    db.query(sql, callback);
  },

  // Busca un empleado por su ID
  buscarPorId: (id, callback) => {
    const sql = 'SELECT * FROM empleados WHERE id = ?';
    db.query(sql, [id], (error, rows) => {
      if (error) return callback(error);
      callback(null, rows[0] || null);
    });
  },

  // Inserta un nuevo empleado
  crear: (datos, callback) => {
    const { nombre, puesto, horario, salario_base, usuario_id = null, fecha_ingreso = null } = datos;
    const sql = `
      INSERT INTO empleados (nombre, puesto, horario, salario_base, usuario_id, fecha_ingreso)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [nombre, puesto, horario, salario_base, usuario_id, fecha_ingreso], (error, resultado) => {
      if (error) return callback(error);
      callback(null, { id: resultado.insertId, ...datos });
    });
  },

  // Actualiza los datos de un empleado existente
  actualizar: (id, datos, callback) => {
    const { nombre, puesto, horario, salario_base, usuario_id } = datos;
    const sql = `
      UPDATE empleados
      SET nombre = ?, puesto = ?, horario = ?, salario_base = ?, usuario_id = ?
      WHERE id = ?
    `;
    db.query(sql, [nombre, puesto, horario, salario_base, usuario_id, id], (error, resultado) => {
      if (error) return callback(error);
      callback(null, resultado.affectedRows > 0);
    });
  },

  // Marca un empleado como inactivo (baja logica)
  desactivar: (id, callback) => {
    const sql = 'UPDATE empleados SET activo = 0 WHERE id = ?';
    db.query(sql, [id], (error, resultado) => {
      if (error) return callback(error);
      callback(null, resultado.affectedRows > 0);
    });
  },

  // ----- Asistencias -----

  // Devuelve asistencias de un empleado en un rango de fechas
  listarAsistencias: (empleadoId, fechaInicio, fechaFin, callback) => {
    const sql = `
      SELECT * FROM asistencias
      WHERE empleado_id = ?
        AND fecha BETWEEN ? AND ?
      ORDER BY fecha DESC
    `;
    db.query(sql, [empleadoId, fechaInicio, fechaFin], callback);
  },

  // Registra una asistencia o marca de entrada/salida para un empleado
  registrarAsistencia: (datos, callback) => {
    const { empleado_id, fecha, hora_entrada = null, hora_salida = null, estado = 'Asistencia' } = datos;
    // Actualizar si ya existe registro para ese empleado y fecha, sino insertar
    const sqlCheck = 'SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?';
    db.query(sqlCheck, [empleado_id, fecha], (error, rows) => {
      if (error) return callback(error);

      if (rows.length > 0) {
        const sqlUpdate = `
          UPDATE asistencias SET hora_salida = ?, estado = ? WHERE id = ?
        `;
        db.query(sqlUpdate, [hora_salida, estado, rows[0].id], (errU, resU) => {
          if (errU) return callback(errU);
          callback(null, { id: rows[0].id, actualizado: true });
        });
      } else {
        const sqlInsert = `
          INSERT INTO asistencias (empleado_id, fecha, hora_entrada, hora_salida, estado)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(sqlInsert, [empleado_id, fecha, hora_entrada, hora_salida, estado], (errI, resI) => {
          if (errI) return callback(errI);
          callback(null, { id: resI.insertId, actualizado: false });
        });
      }
    });
  },

  // ----- Nominas -----

  // Devuelve las nominas generadas con nombre de empleado
  listarNominas: (callback) => {
    const sql = `
      SELECT n.*, e.nombre AS empleado_nombre, e.puesto
      FROM nominas n
      INNER JOIN empleados e ON n.empleado_id = e.id
      ORDER BY n.fecha_pago DESC
    `;
    db.query(sql, callback);
  },

  // Genera una nomina para un empleado y registra el egreso contable atomicamente
  generarNomina: (datos, callback) => {
    const { empleado_id, periodo, monto_a_pagar } = datos;

    db.beginTransaction((errTx) => {
      if (errTx) return callback(errTx);

      const sqlNomina = `
        INSERT INTO nominas (empleado_id, periodo, monto_a_pagar)
        VALUES (?, ?, ?)
      `;
      db.query(sqlNomina, [empleado_id, periodo, monto_a_pagar], (errN, resN) => {
        if (errN) return db.rollback(() => callback(errN));

        const nominaId = resN.insertId;

        const sqlEgreso = `
          INSERT INTO movimientos_financieros
            (tipo_movimiento, monto, descripcion, nomina_id)
          VALUES ('egreso', ?, ?, ?)
        `;
        const desc = `Nomina periodo ${periodo} - Empleado ID ${empleado_id}`;
        db.query(sqlEgreso, [monto_a_pagar, desc, nominaId], (errE) => {
          if (errE) return db.rollback(() => callback(errE));

          db.commit((errCommit) => {
            if (errCommit) return db.rollback(() => callback(errCommit));
            callback(null, { nominaId, empleado_id, periodo, monto_a_pagar });
          });
        });
      });
    });
  }
};

module.exports = EmpleadoModel;
