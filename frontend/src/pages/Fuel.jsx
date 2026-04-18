import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

export default function Fuel() {
  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (filterVehicle) params.vehicle_id = filterVehicle;
    Promise.all([
      api.get('/fuel', { params }),
      api.get('/vehicles'),
      api.get('/drivers')
    ]).then(([f, v, d]) => {
      setRecords(f.data);
      setVehicles(v.data);
      setDrivers(d.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterVehicle]);

  const openNew = () => {
    setForm({ vehicle_id: '', driver_id: '', date: new Date().toISOString().split('T')[0], fuel_type: 'gasoline', liters: '', cost_per_liter: '', mileage: '', gas_station: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/fuel', form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este registro?')) return;
    try {
      await api.delete(`/fuel/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const fuelTypeLabels = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', flex: 'Flex' };

  return (
    <>
      <div className="page-header">
        <h2>Combustível</h2>
        <button className="btn btn-primary" onClick={openNew}><FiPlus /> Novo Abastecimento</button>
      </div>

      <div className="toolbar">
        <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
          <option value="">Todos os Veículos</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? <div className="loading"><div className="spinner" /></div> : (
            <table>
              <thead>
                <tr><th>Veículo</th><th>Motorista</th><th>Data</th><th>Combustível</th><th>Litros</th><th>R$/L</th><th>Total</th><th>Km</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {records.length === 0 ?
                  <tr><td colSpan={9}><div className="empty-state"><p>Nenhum registro de combustível</p></div></td></tr> :
                  records.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.plate}</strong><br/><small style={{color:'#999'}}>{r.vehicle_model}</small></td>
                      <td>{r.driver_name || '-'}</td>
                      <td>{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                      <td>{fuelTypeLabels[r.fuel_type] || r.fuel_type}</td>
                      <td>{Number(r.liters).toFixed(1)}</td>
                      <td>R$ {Number(r.cost_per_liter).toFixed(2)}</td>
                      <td><strong>R$ {Number(r.total_cost).toFixed(2)}</strong></td>
                      <td>{Number(r.mileage).toLocaleString('pt-BR')}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}><FiTrash2 /></button>
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
              <h3>Novo Abastecimento</h3>
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
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.model}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Motorista</label>
                    <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
                      <option value="">Selecione...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Combustível *</label>
                    <select value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                      <option value="gasoline">Gasolina</option>
                      <option value="ethanol">Etanol</option>
                      <option value="diesel">Diesel</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Litros *</label>
                    <input type="number" step="0.01" value={form.liters} onChange={e => set('liters', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Valor por Litro (R$) *</label>
                    <input type="number" step="0.01" value={form.cost_per_liter} onChange={e => set('cost_per_liter', e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quilometragem *</label>
                    <input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Posto</label>
                    <input value={form.gas_station} onChange={e => set('gas_station', e.target.value)} />
                  </div>
                </div>
                {form.liters && form.cost_per_liter && (
                  <div className="alert alert-success">
                    Total: R$ {(Number(form.liters) * Number(form.cost_per_liter)).toFixed(2)}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
