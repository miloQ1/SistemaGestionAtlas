require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const empresasRoutes = require('./routes/empresas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const contratosRoutes = require('./routes/contratos.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok' });
  } catch (error) {
    console.error('Health check de base de datos fallido:', error);
    return res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/auditoria', auditoriaRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((error, req, res, next) => {
  console.error('Error inesperado en la API:', error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
});

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => {
  console.log(`Servidor Atlas ejecutándose en puerto ${port}`);
});

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
