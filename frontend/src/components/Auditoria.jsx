import { useCallback, useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const actionLabels = {
  CREAR_CLIENTE: 'Creó un cliente',
  ELIMINAR_CLIENTE: 'Eliminó un cliente',
  SUBIR_DOCUMENTO_PDF: 'Guardó un documento PDF',
};

function formatAction(action) {
  if (actionLabels[action]) {
    return actionLabels[action];
  }
  return action
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Auditoria({ user, onMessage }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auditoria`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        onMessage(data.error || 'No fue posible cargar la auditoría.');
        return;
      }
      setLogs(data);
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setLoading(false);
    }
  }, [onMessage, user.token]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <section className="card" aria-labelledby="audit-heading">
      <div className="section-heading">
        <div>
          <h2 id="audit-heading">Auditoría</h2>
          <p>Últimas 50 acciones registradas para tu empresa.</p>
        </div>
        <button type="button" className="secondary-button" onClick={loadLogs} disabled={loading}>
          Actualizar
        </button>
      </div>
      {loading ? <p role="status">Cargando auditoría…</p> : logs.length === 0 ? (
        <p>No hay acciones registradas todavía.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption>Registro de auditoría</caption>
            <thead>
              <tr><th scope="col">Fecha</th><th scope="col">Usuario ID</th><th scope="col">Acción</th><th scope="col">Detalle</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString('es-CL')}</td>
                  <td>{log.usuario_id}</td>
                  <td>{formatAction(log.accion)}</td>
                  <td>{log.detalle || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
