import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiPlay, FiCheck, FiEdit2, FiTrash2 } from 'react-icons/fi';

const statusLabels = { scheduled: 'Agendada', in_progress: 'Em Andamento', completed: 'Concluída' };
const typeLabels = { preventive: 'Preventiva', corrective: 'Corretiva', inspection: 'Inspeção' };

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    Promise.all([
      api.get('/maintenance', { params }),
      api.get('/vehicles')
    ]).then(([m, v]) => {
      setRecords(m.data);
      setVehicles(v.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openNew = () => {
    setEditing(null);
    setForm({ vehicle_id: '', type: 'preventive', description: '', scheduled_date: '', cost: '', mileage_at_service: '', provider: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      vehicle_id: m.vehicle_id, type: m.type, description: m.description,
      scheduled_date: m.scheduled_date?.split('T')[0] || '', cost: m.cost || '',
      mileage_at_service: m.mileage_at_service || '', provider: m.provider || '', status: m.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/maintenance/${editing.id}`, form);
      } else {
        await api.post('/maintenance', form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleStart = async (id) => {
    try {
      await api.patch(`/maintenance/${id}/start`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleComplete = async (id) => {
    try {
      await api.patch(`/maintenance/${id}/complete`, { completed_date: new Date().toISOString().split('T')[0] });
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta manutenção?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <div className="page-header">
        <h2>Manutenções</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Nova Manutenção</button>
      </div>

      <div className="toolbar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="scheduled">Agendada</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Veículo</th><th>Tipo</th><th>Descrição</th><th>Data Agendada</th><th>Custo</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {records.length === 0 ?
                  <tr><td colSpan={7}><div className="empty-state"><p>Nenhuma manutenção encontrada</p></div></td></tr> :
                  records.map(m => (
                    <tr key={m.id}>
                      <td><strong>{m.plate}</strong><br/><small style={{color:'#999'}}>{m.vehicle_brand} {m.vehicle_model}</small></td>
                      <td>{typeLabels[m.type] || m.type}</td>
                      <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.description}</td>
                      <td>{new Date(m.scheduled_date).toLocaleDateString('pt-BR')}</td>
                      <td>{m.cost ? `R$ ${Number(m.cost).toFixed(2)}` : '-'}</td>
                      <td><span className={`badge badge-${m.status}`}>{statusLabels[m.status]}</span></td>
                      <td>
                        <div className="btn-group">
                          {m.status === 'scheduled' && <button className="btn btn-success btn-sm" onClick={() => handleStart(m.id)} title="Iniciar"><FiPlay /></button>}
                          {m.status === 'in_progress' && <button className="btn btn-primary btn-sm" onClick={() => handleComplete(m.id)} title="Concluir"><FiCheck /></button>}
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}><FiEdit2 /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id)}><FiTrash2 /></button>
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
              <h3>{editing ? 'Editar Manutenção' : 'Nova Manutenção'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Veículo *</label>
                    <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} required disabled={!!editing}>
                      <option value="">Selecione...</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="preventive">Preventiva</option>
                      <option value="corrective">Corretiva</option>
                      <option value="inspection">Inspeção</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descrição *</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data Agendada *</label>
                    <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Custo (R$)</label>
                    <input type="number" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Km no Serviço</label>
                    <input type="number" value={form.mileage_at_service} onChange={e => set('mileage_at_service', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Fornecedor</label>
                    <input value={form.provider} onChange={e => set('provider', e.target.value)} />
                  </div>
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
