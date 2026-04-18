const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List all trips
router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, vehicle_id, driver_id } = req.query;
  let query = `
    SELECT t.*, v.plate, v.model AS vehicle_model, v.brand AS vehicle_brand,
           d.name AS driver_name
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (vehicle_id) { query += ' AND t.vehicle_id = ?'; params.push(vehicle_id); }
  if (driver_id) { query += ' AND t.driver_id = ?'; params.push(driver_id); }
  query += ' ORDER BY t.departure_date DESC';

  const trips = db.prepare(query).all(...params);
  res.json(trips);
});

// Get trip by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const trip = db.prepare(`
    SELECT t.*, v.plate, v.model AS vehicle_model, v.brand AS vehicle_brand,
           d.name AS driver_name
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    JOIN drivers d ON t.driver_id = d.id
    WHERE t.id = ?
  `).get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada' });
  res.json(trip);
});

// Create trip
router.post('/', async (req, res) => {
  const { vehicle_id, driver_id, origin, destination, departure_date, initial_mileage, purpose, observations } = req.body;
  if (!vehicle_id || !driver_id || !origin || !destination || !departure_date || initial_mileage === undefined) {
    return res.status(400).json({ error: 'Veículo, motorista, origem, destino, data e km inicial são obrigatórios' });
  }

  const db = await getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' });
  if (vehicle.status !== 'available') return res.status(400).json({ error: 'Veículo não disponível' });

  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(driver_id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });
  if (driver.status !== 'available') return res.status(400).json({ error: 'Motorista não disponível' });

  const result = db.prepare(
    `INSERT INTO trips (vehicle_id, driver_id, origin, destination, departure_date, initial_mileage, purpose, observations, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`
  ).run(vehicle_id, driver_id, origin, destination, departure_date, initial_mileage, purpose || null, observations || null);

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(trip);
});

// Start trip
router.patch('/:id/start', async (req, res) => {
  const db = await getDb();
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada' });
  if (trip.status !== 'scheduled') return res.status(400).json({ error: 'Viagem não pode ser iniciada' });

  const updateTrip = db.transaction(() => {
    db.prepare("UPDATE trips SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE vehicles SET status = 'in_use', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(trip.vehicle_id);
    db.prepare("UPDATE drivers SET status = 'on_trip', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(trip.driver_id);
  });
  updateTrip();

  const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Complete trip
router.patch('/:id/complete', async (req, res) => {
  const { final_mileage, return_date, observations } = req.body;
  if (final_mileage === undefined) {
    return res.status(400).json({ error: 'Km final é obrigatório' });
  }

  const db = await getDb();
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada' });
  if (trip.status !== 'in_progress') return res.status(400).json({ error: 'Viagem não está em andamento' });

  const completeTrip = db.transaction(() => {
    db.prepare(
      `UPDATE trips SET status = 'completed', final_mileage = ?, return_date = ?,
       observations = COALESCE(?, observations), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(final_mileage, return_date || new Date().toISOString(), observations, req.params.id);

    db.prepare("UPDATE vehicles SET status = 'available', mileage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(final_mileage, trip.vehicle_id);
    db.prepare("UPDATE drivers SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(trip.driver_id);
  });
  completeTrip();

  const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Cancel trip
router.patch('/:id/cancel', async (req, res) => {
  const db = await getDb();
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada' });
  if (trip.status === 'completed') return res.status(400).json({ error: 'Viagem já concluída' });

  const cancelTrip = db.transaction(() => {
    db.prepare("UPDATE trips SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    if (trip.status === 'in_progress') {
      db.prepare("UPDATE vehicles SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(trip.vehicle_id);
      db.prepare("UPDATE drivers SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(trip.driver_id);
    }
  });
  cancelTrip();

  const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete trip
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Viagem não encontrada' });

  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  res.json({ message: 'Viagem removida com sucesso' });
});

module.exports = router;
