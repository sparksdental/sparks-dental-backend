const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public')); // ← serves clinic HTML from Railway

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── CREATE SYNC TABLE ON STARTUP ────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clinic_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (id = 1)
    )
  `);
  console.log('Database ready');
}
initDB().catch(console.error);

// ─── SYNC: SAVE FULL APP STATE ────────────────────────
// Called automatically on every save from the HTML app
app.post('/api/sync', async (req, res) => {
  try {
    const state = req.body;
    await pool.query(`
      INSERT INTO clinic_state (id, state, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET state = $1, updated_at = NOW()
    `, [JSON.stringify(state)]);
    res.json({ success: true });
  } catch (e) {
    console.error('Sync save error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── SYNC: LOAD FULL APP STATE ────────────────────────
// Called on app startup to get latest data
app.get('/api/sync', async (req, res) => {
  try {
    const result = await pool.query('SELECT state FROM clinic_state WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json(null);
    }
    res.json(result.rows[0].state);
  } catch (e) {
    console.error('Sync load error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── PATIENTS ───────────────────────────────────────
app.get('/api/patients', async (req, res) => {
  const result = await pool.query('SELECT * FROM patients ORDER BY id');
  res.json(result.rows);
});
app.post('/api/patients', async (req, res) => {
  const { name, age, sex, phone, address, occupation, email, lastVisit,
    nextAppt, condition, status, insurance, balance, bloodGroup, allergies,
    emergency, referral, photo, notes, umr, visitPurpose, chiefComplaint,
    familyHistory, medHistoryTags, treatingDoctor, revisit, revisit2,
    treatmentsReceived, package: pkg } = req.body;
  const result = await pool.query(
    `INSERT INTO patients (name, age, sex, phone, address, occupation, email,
      "lastVisit", "nextAppt", condition, status, insurance, balance,
      "bloodGroup", allergies, emergency, referral, photo, notes, umr,
      "visitPurpose", "chiefComplaint", "familyHistory", "medHistoryTags",
      "treatingDoctor", revisit, revisit2, "treatmentsReceived", package)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
             $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
    [name, age, sex, phone, address, occupation, email, lastVisit,
     nextAppt, condition, status, insurance, balance, bloodGroup, allergies,
     emergency, referral, photo, notes, umr, visitPurpose, chiefComplaint,
     familyHistory, medHistoryTags, treatingDoctor, revisit, revisit2,
     treatmentsReceived, pkg]
  );
  res.json(result.rows[0]);
});
app.put('/api/patients/:id', async (req, res) => {
  const { name, age, sex, phone, address, occupation, email, lastVisit,
    nextAppt, condition, status, insurance, balance, bloodGroup, allergies,
    emergency, referral, photo, notes, umr, visitPurpose, chiefComplaint,
    familyHistory, medHistoryTags, treatingDoctor, revisit, revisit2,
    treatmentsReceived, package: pkg } = req.body;
  const result = await pool.query(
    `UPDATE patients SET name=$1, age=$2, sex=$3, phone=$4, address=$5,
      occupation=$6, email=$7, "lastVisit"=$8, "nextAppt"=$9, condition=$10,
      status=$11, insurance=$12, balance=$13, "bloodGroup"=$14, allergies=$15,
      emergency=$16, referral=$17, photo=$18, notes=$19, umr=$20,
      "visitPurpose"=$21, "chiefComplaint"=$22, "familyHistory"=$23,
      "medHistoryTags"=$24, "treatingDoctor"=$25, revisit=$26, revisit2=$27,
      "treatmentsReceived"=$28, package=$29
     WHERE id=$30 RETURNING *`,
    [name, age, sex, phone, address, occupation, email, lastVisit,
     nextAppt, condition, status, insurance, balance, bloodGroup, allergies,
     emergency, referral, photo, notes, umr, visitPurpose, chiefComplaint,
     familyHistory, medHistoryTags, treatingDoctor, revisit, revisit2,
     treatmentsReceived, pkg, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/patients/:id', async (req, res) => {
  await pool.query('DELETE FROM patients WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── APPOINTMENTS ────────────────────────────────────
app.get('/api/appointments', async (req, res) => {
  const result = await pool.query('SELECT * FROM appointments ORDER BY date');
  res.json(result.rows);
});
app.post('/api/appointments', async (req, res) => {
  const { patient, date, time, duration, type, dentist, room, status, notes } = req.body;
  const result = await pool.query(
    `INSERT INTO appointments (patient, date, time, duration, type, dentist, room, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [patient, date, time, duration, type, dentist, room, status, notes]
  );
  res.json(result.rows[0]);
});
app.put('/api/appointments/:id', async (req, res) => {
  const { patient, date, time, duration, type, dentist, room, status, notes } = req.body;
  const result = await pool.query(
    `UPDATE appointments SET patient=$1, date=$2, time=$3, duration=$4,
      type=$5, dentist=$6, room=$7, status=$8, notes=$9
     WHERE id=$10 RETURNING *`,
    [patient, date, time, duration, type, dentist, room, status, notes, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/appointments/:id', async (req, res) => {
  await pool.query('DELETE FROM appointments WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── INVOICES ────────────────────────────────────────
app.get('/api/invoices', async (req, res) => {
  const result = await pool.query('SELECT * FROM invoices ORDER BY id');
  res.json(result.rows);
});
app.post('/api/invoices', async (req, res) => {
  const { patient, date, amount, paid, status, procedure, mode } = req.body;
  const result = await pool.query(
    `INSERT INTO invoices (patient, date, amount, paid, status, procedure, mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [patient, date, amount, paid, status, procedure, mode]
  );
  res.json(result.rows[0]);
});
app.put('/api/invoices/:id', async (req, res) => {
  const { patient, date, amount, paid, status, procedure, mode } = req.body;
  const result = await pool.query(
    `UPDATE invoices SET patient=$1, date=$2, amount=$3, paid=$4,
      status=$5, procedure=$6, mode=$7
     WHERE id=$8 RETURNING *`,
    [patient, date, amount, paid, status, procedure, mode, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/invoices/:id', async (req, res) => {
  await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── INVENTORY ───────────────────────────────────────
app.get('/api/inventory', async (req, res) => {
  const result = await pool.query('SELECT * FROM inventory ORDER BY id');
  res.json(result.rows);
});
app.post('/api/inventory', async (req, res) => {
  const { name, category, stock, unit, minStock, cost, supplier } = req.body;
  const result = await pool.query(
    `INSERT INTO inventory (name, category, stock, unit, "minStock", cost, supplier)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, category, stock, unit, minStock, cost, supplier]
  );
  res.json(result.rows[0]);
});
app.put('/api/inventory/:id', async (req, res) => {
  const { name, category, stock, unit, minStock, cost, supplier } = req.body;
  const result = await pool.query(
    `UPDATE inventory SET name=$1, category=$2, stock=$3, unit=$4,
      "minStock"=$5, cost=$6, supplier=$7
     WHERE id=$8 RETURNING *`,
    [name, category, stock, unit, minStock, cost, supplier, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/inventory/:id', async (req, res) => {
  await pool.query('DELETE FROM inventory WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── DOCTORS ─────────────────────────────────────────
app.get('/api/doctors', async (req, res) => {
  const result = await pool.query('SELECT * FROM doctors ORDER BY id');
  res.json(result.rows);
});
app.post('/api/doctors', async (req, res) => {
  const { name, qual, spec, phone, email, color, initials, status } = req.body;
  const result = await pool.query(
    `INSERT INTO doctors (name, qual, spec, phone, email, color, initials, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, qual, spec, phone, email, color, initials, status]
  );
  res.json(result.rows[0]);
});
app.put('/api/doctors/:id', async (req, res) => {
  const { name, qual, spec, phone, email, color, initials, status } = req.body;
  const result = await pool.query(
    `UPDATE doctors SET name=$1, qual=$2, spec=$3, phone=$4, email=$5,
      color=$6, initials=$7, status=$8
     WHERE id=$9 RETURNING *`,
    [name, qual, spec, phone, email, color, initials, status, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/doctors/:id', async (req, res) => {
  await pool.query('DELETE FROM doctors WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
