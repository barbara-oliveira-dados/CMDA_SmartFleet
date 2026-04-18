const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List all vehicles
router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, search } = req.query;
  let query = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (plate LIKE ? OR brand LIKE ? OR model LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  query += ' ORDER BY created_at DESC';

  const vehicles = db.prepare(query).all(...params);
  res.json(vehicles);
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' });
  res.json(vehicle);
});

// Create vehicle
router.post('/', async (req, res) => {
  const { plate, brand, model, year, color, fuel_type, mileage } = req.body;
  if (!plate || !brand || !model || !year) {
    return res.status(400).json({ error: 'Placa, marca, modelo e ano são obrigatórios' });
  }

  const db = await getDb();
  try {
    const result = db.prepare(
      `INSERT INTO vehicles (plate, brand, model, year, color, fuel_type, mileage)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(plate.toUpperCase(), brand, model, year, color || null, fuel_type || 'flex', mileage || 0);

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Placa já cadastrada' });
    }
    throw err;
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  const { plate, brand, model, year, color, fuel_type, mileage, status } = req.body;
  const db = await getDb();

  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Veículo não encontrado' });

  try {
    db.prepare(
      `UPDATE vehicles SET plate=?, brand=?, model=?, year=?, color=?, fuel_type=?, mileage=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      (plate || existing.plate).toUpperCase(),
      brand || existing.brand,
      model || existing.model,
      year || existing.year,
      color !== undefined ? color : existing.color,
      fuel_type || existing.fuel_type,
      mileage !== undefined ? mileage : existing.mileage,
      status || existing.status,
      req.params.id
    );

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    res.json(vehicle);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Placa já cadastrada' });
    }
    throw err;
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Veículo não encontrado' });

  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Veículo removido com sucesso' });
});

module.exports = router;
