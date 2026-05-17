const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── CREATE SYNC TABLE ON STARTUP ────────────────────
async function initDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clinic_state (
          id INTEGER PRIMARY KEY DEFAULT 1,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CHECK (id = 1)
        )
      `);
      console.log('Database ready');
      return;
    } catch (e) {
      retries--;
      console.log(`DB not ready, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('Could not connect to DB after retries');
}
initDB().catch(err => console.error('DB init failed:', err.message));

// ─── WEBSOCKET SYNC ───────────────────────────────────
wss.on('connection', (ws) => {
  console.log('Device connected');

  pool.query('SELECT state FROM clinic_state WHERE id = 1')
    .then(result => {
      if (result.rows.length > 0) {
        ws.send(JSON.stringify({ type: 'state', data: result.rows[0].state }));
      }
    }).catch(() => {});

  ws.on('message', async (msg) => {
    try {
      const { type, data } = JSON.parse(msg);
      if (type === 'push') {
        await pool.query(`
          INSERT INTO clinic_state (id, state, updated_at)
          VALUES (1, $1, NOW())
          ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()
        `, [JSON.stringify(data)]);
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'state', data }));
          }
        });
      }
    } catch (e) { console.error('WS message error:', e.message); }
  });

  ws.on('close', () => console.log('Device disconnected'));
});

// ─── SYNC REST FALLBACK ───────────────────────────────
app.post('/api/sync', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO clinic_state (id, state, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()
    `, [JSON.stringify(req.body)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sync', async (req, res) => {
  try {
    const result = await pool.query('SELECT state FROM clinic_state WHERE id = 1');
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0].state);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/patients', async (req, res) => {
  const r = await pool.query('SELECT * FROM patients ORDER BY id');
  res.json(r.rows);
});
app.get('/api/appointments', async (req, res) => {
  const r = await pool.query('SELECT * FROM appointments ORDER BY date');
  res.json(r.rows);
});
app.get('/api/invoices', async (req, res) => {
  const r = await pool.query('SELECT * FROM invoices ORDER BY id');
  res.json(r.rows);
});
app.get('/api/inventory', async (req, res) => {
  const r = await pool.query('SELECT * FROM inventory ORDER BY id');
  res.json(r.rows);
});
app.get('/api/doctors', async (req, res) => {
  const r = await pool.query('SELECT * FROM doctors ORDER BY id');
  res.json(r.rows);
});

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));