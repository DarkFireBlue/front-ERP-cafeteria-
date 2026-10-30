// Servicio para balance contable, ingresos, egresos, graficas y reportes financieros
const db = require('../config/db');

// Obtiene el balance mensual consolidado (ingresos, egresos y utilidad neta)
function obtenerResumen(callback) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresosMes,
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' THEN monto ELSE 0 END), 0) AS egresosMes
    FROM movimientos_financieros
    WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
  `;

  db.query(sql, (error, filas) => {
    if (error) {
      // Fallback a vista movimiento_financiero
      return db.query(
        "SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresosMes, COALESCE(SUM(CASE WHEN tipo_movimiento = 'egreso' THEN monto ELSE 0 END), 0) AS egresosMes FROM movimiento_financiero WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())",
        (errFallback, filasFallback) => {
          if (errFallback) return callback(error, null);
          procesarResumen(filasFallback, callback);
        }
      );
    }
    procesarResumen(filas, callback);
  });
}

function procesarResumen(filas, callback) {
  const ingresos = Number(filas[0]?.ingresosMes || 0);
  const egresos = Number(filas[0]?.egresosMes || 0);
  const utilidad = ingresos - egresos;

  callback(null, {
    ingresosMes: `$${ingresos.toFixed(2)}`,
    egresosMes: `$${egresos.toFixed(2)}`,
    utilidadNeta: `$${utilidad.toFixed(2)}`
  });
}

// Obtiene los datos agrupados por semana para el grafico de barras
function obtenerGraficaSemanal(callback) {
  const sql = `
    SELECT 
      WEEK(fecha) - WEEK(DATE_SUB(fecha, INTERVAL DAYOFMONTH(fecha) - 1 DAY)) + 1 AS semana,
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END), 0) AS neto
    FROM movimientos_financieros
    WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    GROUP BY semana
    ORDER BY semana
  `;

  db.query(sql, (error, filas) => {
    if (error) {
      return db.query(
        "SELECT WEEK(fecha) - WEEK(DATE_SUB(fecha, INTERVAL DAYOFMONTH(fecha) - 1 DAY)) + 1 AS semana, COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END), 0) AS neto FROM movimiento_financiero WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE()) GROUP BY semana ORDER BY semana",
        (errFallback, filasFallback) => {
          if (errFallback) return callback(error, null);
          procesarGrafica(filasFallback, callback);
        }
      );
    }
    procesarGrafica(filas, callback);
  });
}

function procesarGrafica(filas, callback) {
  if (!filas || filas.length === 0) {
    return callback(null, [
      { semana: 'Sem 1', porcentajeAltura: 15 },
      { semana: 'Sem 2', porcentajeAltura: 25 },
      { semana: 'Sem 3', porcentajeAltura: 20 },
      { semana: 'Sem 4', porcentajeAltura: 30 }
    ]);
  }

  const maximo = Math.max(1, ...filas.map((r) => Math.abs(Number(r.neto || 0))));
  const grafica = filas.map((r) => {
    const valor = Math.abs(Number(r.neto || 0));
    const altura = Math.max(5, Math.round((valor / maximo) * 100));
    return {
      semana: `Sem ${r.semana}`,
      porcentajeAltura: altura
    };
  });

  callback(null, grafica);
}

// Obtiene los movimientos contables recientes para la tabla de reportes
function obtenerReportes(callback) {
  const sql = `
    SELECT id, tipo_movimiento, monto, fecha, descripcion
    FROM movimientos_financieros
    ORDER BY fecha DESC
    LIMIT 25
  `;

  db.query(sql, (error, filas) => {
    if (error) {
      return db.query('SELECT * FROM movimiento_financiero ORDER BY fecha DESC LIMIT 25', (errFallback, filasFallback) => {
        if (errFallback) return callback(error, null);
        procesarReportes(filasFallback, callback);
      });
    }
    procesarReportes(filas, callback);
  });
}

function procesarReportes(filas, callback) {
  const reportes = filas.map((r) => ({
    id: r.id,
    nombre: r.descripcion || (r.tipo_movimiento === 'ingreso' ? 'Ingreso comercial' : 'Gasto operativo'),
    periodo: new Date(r.fecha).toLocaleDateString(),
    fecha: new Date(r.fecha).toLocaleDateString(),
    formato: 'Excel (XLS)',
    monto: `$${Number(r.monto).toFixed(2)}`,
    tipo: r.tipo_movimiento
  }));

  callback(null, reportes);
}

// Registra un movimiento financiero manual
function registrarMovimiento(movimiento, callback) {
  const { tipo_movimiento, monto, descripcion } = movimiento;
  const sql = 'INSERT INTO movimientos_financieros (tipo_movimiento, monto, fecha, descripcion) VALUES (?, ?, NOW(), ?)';

  db.query(sql, [tipo_movimiento, Number(monto || 0), descripcion], callback);
}

module.exports = {
  obtenerResumen,
  obtenerGraficaSemanal,
  obtenerReportes,
  registrarMovimiento
};
