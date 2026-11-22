const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT contratos.*
       FROM contratos
       JOIN clientes ON clientes.id = contratos.cliente_id
       WHERE clientes.empresa_id = $1 AND clientes.eliminado_logico = FALSE
       ORDER BY contratos.created_at DESC`,
      [req.user.empresa_id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al listar contratos:', error);
    return res.status(500).json({ error: 'No fue posible obtener los contratos.' });
  }
});

router.post('/:id/documentos', authMiddleware, async (req, res) => {
  const clientId = Number(req.params.id);
  const pdfUrl = req.body && req.body.pdf_url;
  if (!Number.isInteger(clientId) || clientId < 1) {
    return res.status(400).json({ error: 'El identificador del cliente no es válido.' });
  }
  if (pdfUrl !== undefined && (typeof pdfUrl !== 'string' || pdfUrl.length > 255)) {
    return res.status(400).json({ error: 'La URL del documento debe ser texto de hasta 255 caracteres.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const customerResult = await client.query(
      'SELECT id FROM clientes WHERE id = $1 AND empresa_id = $2 AND eliminado_logico = FALSE',
      [clientId, req.user.empresa_id]
    );
    if (customerResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }
    const contractResult = await client.query(
      'INSERT INTO contratos (cliente_id, titulo, monto, pdf_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [clientId, 'Contrato de Servicios Transporte', 1500000.00, pdfUrl || '/uploads/contrato_2026.pdf']
    );
    await client.query(
      'INSERT INTO auditoria_logs (usuario_id, accion, detalle) VALUES ($1, $2, $3)',
      [req.user.id, 'SUBIR_DOCUMENTO_PDF', `Documento PDF asociado al contrato ID: ${contractResult.rows[0].id}`]
    );
    await client.query('COMMIT');
    return res.status(201).json({
      mensaje: 'Documento PDF subido e integrado exitosamente',
      contrato: contractResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al registrar contrato/documento:', error);
    return res.status(500).json({ error: 'No fue posible registrar el contrato.' });
  } finally {
    client.release();
  }
});

module.exports = router;
