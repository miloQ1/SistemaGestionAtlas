const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { nombre, rut, direccion, correo, usuario_admin, password } = req.body || {};
  if (![nombre, rut, correo, usuario_admin, password].every((value) => typeof value === 'string' && value.trim())) {
    return res.status(400).json({
      error: 'Nombre, RUT, correo, usuario administrador y contraseña son obligatorios.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const empResult = await client.query(
      'INSERT INTO empresas (nombre, rut, direccion, correo) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre.trim(), rut.trim(), direccion ? direccion.trim() : null, correo.trim()]
    );
    const empresa = empResult.rows[0];
    const hashedPassword = await bcrypt.hash(password, 10);
    const usrResult = await client.query(
      'INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
      [empresa.id, usuario_admin.trim(), correo.trim(), hashedPassword, 'ADMINISTRADOR']
    );
    await client.query('COMMIT');
    return res.status(201).json({
      mensaje: 'Empresa y usuario administrador creados exitosamente',
      empresa,
      usuario: usrResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear empresa:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El RUT de empresa o correo ya se encuentra registrado.' });
    }
    return res.status(500).json({ error: 'No fue posible crear la empresa.' });
  } finally {
    client.release();
  }
});

module.exports = router;
