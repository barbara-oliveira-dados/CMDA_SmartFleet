import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

const statusLabels = { available: 'Disponível', in_use: 'Em Uso', maintenance: 'Manutenção', inactive: 'Inativo' };
const emptyForm = { plate: '', brand: '', model: '', year: '', color: '', fuel_type: 'flex', mileage: '', status: 'available' };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (search) params.search = search;
    api.get('/vehicles', { params }).then(r => setVehicles(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus, search]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ plate: v.plate, brand: v.brand || '', model: v.model || '', year: v.year || '', color: v.color || '', fuel_type: v.fuel_type || 'flex', mileage: v.mileage || '', status: v.status });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/vehicles/${editing.id}`, form);
      } else {
        await api.post('/vehicles', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este veículo?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <div className="page-header">
        <h2>Veículos</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Novo Veículo</button>
      </div>

      <div className="toolbar">
        <input placeholder="Buscar por placa, modelo..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="available">Disponível</option>
          <option value="in_use">Em Uso</option>
          <option value="maintenance">Manutenção</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Ano</th><th>Km</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ?
                  <tr><td colSpan={7}><div className="empty-state"><p>Nenhum veículo encontrado</p></div></td></tr> :
                  vehicles.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.plate}</strong></td>
                      <td>{v.brand}</td>
                      <td>{v.model}</td>
                      <td>{v.year}</td>
                      <td>{v.mileage ? Number(v.mileage).toLocaleString('pt-BR') : '-'}</td>
                      <td><span className={`badge badge-${v.status}`}>{statusLabels[v.status]}</span></td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}><FiEdit2 /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id)}><FiTrash2 /></button>
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
              <h3>{editing ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Placa *</label>
                    <input value={form.plate} onChange={e => set('plate', e.target.value)} required placeholder="ABC-1234" />
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Toyota" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Modelo</label>
                    <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="Hilux" />
                  </div>
                  <div className="form-group">
                    <label>Ano</label>
                    <input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2024" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Cor</label>
                    <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Branco" />
                  </div>
                  <div className="form-group">
                    <label>Combustível</label>
                    <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                      <option value="flex">Flex</option>
                      <option value="gasoline">Gasolina</option>
                      <option value="ethanol">Etanol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Elétrico</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quilometragem</label>
                    <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="0" />
                  </div>
                  {editing && (
                    <div className="form-group">
                      <label>Status</label>
                      <select value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="available">Disponível</option>
                        <option value="in_use">Em Uso</option>
                        <option value="maintenance">Manutenção</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  )}
                </div>
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
