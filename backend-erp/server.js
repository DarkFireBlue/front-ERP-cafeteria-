const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const productoRoutes = require('./routes/producto.routes');
app.use('/api/productos', productoRoutes);

app.listen(3000, () => {
  console.log('Servidor ejecutándose en http://localhost:3000');
});
