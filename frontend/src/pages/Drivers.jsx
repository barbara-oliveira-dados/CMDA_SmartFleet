import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const statusLabels = { available: 'Disponível', on_trip: 'Em Viagem', inactive: 'Inativo' };
const emptyForm = { name: '', cnh: '', cnh_category: 'B', cnh_expiry: '', phone: '', email: '' };

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/drivers').then(r => setDrivers(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name, cnh: d.cnh, cnh_category: d.cnh_category || 'B', cnh_expiry: d.cnh_expiry?.split('T')[0] || '', phone: d.phone || '', email: d.email || '', status: d.status });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/drivers/${editing.id}`, form);
      } else {
        await api.post('/drivers', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este motorista?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <div className="page-header">
        <h2>Motoristas</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Novo Motorista</button>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Nome</th><th>CNH</th><th>Categoria</th><th>Validade CNH</th><th>Telefone</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {drivers.length === 0 ?
                  <tr><td colSpan={7}><div className="empty-state"><p>Nenhum motorista encontrado</p></div></td></tr> :
                  drivers.map(d => (
                    <tr key={d.id}>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.cnh}</td>
                      <td>{d.cnh_category}</td>
                      <td>{d.cnh_expiry ? new Date(d.cnh_expiry).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{d.phone || '-'}</td>
                      <td><span className={`badge badge-${d.status}`}>{statusLabels[d.status]}</span></td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}><FiEdit2 /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d.id)}><FiTrash2 /></button>
                        </div>
                      </td>
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
              <h3>{editing ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label>Nome *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>CNH *</label>
                    <input value={form.cnh} onChange={e => set('cnh', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Categoria</label>
                    <select value={form.cnh_category} onChange={e => set('cnh_category', e.target.value)}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Validade da CNH *</label>
                  <input type="date" value={form.cnh_expiry} onChange={e => set('cnh_expiry', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Telefone</label>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>
                {editing && (
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e => set('status', e.target.value)}>
                      <option value="available">Disponível</option>
                      <option value="on_trip">Em Viagem</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
