// job/backend/routes/alertsRoutes.js
const express = require("express");
const fs = require("fs-extra");
const path = require("path");

const router = express.Router();
const DATA_DIR = path.join(__dirname, "..", "data");
fs.ensureDirSync(DATA_DIR);
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");

function readAlerts() {
  try { return fs.readJsonSync(ALERTS_FILE); } catch { return []; }
}
function writeAlerts(a) { fs.writeJsonSync(ALERTS_FILE, a, { spaces: 2 }); }

router.post("/create", (req, res) => {
  const { email, keyword, location } = req.body || {};
  if (!email || !keyword) return res.status(400).json({ error: "email and keyword required" });

  const alerts = readAlerts();
  const id = Date.now().toString(36);
  const alert = { id, email, keyword, location: location || "", createdAt: new Date().toISOString() };
  alerts.push(alert);
  writeAlerts(alerts);
  return res.json({ message: "Alert created", alert });
});

router.get("/by-email/:email", (req, res) => {
  const { email } = req.params;
  const alerts = readAlerts().filter(a => a.email === email);
  res.json(alerts);
});

// list all (admin/dev)
router.get("/", (req, res) => {
  res.json(readAlerts());
});

module.exports = router;
