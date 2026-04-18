const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// List all drivers
router.get('/', async (req, res) => {
  const db = await getDb();
  const { status, search } = req.query;
  let query = 'SELECT * FROM drivers WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (name LIKE ? OR cnh LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }
  query += ' ORDER BY name ASC';

  const drivers = db.prepare(query).all(...params);
  res.json(drivers);
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  const db = await getDb();
  const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado' });
  res.json(driver);
});

// Create driver
router.post('/', async (req, res) => {
  const { name, cnh, cnh_category, cnh_expiry, phone, email } = req.body;
  if (!name || !cnh || !cnh_expiry) {
    return res.status(400).json({ error: 'Nome, CNH e validade da CNH são obrigatórios' });
  }

  const db = await getDb();
  try {
    const result = db.prepare(
      `INSERT INTO drivers (name, cnh, cnh_category, cnh_expiry, phone, email)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(name, cnh, cnh_category || 'B', cnh_expiry, phone || null, email || null);

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(driver);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'CNH já cadastrada' });
    }
    throw err;
  }
});

// Update driver
router.put('/:id', async (req, res) => {
  const { name, cnh, cnh_category, cnh_expiry, phone, email, status } = req.body;
  const db = await getDb();

  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Motorista não encontrado' });

  try {
    db.prepare(
      `UPDATE drivers SET name=?, cnh=?, cnh_category=?, cnh_expiry=?, phone=?, email=?, status=?, updated_at=CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      name || existing.name,
      cnh || existing.cnh,
      cnh_category || existing.cnh_category,
      cnh_expiry || existing.cnh_expiry,
      phone !== undefined ? phone : existing.phone,
      email !== undefined ? email : existing.email,
      status || existing.status,
      req.params.id
    );

    const driver = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
    res.json(driver);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'CNH já cadastrada' });
    }
    throw err;
  }
});

// Delete driver
router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const existing = db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Motorista não encontrado' });

  db.prepare('DELETE FROM drivers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Motorista removido com sucesso' });
});

module.exports = router;
