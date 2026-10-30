-- ========================================================
-- BASE DE DATOS: erp
-- Modulo de compatibilidad y tablas relacionales completas
-- Para ejecutar en phpMyAdmin o MySQL de XAMPP
-- ========================================================

USE `erp`;

-- 1. Asegurar campos complementarios en la tabla existente 'productos'
ALTER TABLE `productos` 
  ADD COLUMN IF NOT EXISTS `categoria` VARCHAR(100) NOT NULL DEFAULT 'Bebidas' AFTER `descripcion`,
  ADD COLUMN IF NOT EXISTS `fecha_modificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Vista de compatibilidad para consultas en singular ('producto' y campo 'cantidad')
CREATE OR REPLACE VIEW `producto` AS 
SELECT 
  `id`, 
  `nombre`, 
  `descripcion`, 
  `categoria`, 
  `precio`, 
  `stock` AS `cantidad`, 
  `stock`, 
  `imagen`, 
  `fecha_modificacion` 
FROM `productos`;

-- 2. Tabla de Usuarios y Roles (Seguridad)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `correo` VARCHAR(150) NOT NULL UNIQUE,
  `contrasena` VARCHAR(255) NOT NULL,
  `rol` ENUM('administrador', 'empleado', 'cliente') NOT NULL DEFAULT 'cliente',
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuarios predeterminados para inicio de sesion y pruebas
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `contrasena`, `rol`) VALUES
(1, 'Administrador ERP', 'admin@cafeteria.com', 'admin123', 'administrador'),
(2, 'Barista Personal', 'barista@cafeteria.com', 'barista123', 'empleado'),
(3, 'Cliente General', 'cliente@cafeteria.com', 'cliente123', 'cliente')
ON DUPLICATE KEY UPDATE `correo` = `correo`;

-- Vistas de compatibilidad para consultas directas por rol
CREATE OR REPLACE VIEW `administrador` AS 
SELECT `id`, `correo`, `contrasena` FROM `usuarios` WHERE `rol` = 'administrador';

CREATE OR REPLACE VIEW `cliente` AS 
SELECT `id`, `correo`, `contrasena` FROM `usuarios` WHERE `rol` = 'cliente';

-- 3. Tabla de Proveedores (Compras y Distribuidores)
CREATE TABLE IF NOT EXISTS `proveedores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `contacto` VARCHAR(100) DEFAULT NULL,
  `telefono` VARCHAR(50) DEFAULT NULL,
  `correo` VARCHAR(150) DEFAULT NULL,
  `direccion` TEXT DEFAULT NULL,
  `fecha_registro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista para mantener compatibilidad con modulo de distribuidores
CREATE OR REPLACE VIEW `distribuidor` AS 
SELECT `id`, `nombre` FROM `proveedores`;

-- Insercion de proveedores iniciales
INSERT INTO `proveedores` (`nombre`, `contacto`, `telefono`, `correo`, `direccion`) VALUES
('Distribuidora Cafe Chiapas', 'Carlos Perez', '555-102-3040', 'ventas@chiapascafe.com', 'Av. Central 123, Chiapas'),
('Lacteos del Centro', 'Mariana Lopez', '555-908-1122', 'pedidos@lacteoscentro.com', 'Carretera Industrial km 4'),
('Insumos y Desechables MX', 'Roberto Garza', '555-432-8877', 'contacto@insumosmx.com', 'Parque Logistico Norte')
ON DUPLICATE KEY UPDATE `nombre` = `nombre`;

-- 4. Tabla de Compras
CREATE TABLE IF NOT EXISTS `compras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folio` VARCHAR(50) NOT NULL UNIQUE,
  `proveedor_id` INT NOT NULL,
  `usuario_id` INT NULL,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `estado` VARCHAR(50) NOT NULL DEFAULT 'Completada',
  `observaciones` TEXT NULL,
  CONSTRAINT `fk_compras_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_compras_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla Detalle de Compras
