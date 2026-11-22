import { useState } from 'react';
import Auditoria from './Auditoria.jsx';
import Clientes from './Clientes.jsx';
import Contratos from './Contratos.jsx';

export default function Dashboard({ user, onLogout, onMessage }) {
  const [section, setSection] = useState('clientes');

  return (
    <section className="dashboard">
      <div className="card dashboard-heading">
        <div>
          <h2>Panel de control</h2>
          <p>Sesión: {user.nombre} · Rol activo: <strong>{user.rol}</strong></p>
        </div>
        <button type="button" className="secondary-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
      <nav className="section-nav" aria-label="Secciones del sistema">
        <button type="button" className={section === 'clientes' ? 'nav-button active' : 'nav-button'} aria-current={section === 'clientes' ? 'page' : undefined} onClick={() => setSection('clientes')}>
          Clientes
        </button>
        <button type="button" className={section === 'contratos' ? 'nav-button active' : 'nav-button'} aria-current={section === 'contratos' ? 'page' : undefined} onClick={() => setSection('contratos')}>
          Contratos
        </button>
        {user.rol === 'ADMINISTRADOR' && (
          <button type="button" className={section === 'auditoria' ? 'nav-button active' : 'nav-button'} aria-current={section === 'auditoria' ? 'page' : undefined} onClick={() => setSection('auditoria')}>
            Auditoría
          </button>
        )}
      </nav>
      {section === 'clientes' && <Clientes user={user} onMessage={onMessage} />}
      {section === 'contratos' && <Contratos user={user} onMessage={onMessage} />}
      {section === 'auditoria' && user.rol === 'ADMINISTRADOR' && <Auditoria user={user} onMessage={onMessage} />}
    </section>
  );
}
