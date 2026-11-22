import { useCallback, useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Clientes({ user, onMessage }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rut: '', razon_social: '', banco: '', cuenta: '' });

  const loadClientes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/clientes`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        onMessage(data.error || 'No fue posible cargar los clientes.');
        return;
      }
      setClientes(data);
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setLoading(false);
    }
  }, [onMessage, user.token]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function createCliente(event) {
    event.preventDefault();
    setSubmitting(true);
    const datosBancarios = form.banco.trim() || form.cuenta.trim()
      ? { banco: form.banco.trim(), cuenta: form.cuenta.trim() }
      : null;
    try {
      const response = await fetch(`${apiUrl}/api/clientes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rut: form.rut,
          razon_social: form.razon_social,
          datos_bancarios: datosBancarios,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        onMessage(data.error || 'No fue posible crear el cliente.');
        return;
      }
      setForm({ rut: '', razon_social: '', banco: '', cuenta: '' });
      onMessage(`Cliente ${data.razon_social} creado correctamente.`);
      await loadClientes();
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCliente(id) {
    try {
      const response = await fetch(`${apiUrl}/api/clientes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.status === 403) {
        onMessage(`[EVIDENCIA RBAC] HTTP 403 Forbidden: ${data.error}`);
        return;
      }
      if (!response.ok) {
        onMessage(data.error || 'No fue posible eliminar el cliente.');
        return;
      }
      onMessage(data.mensaje);
      await loadClientes();
    } catch (error) {
      onMessage('Error al ejecutar la solicitud de eliminación.');
    }
  }

  return (
    <section className="card" aria-labelledby="clients-heading">
      <div className="section-heading">
        <div>
          <h2 id="clients-heading">Clientes</h2>
          <p>Prueba RBAC CP-SEG-01: la eliminación está reservada al administrador.</p>
        </div>
        <button type="button" className="secondary-button" onClick={loadClientes} disabled={loading}>
          Actualizar lista
        </button>
      </div>
      <form className="inline-form customer-form" onSubmit={createCliente}>
        <label htmlFor="customer-name">Razón social</label>
        <input
          id="customer-name"
          name="razon_social"
          value={form.razon_social}
          onChange={updateField}
          maxLength={150}
          required
        />
        <label htmlFor="customer-rut">RUT</label>
        <input
          id="customer-rut"
          name="rut"
          value={form.rut}
          onChange={updateField}
          maxLength={12}
          required
        />
        <label htmlFor="customer-bank">Banco (opcional)</label>
        <input id="customer-bank" name="banco" value={form.banco} onChange={updateField} />
        <label htmlFor="customer-account">Cuenta (opcional)</label>
        <input id="customer-account" name="cuenta" value={form.cuenta} onChange={updateField} />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Crear cliente'}
        </button>
      </form>
      {loading ? (
        <p role="status">Cargando clientes…</p>
      ) : clientes.length === 0 ? (
        <p>No hay clientes disponibles.</p>
      ) : (
        <ul className="client-list">
          {clientes.map((cliente) => (
            <li key={cliente.id}>
              <div>
                <strong>{cliente.razon_social}</strong>
                <span>RUT: {cliente.rut} · ID: {cliente.id}</span>
              </div>
              <button
                type="button"
                className="danger-button"
                onClick={() => deleteCliente(cliente.id)}
                aria-label={`Intentar eliminar a ${cliente.razon_social}`}
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
