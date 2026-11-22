const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

const router = express.Router();

router.get('/', authMiddleware, rbacMiddleware(['ADMINISTRADOR']), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT auditoria_logs.*
       FROM auditoria_logs
       JOIN usuarios ON usuarios.id = auditoria_logs.usuario_id
       WHERE usuarios.empresa_id = $1
       ORDER BY auditoria_logs.timestamp DESC
       LIMIT 50`,
      [req.user.empresa_id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al consultar auditoría:', error);
    return res.status(500).json({ error: 'No fue posible obtener los registros de auditoría.' });
  }
});

module.exports = router;
