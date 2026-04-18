import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiHome, FiTruck, FiUsers, FiMap, FiTool, FiDroplet, FiLogOut, FiShield } from 'react-icons/fi';

const mainNav = [
  { to: '/', icon: <FiHome />, label: 'Dashboard', end: true },
  { to: '/vehicles', icon: <FiTruck />, label: 'Veículos' },
  { to: '/drivers', icon: <FiUsers />, label: 'Motoristas' },
  { to: '/trips', icon: <FiMap />, label: 'Viagens' },
  { to: '/maintenance', icon: <FiTool />, label: 'Manutenções' },
  { to: '/fuel', icon: <FiDroplet />, label: 'Combustível' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>SMARTFLEET</h1>
          <small>Gestão de Frotas</small>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Principal</div>
          {mainNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => isActive ? 'active' : ''}>
              {item.icon} {item.label}
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-section-label">Administração</div>
              <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
                <FiShield /> Usuários
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</div>
            </div>
            <button className="btn-logout" onClick={logout} title="Sair">
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
