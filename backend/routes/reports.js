const express = require('express');
const { getDb } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  const db = await getDb();

  const totalVehicles = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
  const availableVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'available'").get().count;
  const inUseVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'in_use'").get().count;
  const maintenanceVehicles = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'maintenance'").get().count;

  const totalDrivers = db.prepare('SELECT COUNT(*) as count FROM drivers').get().count;
  const availableDrivers = db.prepare("SELECT COUNT(*) as count FROM drivers WHERE status = 'available'").get().count;

  const activeTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'in_progress'").get().count;
  const scheduledTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'scheduled'").get().count;
  const completedTrips = db.prepare("SELECT COUNT(*) as count FROM trips WHERE status = 'completed'").get().count;

  const pendingMaintenance = db.prepare("SELECT COUNT(*) as count FROM maintenance WHERE status IN ('scheduled','in_progress')").get().count;

  const recentTrips = db.prepare(`
    SELECT t.*, v.plate, v.model AS vehicle_model, d.name AS driver_name
    FROM trips t JOIN vehicles v ON t.vehicle_id = v.id JOIN drivers d ON t.driver_id = d.id
    ORDER BY t.created_at DESC LIMIT 5
  `).all();

  const upcomingMaintenance = db.prepare(`
    SELECT m.*, v.plate, v.model AS vehicle_model
    FROM maintenance m JOIN vehicles v ON m.vehicle_id = v.id
    WHERE m.status IN ('scheduled','in_progress')
    ORDER BY m.scheduled_date ASC LIMIT 5
  `).all();

  const fuelCosts = db.prepare(`
    SELECT v.plate, SUM(f.total_cost) as total_fuel_cost, SUM(f.liters) as total_liters
    FROM fuel_records f JOIN vehicles v ON f.vehicle_id = v.id
    GROUP BY f.vehicle_id ORDER BY total_fuel_cost DESC LIMIT 5
  `).all();

  res.json({
    vehicles: { total: totalVehicles, available: availableVehicles, in_use: inUseVehicles, maintenance: maintenanceVehicles },
    drivers: { total: totalDrivers, available: availableDrivers },
    trips: { active: activeTrips, scheduled: scheduledTrips, completed: completedTrips },
    maintenance: { pending: pendingMaintenance },
    recentTrips,
    upcomingMaintenance,
    fuelCosts
  });
});

module.exports = router;
