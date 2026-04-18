const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List fuel records
router.get('/', async (req, res) => {
  const db = await getDb();
  const { vehicle_id } = req.query;
  let query = `
    SELECT f.*, v.plate, v.model AS vehicle_model,
           d.name AS driver_name
    FROM fuel_records f
    JOIN vehicles v ON f.vehicle_id = v.id
    LEFT JOIN drivers d ON f.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];
  if (vehicle_id) { query += ' AND f.vehicle_id = ?'; params.push(vehicle_id); }
  query += ' ORDER BY f.date DESC';

  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Create fuel record
router.post('/', async (req, res) => {
  const { vehicle_id, driver_id, date, fuel_type, liters, cost_per_liter, mileage, gas_station } = req.body;
  if (!vehicle_id || !fuel_type || !liters || !cost_per_liter || !mileage) {
    return res.status(400).json({ error: 'Veículo, tipo de combustível, litros, valor/litro e km são obrigatórios' });
  }

  const total_cost = liters * cost_per_liter;
  const db = await getDb();

  const result = db.prepare(
    `INSERT INTO fuel_records (vehicle_id, driver_id, date, fuel_type, liters, cost_per_liter, total_cost, mileage, gas_station)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(vehicle_id, driver_id || null, date || new Date().toISOString(), fuel_type, liters, cost_per_liter, total_cost, mileage, gas_station || null);

  const record = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

// Delete
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.prepare('SELECT * FROM fuel_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Registro não encontrado' });

  db.prepare('DELETE FROM fuel_records WHERE id = ?').run(req.params.id);
  res.json({ message: 'Registro removido com sucesso' });
});

module.exports = router;
