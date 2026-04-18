import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiPlay, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';

const statusLabels = { scheduled: 'Agendada', in_progress: 'Em Andamento', completed: 'Concluída', cancelled: 'Cancelada' };

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [form, setForm] = useState({});
  const [completeForm, setCompleteForm] = useState({ final_mileage: '', return_date: '' });
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    Promise.all([
      api.get('/trips', { params }),
      api.get('/vehicles'),
      api.get('/drivers')
    ]).then(([t, v, d]) => {
      setTrips(t.data);
      setVehicles(v.data);
      setDrivers(d.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openNew = () => {
    setForm({ vehicle_id: '', driver_id: '', origin: '', destination: '', departure_date: '', initial_mileage: '', purpose: '', observations: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleStart = async (id) => {
    try {
      await api.patch(`/trips/${id}/start`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const openComplete = (trip) => {
    setSelectedTrip(trip);
    setCompleteForm({ final_mileage: '', return_date: new Date().toISOString().split('T')[0] });
    setShowCompleteModal(true);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/trips/${selectedTrip.id}/complete`, completeForm);
      setShowCompleteModal(false);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancelar esta viagem?')) return;
    try {
      await api.patch(`/trips/${id}/cancel`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta viagem?')) return;
    try {
      await api.delete(`/trips/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const availableVehicles = vehicles.filter(v => v.status === 'available');
  const availableDrivers = drivers.filter(d => d.status === 'available');

  return (
    <>
      <div className="page-header">
        <h2>Viagens</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Nova Viagem</button>
      </div>

      <div className="toolbar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="scheduled">Agendada</option>
          <option value="in_progress">Em Andamento</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Veículo</th><th>Motorista</th><th>Origem</th><th>Destino</th><th>Data Saída</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {trips.length === 0 ?
                  <tr><td colSpan={7}><div className="empty-state"><p>Nenhuma viagem encontrada</p></div></td></tr> :
                  trips.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.plate}</strong><br/><small style={{color:'#999'}}>{t.vehicle_brand} {t.vehicle_model}</small></td>
                      <td>{t.driver_name}</td>
                      <td>{t.origin}</td>
                      <td>{t.destination}</td>
                      <td>{new Date(t.departure_date).toLocaleDateString('pt-BR')}</td>
                      <td><span className={`badge badge-${t.status}`}>{statusLabels[t.status]}</span></td>
                      <td>
                        <div className="btn-group">
                          {t.status === 'scheduled' && <button className="btn btn-success btn-sm" onClick={() => handleStart(t.id)} title="Iniciar"><FiPlay /></button>}
                          {t.status === 'in_progress' && <button className="btn btn-primary btn-sm" onClick={() => openComplete(t)} title="Concluir"><FiCheck /></button>}
                          {t.status !== 'completed' && t.status !== 'cancelled' && <button className="btn btn-warning btn-sm" onClick={() => handleCancel(t.id)} title="Cancelar"><FiX /></button>}
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}><FiTrash2 /></button>
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
              <h3>Nova Viagem</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label>Veículo *</label>
                    <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} required>
                      <option value="">Selecione...</option>
                      {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Motorista *</label>
                    <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)} required>
                      <option value="">Selecione...</option>
                      {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Origem *</label>
                    <input value={form.origin} onChange={e => set('origin', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Destino *</label>
                    <input value={form.destination} onChange={e => set('destination', e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data de Saída *</label>
                    <input type="date" value={form.departure_date} onChange={e => set('departure_date', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Km Inicial *</label>
                    <input type="number" value={form.initial_mileage} onChange={e => set('initial_mileage', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Finalidade</label>
                  <input value={form.purpose} onChange={e => set('purpose', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Observações</label>
                  <textarea value={form.observations} onChange={e => set('observations', e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Viagem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Concluir Viagem</h3>
              <button className="modal-close" onClick={() => setShowCompleteModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Km Final *</label>
                  <input type="number" value={completeForm.final_mileage} onChange={e => setCompleteForm(p => ({ ...p, final_mileage: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Data de Retorno</label>
                  <input type="date" value={completeForm.return_date} onChange={e => setCompleteForm(p => ({ ...p, return_date: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCompleteModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-success">Concluir</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
