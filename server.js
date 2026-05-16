const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Railway automatically provides DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── PATIENTS ───────────────────────────────────────
app.get('/api/patients', async (req, res) => {
  const result = await pool.query('SELECT * FROM patients ORDER BY id');
  res.json(result.rows);
});
app.post('/api/patients', async (req, res) => {
  const { name, phone, email, dob, address } = req.body;
  const result = await pool.query(
    'INSERT INTO patients (name, phone, email, dob, address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, phone, email, dob, address]
  );
  res.json(result.rows[0]);
});
app.put('/api/patients/:id', async (req, res) => {
  const { name, phone, email, dob, address } = req.body;
  const result = await pool.query(
    'UPDATE patients SET name=$1, phone=$2, email=$3, dob=$4, address=$5 WHERE id=$6 RETURNING *',
    [name, phone, email, dob, address, req.params.id]
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
  const { patient_id, date, time, doctor, treatment, status } = req.body;
  const result = await pool.query(
    'INSERT INTO appointments (patient_id, date, time, doctor, treatment, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [patient_id, date, time, doctor, treatment, status]
  );
  res.json(result.rows[0]);
});
app.put('/api/appointments/:id', async (req, res) => {
  const { patient_id, date, time, doctor, treatment, status } = req.body;
  const result = await pool.query(
    'UPDATE appointments SET patient_id=$1, date=$2, time=$3, doctor=$4, treatment=$5, status=$6 WHERE id=$7 RETURNING *',
    [patient_id, date, time, doctor, treatment, status, req.params.id]
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
  const { patient_id, date, amount, status, description } = req.body;
  const result = await pool.query(
    'INSERT INTO invoices (patient_id, date, amount, status, description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [patient_id, date, amount, status, description]
  );
  res.json(result.rows[0]);
});
app.put('/api/invoices/:id', async (req, res) => {
  const { patient_id, date, amount, status, description } = req.body;
  const result = await pool.query(
    'UPDATE invoices SET patient_id=$1, date=$2, amount=$3, status=$4, description=$5 WHERE id=$6 RETURNING *',
    [patient_id, date, amount, status, description, req.params.id]
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
  const { name, quantity, unit, reorder_level, cost } = req.body;
  const result = await pool.query(
    'INSERT INTO inventory (name, quantity, unit, reorder_level, cost) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, quantity, unit, reorder_level, cost]
  );
  res.json(result.rows[0]);
});
app.put('/api/inventory/:id', async (req, res) => {
  const { name, quantity, unit, reorder_level, cost } = req.body;
  const result = await pool.query(
    'UPDATE inventory SET name=$1, quantity=$2, unit=$3, reorder_level=$4, cost=$5 WHERE id=$6 RETURNING *',
    [name, quantity, unit, reorder_level, cost, req.params.id]
  );
  res.json(result.rows[0]);
});
app.delete('/api/inventory/:id', async (req, res) => {
  await pool.query('DELETE FROM inventory WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));