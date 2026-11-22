const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { rut, razon_social, datos_bancarios } = req.body || {};
  if (typeof rut !== 'string' || !rut.trim() || rut.trim().length > 12) {
    return res.status(400).json({ error: 'El RUT del cliente es obligatorio y debe tener hasta 12 caracteres.' });
  }
  if (typeof razon_social !== 'string' || !razon_social.trim() || razon_social.trim().length > 150) {
    return res.status(400).json({ error: 'La razón social es obligatoria y debe tener hasta 150 caracteres.' });
  }
  if (datos_bancarios !== undefined && datos_bancarios !== null
    && (typeof datos_bancarios !== 'object' || Array.isArray(datos_bancarios))) {
    return res.status(400).json({ error: 'Los datos bancarios deben enviarse como un objeto.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO clientes (empresa_id, rut, razon_social, datos_bancarios)
       VALUES ($1, $2, $3, $4)
       RETURNING id, empresa_id, rut, razon_social, datos_bancarios, created_at`,
      [req.user.empresa_id, rut.trim(), razon_social.trim(), datos_bancarios || null]
    );
    await client.query(
      'INSERT INTO auditoria_logs (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [req.user.id, 'CREAR_CLIENTE', `Creación de cliente ID: ${result.rows[0].id}`]
    );
    await client.query('COMMIT');
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear cliente:', error);
    return res.status(500).json({ error: 'No fue posible crear el cliente.' });
  } finally {
    client.release();
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, empresa_id, rut, razon_social, datos_bancarios, created_at FROM clientes WHERE eliminado_logico = FALSE AND empresa_id = $1 ORDER BY id',
      [req.user.empresa_id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    return res.status(500).json({ error: 'No fue posible obtener los clientes.' });
  }
});

router.delete('/:id', authMiddleware, rbacMiddleware(['ADMINISTRADOR']), async (req, res) => {
  const clientId = Number(req.params.id);
  if (!Number.isInteger(clientId) || clientId < 1) {
    return res.status(400).json({ error: 'El identificador del cliente no es válido.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE clientes SET eliminado_logico = TRUE WHERE id = $1 AND empresa_id = $2 AND eliminado_logico = FALSE RETURNING id',
      [clientId, req.user.empresa_id]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    await client.query(
      'INSERT INTO auditoria_logs (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [req.user.id, 'ELIMINAR_CLIENTE', `Eliminación lógica de cliente ID: ${clientId}`]
    );
    await client.query('COMMIT');
    return res.json({ mensaje: `Cliente con ID ${clientId} eliminado lógicamente con éxito.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar cliente:', error);
    return res.status(500).json({ error: 'No fue posible eliminar el cliente.' });
  } finally {
    client.release();
  }
});

module.exports = router;