CREATE TABLE IF NOT EXISTS `detalle_compras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `compra_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_detcompras_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detcompras_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Ventas
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folio` VARCHAR(50) NOT NULL UNIQUE,
  `cliente_id` INT NULL,
  `nombre_cliente` VARCHAR(150) NOT NULL DEFAULT 'Publico general',
  `correo_cliente` VARCHAR(150) DEFAULT NULL,
  `rfc_cliente` VARCHAR(20) DEFAULT 'XAXX010101000',
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `iva` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `metodo_pago` VARCHAR(50) DEFAULT 'Efectivo',
  `referencia_pago` VARCHAR(100) DEFAULT NULL,
  `canal` VARCHAR(50) DEFAULT 'Local',
  `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `estado` VARCHAR(50) DEFAULT 'Completada',
  CONSTRAINT `fk_ventas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla Detalle de Ventas
CREATE TABLE IF NOT EXISTS `detalle_ventas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `venta_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `cantidad` INT NOT NULL,
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_detventas_compra` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detventas_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabla de Facturas Fiscales (CFDI 4.0 XML)
CREATE TABLE IF NOT EXISTS `facturas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `folio` VARCHAR(50) NOT NULL,
  `venta_id` INT NULL,
  `cliente_id` INT NULL,
  `orden_paypal_id` VARCHAR(100) DEFAULT NULL,
  `uuid_sat` VARCHAR(100) DEFAULT NULL,
  `fecha_emision` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `archivo_xml` LONGTEXT NOT NULL,
  `estado` VARCHAR(50) DEFAULT 'Facturada',
  CONSTRAINT `fk_facturas_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_facturas_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista para mantener compatibilidad con consultas a tabla singular 'factura'
CREATE OR REPLACE VIEW `factura` AS 
SELECT 
  `id`, 
  `venta_id`, 
  `cliente_id`, 
  `orden_paypal_id`, 
  `fecha_emision`, 
  `archivo_xml` 
FROM `facturas`;

-- 9. Tabla de Empleados (Recursos Humanos)
CREATE TABLE IF NOT EXISTS `empleados` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombre` VARCHAR(150) NOT NULL,
  `puesto` VARCHAR(100) NOT NULL,
  `horario` VARCHAR(100) NOT NULL,
  `salario_base` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `usuario_id` INT NULL,
  `fecha_ingreso` DATE DEFAULT (CURRENT_DATE),
  `activo` TINYINT(1) DEFAULT 1,
  CONSTRAINT `fk_empleados_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vista de compatibilidad para consultas a 'empleado'
CREATE OR REPLACE VIEW `empleado` AS 
SELECT 
  `id`, 
  `nombre`, 
  `puesto`, 
  `horario`, 
  `usuario_id` AS `administrador_id` 
FROM `empleados`;

-- 10. Tabla de Asistencias (RRHH)
CREATE TABLE IF NOT EXISTS `asistencias` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `empleado_id` INT NOT NULL,
  `fecha` DATE NOT NULL,
  `hora_entrada` TIME DEFAULT NULL,
  `hora_salida` TIME DEFAULT NULL,
  `estado` VARCHAR(50) DEFAULT 'Asistencia',
  CONSTRAINT `fk_asistencias_empleado` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW `asistencia` AS 
SELECT `id`, `empleado_id`, `fecha`, `hora_entrada`, `hora_salida`, `estado` FROM `asistencias`;

-- 11. Tabla de Nominas (RRHH)
CREATE TABLE IF NOT EXISTS `nominas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `empleado_id` INT NOT NULL,
  `periodo` VARCHAR(100) NOT NULL,
  `monto_a_pagar` DECIMAL(10,2) NOT NULL,
  `fecha_pago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_nominas_empleado` FOREIGN KEY (`empleado_id`) REFERENCES `empleados`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW `nomina` AS 
SELECT `id`, `empleado_id`, `periodo`, `monto_a_pagar` FROM `nominas`;

-- 12. Tabla de Movimientos Financieros (Finanzas y Contabilidad)
CREATE TABLE IF NOT EXISTS `movimientos_financieros` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo_movimiento` ENUM('ingreso', 'egreso') NOT NULL,
  `monto` DECIMAL(10,2) NOT NULL,
  `fecha` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `descripcion` VARCHAR(255) NOT NULL,
  `referencia_paypal` VARCHAR(100) DEFAULT NULL,
  `venta_id` INT NULL,
  `compra_id` INT NULL,
  `nomina_id` INT NULL,
  CONSTRAINT `fk_movfin_venta` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_movfin_compra` FOREIGN KEY (`compra_id`) REFERENCES `compras`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_movfin_nomina` FOREIGN KEY (`nomina_id`) REFERENCES `nominas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW `movimiento_financiero` AS 
SELECT 
  `id`, 
  `tipo_movimiento`, 
  `monto`, 
  `fecha`, 
  `descripcion`, 
  `referencia_paypal`, 
  `nomina_id` 
FROM `movimientos_financieros`;
