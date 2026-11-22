import { useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CompanyRegistration({ onMessage, onCancel, onRegistered }) {
  const [form, setForm] = useState({
    nombre: '',
    rut: '',
    direccion: '',
    correo: '',
    usuario_admin: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        onMessage(data.error || 'No fue posible registrar la empresa.');
        return;
      }
      onMessage('Empresa registrada. Ya puedes iniciar sesión con el correo del administrador.');
      onRegistered(form.correo);
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="card login-card" aria-labelledby="registration-heading">
      <h2 id="registration-heading">Registrar empresa</h2>
      <p>Se creará una cuenta con rol ADMINISTRADOR para esta empresa.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="company-name">Razón social</label>
        <input id="company-name" name="nombre" value={form.nombre} onChange={updateField} maxLength={150} required />
        <label htmlFor="company-rut">RUT de empresa</label>
        <input id="company-rut" name="rut" value={form.rut} onChange={updateField} maxLength={12} required />
        <label htmlFor="company-address">Dirección</label>
        <input id="company-address" name="direccion" value={form.direccion} onChange={updateField} maxLength={200} />
        <label htmlFor="admin-email">Correo del administrador</label>
        <input id="admin-email" type="email" name="correo" value={form.correo} onChange={updateField} maxLength={100} required />
        <label htmlFor="admin-name">Nombre del administrador</label>
        <input id="admin-name" name="usuario_admin" value={form.usuario_admin} onChange={updateField} maxLength={100} required />
        <label htmlFor="admin-password">Contraseña</label>
        <input id="admin-password" type="password" name="password" value={form.password} onChange={updateField} autoComplete="new-password" required />
        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Registrando…' : 'Crear empresa'}
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Volver al inicio de sesión
          </button>
        </div>
      </form>
    </section>
  );
}
