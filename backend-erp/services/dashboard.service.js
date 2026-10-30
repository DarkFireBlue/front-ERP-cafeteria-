// Servicio de agregacion de metricas para el panel principal (Dashboard)
const db = require('../config/db');

function obtenerResumenDashboard(callback) {
  const resultado = {};
  let pendientes = 5;
  let huboError = false;

  function terminarUno(error) {
    if (huboError) return;
    if (error) {
      huboError = true;
      callback(error, null);
      return;
    }
    pendientes -= 1;
    if (pendientes === 0) {
      const finanzasIngresos = Number(resultado.finanzas?.ingresosMes || 0).toFixed(2);
      const ventasTotal = Number(resultado.ventas?.totalDia || 0).toFixed(2);

      callback(null, {
        finanzas: {
          ingresosMes: `$${finanzasIngresos}`,
          reportes: `${resultado.finanzas?.totalReportes || 0} reg.`
        },
        inventario: {
          productos: `${resultado.inventario?.totalProductos || 0} items`,
          stockBajo: `${resultado.inventario?.stockBajo || 0} criticos`
        },
        ventas: {
          ventasHoy: `${resultado.ventas?.ventasHoy || 0} ordenes`,
          totalDia: `$${ventasTotal}`
        },
        compras: {
          proveedores: `${resultado.compras?.totalProveedores || 0} activos`,
          ordenes: `${resultado.compras?.totalCompras || 0} ordenes`
        },
        rh: {
          empleados: `${resultado.rh?.empleados || 0} empleados`,
          turnosHoy: `${resultado.rh?.turnosHoy || 0} turnos`
        }
      });
    }
  }

  // 1. Finanzas: ingresos del mes y cantidad de reportes
  db.query(
    `SELECT 
      COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresosMes,
      COUNT(*) AS totalReportes
     FROM movimientos_financieros
     WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())`,
    (error, filas) => {
      if (error) return terminarUno(error);
      resultado.finanzas = filas[0] || {};
      terminarUno(null);
    }
  );

  // 2. Inventario: productos totales y stock menor a 10 unidades
  db.query(
    'SELECT COUNT(*) AS totalProductos, COALESCE(SUM(CASE WHEN stock < 10 THEN 1 ELSE 0 END), 0) AS stockBajo FROM productos',
    (error, filas) => {
      if (error) return terminarUno(error);
      resultado.inventario = filas[0] || {};
      terminarUno(null);
    }
  );

  // 3. Ventas: ventas de hoy y recaudacion del dia
  db.query(
    `SELECT 
      COUNT(*) AS ventasHoy, 
      COALESCE(SUM(monto), 0) AS totalDia
     FROM movimientos_financieros
     WHERE tipo_movimiento = 'ingreso' AND DATE(fecha) = CURDATE()`,
    (error, filas) => {
      if (error) return terminarUno(error);
      resultado.ventas = filas[0] || {};
      terminarUno(null);
    }
  );

  // 4. Compras y Proveedores: total de proveedores registrados y ordenes de compra
  db.query(
    `SELECT 
      (SELECT COUNT(*) FROM proveedores) AS totalProveedores,
      (SELECT COUNT(*) FROM compras) AS totalCompras`,
    (error, filas) => {
      if (error) return terminarUno(error);
      resultado.compras = filas[0] || {};
      terminarUno(null);
    }
  );

  // 5. Recursos Humanos: cantidad de empleados y asistencias registradas hoy
  db.query(
    `SELECT 
      (SELECT COUNT(*) FROM empleados WHERE activo = 1) AS empleados,
      (SELECT COUNT(*) FROM asistencias WHERE fecha = CURDATE()) AS turnosHoy`,
    (error, filas) => {
      if (error) return terminarUno(error);
      resultado.rh = filas[0] || {};
      terminarUno(null);
    }
  );
}

module.exports = {
  obtenerResumenDashboard
};
