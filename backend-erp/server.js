// Servidor principal de Node.js / Express para el sistema ERP
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { manejarErrores } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuracion de politicas CORS y limite de carga util JSON
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Registro de modulos de la API REST del ERP
app.use('/api/sesion', require('./routes/sesion.routes'));
app.use('/api/productos', require('./routes/producto.routes'));
app.use('/api/proveedores', require('./routes/proveedor.routes'));
app.use('/api/distribuidores', require('./routes/proveedor.routes'));
app.use('/api/compras', require('./routes/compra.routes'));
app.use('/api/ventas', require('./routes/venta.routes'));
app.use('/api/paypal', require('./routes/paypal.routes'));
app.use('/api/empleados', require('./routes/empleado.routes'));
app.use('/api/finanzas', require('./routes/finanza.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Middleware centralizado de manejo y respuesta de errores
app.use(manejarErrores);

app.listen(PORT, () => {
  console.log(`Servidor ERP ejecutandose en http://localhost:${PORT}`);
});
