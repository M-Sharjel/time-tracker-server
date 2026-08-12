const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const DATA_DIR = path.join(__dirname, 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json');

[DATA_DIR, LOGS_DIR, SCREENSHOTS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
if (!fs.existsSync(EMPLOYEES_FILE)) fs.writeFileSync(EMPLOYEES_FILE, '[]');

// ---------- storage helpers ----------
function loadEmployees() {
  return JSON.parse(fs.readFileSync(EMPLOYEES_FILE, 'utf-8'));
}
function saveEmployees(list) {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(list, null, 2));
}
function findEmployeeByApiKey(apiKey) {
  return loadEmployees().find((e) => e.apiKey === apiKey);
}
function employeeLogPath(employeeId, date) {
  const dir = path.join(LOGS_DIR, employeeId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${date}.json`);
}
function employeeScreenshotDir(employeeId, date) {
  const dir = path.join(SCREENSHOTS_DIR, employeeId, date);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function loadLog(employeeId, date) {
  const p = employeeLogPath(employeeId, date);
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}
function appendLogEntries(employeeId, date, entries) {
  const p = employeeLogPath(employeeId, date);
  const log = loadLog(employeeId, date);
  log.push(...entries);
  fs.writeFileSync(p, JSON.stringify(log, null, 2));
}
function summarize(log, pollIntervalSeconds = 5) {
  let activeSeconds = 0;
  let idleSeconds = 0;
  const appTotals = {};
  // Cap any single gap so a stop/resume, closed app, or offline period
  // isn't misattributed as active or idle time.
  const maxGapSeconds = pollIntervalSeconds * 2;
  for (let i = 0; i < log.length; i++) {
    const entry = log[i];
    const next = log[i + 1];
    let dur = next
      ? (new Date(next.timestamp) - new Date(entry.timestamp)) / 1000
      : pollIntervalSeconds;
    dur = Math.min(dur, maxGapSeconds);
    if (entry.idle) {
      idleSeconds += dur;
    } else {
      activeSeconds += dur;
      appTotals[entry.app] = (appTotals[entry.app] || 0) + dur;
    }
  }
  return { activeSeconds, idleSeconds, appTotals };
}

// ---------- app setup ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // screenshots arrive as base64
app.use(express.static(path.join(__dirname, 'public')));

// Admin auth: JWT via Authorization header OR ?token= (needed for <img> tags)
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Employee client auth: API key issued per-employee
function employeeAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const employee = apiKey && findEmployeeByApiKey(apiKey);
  if (!employee) return res.status(401).json({ error: 'Invalid API key' });
  req.employee = employee;
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ---------- client (employee app) endpoints ----------
app.post('/api/activity', employeeAuth, (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: 'entries required' });
  }
  const byDate = {};
  for (const e of entries) {
    // Prefer the client's own local calendar date (fixes entries near
    // midnight being filed under the wrong UTC day); fall back for older clients.
    const date = e.localDate || e.timestamp.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(e);
  }
  for (const date of Object.keys(byDate)) {
    appendLogEntries(req.employee.id, date, byDate[date]);
  }
  res.json({ ok: true });
});

app.post('/api/screenshot', employeeAuth, (req, res) => {
  const { image, timestamp, localDate } = req.body;
  if (!image || !timestamp) return res.status(400).json({ error: 'image and timestamp required' });
  const date = localDate || timestamp.slice(0, 10);
  const dir = employeeScreenshotDir(req.employee.id, date);
  const filename = `${timestamp.replace(/[:.]/g, '-')}.png`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(image, 'base64'));
  res.json({ ok: true, filename });
});

// ---------- admin endpoints ----------
app.get('/api/admin/employees', adminAuth, (req, res) => {
  const employees = loadEmployees();
  const today = new Date().toISOString().slice(0, 10);
  const result = employees.map((e) => {
    const summary = summarize(loadLog(e.id, today));
    return {
      id: e.id,
      name: e.name,
      email: e.email,
      hourlyRate: e.hourlyRate,
      todayActiveSeconds: summary.activeSeconds,
      todayIdleSeconds: summary.idleSeconds
    };
  });
  res.json(result);
});

app.post('/api/admin/employees', adminAuth, (req, res) => {
  const { name, email, hourlyRate } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const employees = loadEmployees();
  const newEmp = {
    id: uuidv4(),
    name,
    email: email || '',
    hourlyRate: Number(hourlyRate) || 0,
    apiKey: crypto.randomBytes(20).toString('hex'),
    createdAt: new Date().toISOString()
  };
  employees.push(newEmp);
  saveEmployees(employees);
  res.json(newEmp);
});

app.delete('/api/admin/employees/:id', adminAuth, (req, res) => {
  const employees = loadEmployees().filter((e) => e.id !== req.params.id);
  saveEmployees(employees);
  res.json({ ok: true });
});

app.get('/api/admin/employees/:id/summary', adminAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(summarize(loadLog(req.params.id, date)));
});

app.get('/api/admin/employees/:id/logs', adminAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(loadLog(req.params.id, date));
});

app.get('/api/admin/employees/:id/screenshots', adminAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const dir = path.join(SCREENSHOTS_DIR, req.params.id, date);
  if (!fs.existsSync(dir)) return res.json([]);
  res.json(fs.readdirSync(dir).sort());
});

app.get('/api/admin/employees/:id/screenshots/:date/:file', adminAuth, (req, res) => {
  const filePath = path.join(SCREENSHOTS_DIR, req.params.id, req.params.date, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

// Payroll: active hours x rate, summed across an inclusive date range
app.get('/api/admin/payroll', adminAuth, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required (YYYY-MM-DD)' });
  const employees = loadEmployees();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const result = employees.map((e) => {
    let totalActiveSeconds = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      totalActiveSeconds += summarize(loadLog(e.id, dateStr)).activeSeconds;
    }
    const hours = totalActiveSeconds / 3600;
    return {
      id: e.id,
      name: e.name,
      hourlyRate: e.hourlyRate,
      totalHours: Math.round(hours * 100) / 100,
      totalPay: Math.round(hours * e.hourlyRate * 100) / 100
    };
  });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Time Tracker server running on port ${PORT}`);
  console.log(`Admin password: ${ADMIN_PASSWORD} (override with ADMIN_PASSWORD env var)`);
});
