import { useState, useEffect } from 'react';
import api from '../services/api';
import { FiTruck, FiUsers, FiMap, FiTool, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!data) return null;

  const statusLabels = {
    available: 'Disponível', in_use: 'Em Uso', maintenance: 'Manutenção',
    in_progress: 'Em Andamento', scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado',
    on_trip: 'Em Viagem', inactive: 'Inativo'
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{greeting()}, {user?.name?.split(' ')[0]}!</h2>
          <p className="page-header-subtitle">Aqui está o resumo da sua frota</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-card-top">
            <div className="stat-icon blue"><FiTruck /></div>
          </div>
          <div className="stat-value">{data.vehicles.total}</div>
          <div className="stat-label">{data.vehicles.available} veículos disponíveis</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-top">
            <div className="stat-icon green"><FiUsers /></div>
          </div>
          <div className="stat-value">{data.drivers.total}</div>
          <div className="stat-label">{data.drivers.available} motoristas disponíveis</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-card-top">
            <div className="stat-icon yellow"><FiMap /></div>
          </div>
          <div className="stat-value">{data.trips.active}</div>
          <div className="stat-label">Viagens em andamento</div>
        </div>
        <div className="stat-card red">
          <div className="stat-card-top">
            <div className="stat-icon red"><FiTool /></div>
          </div>
          <div className="stat-value">{data.maintenance.pending}</div>
          <div className="stat-label">Manutenções pendentes</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h3>Viagens Recentes</h3>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Veículo</th><th>Rota</th><th>Status</th></tr></thead>
              <tbody>
                {data.recentTrips.length === 0 ?
                  <tr><td colSpan={3}><div className="empty-state"><p>Nenhuma viagem registrada</p></div></td></tr> :
                  data.recentTrips.map(t => (
                    <tr key={t.id}>
                      <td><strong style={{color:'var(--text)'}}>{t.plate}</strong></td>
                      <td>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:'0.84rem'}}>
                          {t.origin} <FiArrowRight style={{fontSize:'0.7rem',color:'var(--text-muted)'}} /> {t.destination}
                        </span>
                      </td>
                      <td><span className={`badge badge-${t.status}`}>{statusLabels[t.status] || t.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Próximas Manutenções</h3>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Veículo</th><th>Tipo</th><th>Data</th></tr></thead>
              <tbody>
                {data.upcomingMaintenance.length === 0 ?
                  <tr><td colSpan={3}><div className="empty-state"><p>Nenhuma manutenção agendada</p></div></td></tr> :
                  data.upcomingMaintenance.map(m => (
                    <tr key={m.id}>
                      <td><strong style={{color:'var(--text)'}}>{m.plate}</strong></td>
                      <td style={{textTransform:'capitalize'}}>{m.type === 'preventive' ? 'Preventiva' : m.type === 'corrective' ? 'Corretiva' : 'Inspeção'}</td>
                      <td>{new Date(m.scheduled_date).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data.fuelCosts.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Top 5 — Gastos com Combustível</h3></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Veículo</th><th>Total Litros</th><th>Custo Total</th></tr></thead>
              <tbody>
                {data.fuelCosts.map((f, i) => (
                  <tr key={i}>
                    <td><strong style={{color:'var(--text)'}}>{f.plate}</strong></td>
                    <td>{Number(f.total_liters).toFixed(1)} L</td>
                    <td><strong style={{color:'var(--danger)'}}>R$ {Number(f.total_fuel_cost).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
