import { useState } from 'react';
import CompanyRegistration from './CompanyRegistration.jsx';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login({ onLogin, onMessage }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registering, setRegistering] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        onMessage(data.error || 'No fue posible iniciar sesión.');
        return;
      }
      onLogin(data);
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setSubmitting(false);
    }
  }

  if (registering) {
    return (
      <CompanyRegistration
        onMessage={onMessage}
        onCancel={() => setRegistering(false)}
        onRegistered={(registeredEmail) => {
          setEmail(registeredEmail);
          setPassword('');
          setRegistering(false);
        }}
      />
    );
  }

  return (
    <section className="card login-card" aria-labelledby="login-heading">
      <h2 id="login-heading">Iniciar sesión</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar al sistema'}
        </button>
      </form>
      <p className="hint">Acceso QA: admin@atlas.cl o editor@atlas.cl · Password123!</p>
      <button type="button" className="secondary-button register-link" onClick={() => setRegistering(true)}>
        Registrar empresa
      </button>
    </section>
  );
}
