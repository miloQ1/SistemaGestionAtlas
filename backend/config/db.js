const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'atlas_admin',
  password: process.env.DB_PASSWORD || 'AtlasSecretPassword2026!',
  database: process.env.DB_NAME || 'atlas_db',
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error);
});

module.exports = pool;
