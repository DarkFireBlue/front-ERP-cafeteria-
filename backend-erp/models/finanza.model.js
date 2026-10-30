// Modelo de consultas agrupadas para finanzas: resumen mensual, grafica semanal y reportes
const db = require('../config/db');

const FinanzaModel = {
  // Calcula ingresos, egresos y utilidad del mes en curso
  resumenMensual: (callback) => {
    const sql = `
      SELECT
        tipo_movimiento,
        COALESCE(SUM(monto), 0) AS total
      FROM movimientos_financieros
      WHERE MONTH(fecha) = MONTH(CURDATE())
        AND YEAR(fecha)  = YEAR(CURDATE())
      GROUP BY tipo_movimiento
    `;
    db.query(sql, (error, rows) => {
      if (error) return callback(error);

      let ingresos = 0;
      let egresos  = 0;

      for (const row of rows) {
        if (row.tipo_movimiento === 'ingreso') ingresos = parseFloat(row.total);
        if (row.tipo_movimiento === 'egreso')  egresos  = parseFloat(row.total);
      }

      const utilidad = ingresos - egresos;
      callback(null, { ingresos, egresos, utilidad });
    });
  },

  // Devuelve el total de ingresos y egresos por dia para los ultimos 7 dias (grafica semanal)
  graficaSemanal: (callback) => {
    const sql = `
      SELECT
        DATE(fecha) AS dia,
        tipo_movimiento,
        COALESCE(SUM(monto), 0) AS total
      FROM movimientos_financieros
      WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(fecha), tipo_movimiento
      ORDER BY dia ASC
    `;
    db.query(sql, callback);
  },

  // Lista todos los movimientos financieros para la tabla de reportes
  listarMovimientos: (limite, callback) => {
    const sqlLimite = parseInt(limite, 10) || 100;
    const sql = `
      SELECT *
      FROM movimientos_financieros
      ORDER BY fecha DESC
      LIMIT ?
    `;
    db.query(sql, [sqlLimite], callback);
  },

  // Registra un movimiento financiero manual (ajuste contable)
  registrarMovimientoManual: (datos, callback) => {
    const { tipo_movimiento, monto, descripcion } = datos;
    const sql = `
      INSERT INTO movimientos_financieros (tipo_movimiento, monto, descripcion)
      VALUES (?, ?, ?)
    `;
    db.query(sql, [tipo_movimiento, monto, descripcion], (error, resultado) => {
      if (error) return callback(error);
      callback(null, { id: resultado.insertId, tipo_movimiento, monto, descripcion });
    });
  }
};

module.exports = FinanzaModel;
