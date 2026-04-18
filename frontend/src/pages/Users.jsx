import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiShield, FiUser } from 'react-icons/fi';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' });
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: '', email: '', password: '', role: 'operator' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <div className="page-header">
        <h2>Usuários</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Novo Usuário</button>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Cadastrado em</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ?
                  <tr><td colSpan={4}><div className="empty-state"><p>Nenhum usuário encontrado</p></div></td></tr> :
                  users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                            {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <strong style={{ color: 'var(--text)' }}>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge badge-${u.role}`}>
                          {u.role === 'admin' ? <><FiShield style={{ fontSize: '0.65rem' }} /> Admin</> : <><FiUser style={{ fontSize: '0.65rem' }} /> Operador</>}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Usuário</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label>Nome *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome completo" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="email@exemplo.com" />
                </div>
                <div className="form-group">
                  <label>Senha *</label>
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="form-group">
                  <label>Perfil *</label>
                  <select value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Usuário</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
