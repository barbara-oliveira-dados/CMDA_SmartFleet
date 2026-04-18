const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List all maintenance records
router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, vehicle_id, type } = req.query;
  let query = `
    SELECT m.*, v.plate, v.model AS vehicle_model, v.brand AS vehicle_brand
    FROM maintenance m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (vehicle_id) { query += ' AND m.vehicle_id = ?'; params.push(vehicle_id); }
  if (type) { query += ' AND m.type = ?'; params.push(type); }
  query += ' ORDER BY m.scheduled_date DESC';

  const records = db.prepare(query).all(...params);
  res.json(records);
});

// Get by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const record = db.prepare(`
    SELECT m.*, v.plate, v.model AS vehicle_model, v.brand AS vehicle_brand
    FROM maintenance m
    JOIN vehicles v ON m.vehicle_id = v.id
    WHERE m.id = ?
  `).get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Manutenção não encontrada' });
  res.json(record);
});

// Create
router.post('/', async (req, res) => {
  const { vehicle_id, type, description, scheduled_date, cost, mileage_at_service, provider } = req.body;
  if (!vehicle_id || !type || !description || !scheduled_date) {
    return res.status(400).json({ error: 'Veículo, tipo, descrição e data são obrigatórios' });
  }

  const db = await getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicle_id);
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' });

  const result = db.prepare(
    `INSERT INTO maintenance (vehicle_id, type, description, scheduled_date, cost, mileage_at_service, provider)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(vehicle_id, type, description, scheduled_date, cost || 0, mileage_at_service || null, provider || null);

  const record = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(record);
});

// Start maintenance
router.patch('/:id/start', async (req, res) => {
  const db = await getDb();
  const record = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Manutenção não encontrada' });
  if (record.status !== 'scheduled') return res.status(400).json({ error: 'Manutenção não pode ser iniciada' });

  const startMaint = db.transaction(() => {
    db.prepare("UPDATE maintenance SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    db.prepare("UPDATE vehicles SET status = 'maintenance', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(record.vehicle_id);
  });
  startMaint();

  const updated = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Complete maintenance
router.patch('/:id/complete', async (req, res) => {
  const { cost, completed_date } = req.body;
  const db = await getDb();
  const record = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Manutenção não encontrada' });
  if (record.status !== 'in_progress') return res.status(400).json({ error: 'Manutenção não está em andamento' });

  const completeMaint = db.transaction(() => {
    db.prepare(
      `UPDATE maintenance SET status = 'completed', cost = COALESCE(?, cost),
       completed_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(cost, completed_date || new Date().toISOString().split('T')[0], req.params.id);

    db.prepare("UPDATE vehicles SET status = 'available', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(record.vehicle_id);
  });
  completeMaint();

  const updated = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Update
router.put('/:id', async (req, res) => {
  const { type, description, scheduled_date, cost, mileage_at_service, provider, status } = req.body;
  const db = await getDb();

  const existing = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manutenção não encontrada' });

  db.prepare(
    `UPDATE maintenance SET type=?, description=?, scheduled_date=?, cost=?, mileage_at_service=?,
     provider=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id = ?`
  ).run(
    type || existing.type,
    description || existing.description,
    scheduled_date || existing.scheduled_date,
    cost !== undefined ? cost : existing.cost,
    mileage_at_service !== undefined ? mileage_at_service : existing.mileage_at_service,
    provider !== undefined ? provider : existing.provider,
    status || existing.status,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.prepare('SELECT * FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Manutenção não encontrada' });

  db.prepare('DELETE FROM maintenance WHERE id = ?').run(req.params.id);
  res.json({ message: 'Manutenção removida com sucesso' });
});

module.exports = router;
