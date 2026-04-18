const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'smartfleet.db');

let db;

// Wrapper to make sql.js API similar to better-sqlite3
function wrapDb(rawDb) {
  function saveToFile() {
    const data = rawDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  return {
    exec(sql) { rawDb.run(sql); saveToFile(); },
    prepare(sql) {
      return {
        run(...params) {
          rawDb.run(sql, params);
          saveToFile();
          const lastId = rawDb.exec('SELECT last_insert_rowid() as id')[0];
          const changes = rawDb.getRowsModified();
          return { lastInsertRowid: lastId ? lastId.values[0][0] : 0, changes };
        },
        get(...params) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        }
      };
    },
    transaction(fn) {
      return (...args) => {
        rawDb.run('BEGIN TRANSACTION');
        try {
          fn(...args);
          rawDb.run('COMMIT');
          saveToFile();
        } catch (e) {
          rawDb.run('ROLLBACK');
          throw e;
        }
      };
    },
    pragma(p) {
      try { rawDb.run(`PRAGMA ${p}`); } catch(e) { /* ignore */ }
    }
  };
}

async function getDb() {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      const rawDb = new SQL.Database(fileBuffer);
      db = wrapDb(rawDb);
    } else {
      const rawDb = new SQL.Database();
      db = wrapDb(rawDb);
    }
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

async function initDatabase() {
  const db = await getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator','viewer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate TEXT NOT NULL UNIQUE,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      color TEXT,
      fuel_type TEXT NOT NULL DEFAULT 'flex' CHECK(fuel_type IN ('gasoline','ethanol','diesel','flex','electric')),
      mileage REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','in_use','maintenance','inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cnh TEXT NOT NULL UNIQUE,
      cnh_category TEXT NOT NULL DEFAULT 'B',
      cnh_expiry DATE NOT NULL,
      phone TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','on_trip','inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date DATETIME NOT NULL,
      return_date DATETIME,
      initial_mileage REAL NOT NULL,
      final_mileage REAL,
      purpose TEXT,
      observations TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('preventive','corrective','inspection')),
      description TEXT NOT NULL,
      scheduled_date DATE NOT NULL,
      completed_date DATE,
      cost REAL DEFAULT 0,
      mileage_at_service REAL,
      provider TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','in_progress','completed','cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS fuel_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER NOT NULL,
      driver_id INTEGER,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      fuel_type TEXT NOT NULL,
      liters REAL NOT NULL,
      cost_per_liter REAL NOT NULL,
      total_cost REAL NOT NULL,
      mileage REAL NOT NULL,
      gas_station TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (driver_id) REFERENCES drivers(id)
    );
  `);

  // Create default admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@smartfleet.com');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
      'Administrador', 'admin@smartfleet.com', hashedPassword, 'admin'
    );
  }

  return db;
}

module.exports = { getDb, initDatabase };
