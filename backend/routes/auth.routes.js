const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: 'Correo electrónico y contraseña son obligatorios.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, empresa_id, nombre, email, password_hash, rol FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol, empresa_id: user.empresa_id },
      process.env.JWT_SECRET || 'JWT_Secret_Atlas_ISY1102_2026_Key!',
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      usuario: { id: user.id, nombre: user.nombre, rol: user.rol },
    });
  } catch (error) {
    console.error('Error al autenticar usuario:', error);
    return res.status(500).json({ error: 'No fue posible iniciar sesión.' });
  }
});

module.exports = router;
