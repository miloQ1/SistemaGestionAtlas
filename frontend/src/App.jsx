import { useState } from 'react';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

const initialUser = () => {
  const token = localStorage.getItem('token');
  const rol = localStorage.getItem('rol');
  const nombre = localStorage.getItem('nombre');
  return token && rol ? { token, rol, nombre: nombre || '' } : null;
};

export default function App() {
  const [user, setUser] = useState(initialUser);
  const [mensaje, setMensaje] = useState('');

  function handleLogin(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('rol', data.usuario.rol);
    localStorage.setItem('nombre', data.usuario.nombre);
    setUser({ token: data.token, rol: data.usuario.rol, nombre: data.usuario.nombre });
    setMensaje('Inicio de sesión exitoso.');
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('nombre');
    setUser(null);
    setMensaje('Sesión cerrada.');
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <h1>Sistema de Gestión Atlas</h1>
        <p>Gestión segura de clientes y contratos</p>
      </header>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} onMessage={setMensaje} />
      ) : (
        <Login onLogin={handleLogin} onMessage={setMensaje} />
      )}
      {mensaje && <p className="notice" role="status" aria-live="polite">{mensaje}</p>}
    </main>
  );
}
