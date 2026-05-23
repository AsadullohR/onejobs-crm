/**
 * OneJobs CRM - Express.js API Server
 * Node.js + PostgreSQL backend
 */

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'onejobs-secret-change-in-production';

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/onejobs',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role))
    return res.status(403).json({ error: 'Admin only' });
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND active = TRUE',
      [username]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Parol noto\'g\'ri' });

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username, role: rows[0].role, name: rows[0].name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...user } = rows[0];
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LEADS ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/leads', auth, async (req, res) => {
  const { status, country, source, owner, search, page = 1, limit = 100 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) { conditions.push(`l.status = $${params.length+1}`); params.push(status); }
  if (country) { conditions.push(`l.country ILIKE $${params.length+1}`); params.push(`%${country}%`); }
  if (source) { conditions.push(`l.source = $${params.length+1}`); params.push(source); }
  if (owner) { conditions.push(`(u_s.name ILIKE $${params.length+1} OR u_c.name ILIKE $${params.length+1} OR u_d.name ILIKE $${params.length+1})`); params.push(`%${owner}%`); }
  if (search) {
    conditions.push(`(l.name ILIKE $${params.length+1} OR l.phone ILIKE $${params.length+1} OR l.id ILIKE $${params.length+1} OR l.comment ILIKE $${params.length+1})`);
    params.push(`%${search}%`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const query = `
      SELECT l.*,
        u_s.name as owner_sales_name, u_s.avatar as owner_sales_av, u_s.color as owner_sales_color,
        u_c.name as owner_consult_name, u_c.avatar as owner_consult_av, u_c.color as owner_consult_color,
        u_d.name as owner_docs_name, u_d.avatar as owner_docs_av, u_d.color as owner_docs_color
      FROM leads l
      LEFT JOIN users u_s ON l.owner_sales = u_s.id
      LEFT JOIN users u_c ON l.owner_consult = u_c.id
      LEFT JOIN users u_d ON l.owner_docs = u_d.id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT $${params.length+1} OFFSET $${params.length+2}
    `;
    params.push(limit, offset);

    const [leads, count] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT COUNT(*) FROM leads l LEFT JOIN users u_s ON l.owner_sales = u_s.id LEFT JOIN users u_c ON l.owner_consult = u_c.id LEFT JOIN users u_d ON l.owner_docs = u_d.id ${where}`, params.slice(0, -2)),
    ]);

    res.json({ leads: leads.rows, total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, 
        u_s.name as owner_sales_name, u_c.name as owner_consult_name, u_d.name as owner_docs_name
       FROM leads l
       LEFT JOIN users u_s ON l.owner_sales = u_s.id
       LEFT JOIN users u_c ON l.owner_consult = u_c.id
       LEFT JOIN users u_d ON l.owner_docs = u_d.id
       WHERE l.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead topilmadi' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leads', auth, async (req, res) => {
  const l = req.body;
  const id = l.id || `NO-${Date.now()}`;
  try {
    const { rows } = await pool.query(`
      INSERT INTO leads (id, name, phone, telegram, status, country, sector, position, source, gender,
        comment, note, owner_sales, owner_consult, owner_docs, q1, q2, q3, xba,
        kpi_sales, kpi_consult, kpi_docs, cv, docs, history,
        last_contact, contract_date, interview_date, dest, sof_foyda)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
      ON CONFLICT (id) DO UPDATE SET
        name=$2, phone=$3, telegram=$4, status=$5, country=$6, sector=$7, position=$8, source=$9, gender=$10,
        comment=$11, note=$12, owner_sales=$13, owner_consult=$14, owner_docs=$15, q1=$16, q2=$17, q3=$18, xba=$19,
        kpi_sales=$20, kpi_consult=$21, kpi_docs=$22, cv=$23, docs=$24, history=$25,
        last_contact=$26, contract_date=$27, interview_date=$28, dest=$29, sof_foyda=$30, updated_at=NOW()
      RETURNING *`,
      [id, l.name, l.phone, l.telegram, l.status, l.country, l.sector, l.position, l.source, l.gender,
       l.comment, l.note, l.ownerSales||null, l.ownerConsult||null, l.ownerDocs||null,
       l.q1||false, l.q2||false, l.q3||false, l.xba||false,
       l.kpiSales||false, l.kpiConsult||false, l.kpiDocs||false,
       JSON.stringify(l.cv||{}), JSON.stringify(l.docs||{}), JSON.stringify(l.history||[]),
       l.lastContact||null, l.contractDate||null, l.interviewDate||null, l.dest||null, l.sofFoyda||null]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/leads/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BULK CSV IMPORT ──────────────────────────────────────────────────────────
app.post('/api/leads/bulk', auth, async (req, res) => {
  const { leads } = req.body; // array of lead objects
  if (!Array.isArray(leads) || !leads.length)
    return res.status(400).json({ error: 'leads array required' });

  let added = 0, updated = 0, errors = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const l of leads) {
      const id = l.id || `NO-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const existing = await client.query('SELECT id FROM leads WHERE id=$1', [id]);
        if (existing.rows.length) { updated++; } else { added++; }
        await client.query(
          `INSERT INTO leads (id,name,phone,status,country,sector,source,gender,comment,note,q1,q2,q3,xba)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO UPDATE SET
             name=$2,phone=$3,status=$4,country=$5,sector=$6,source=$7,gender=$8,comment=$9,note=$10,
             q1=$11,q2=$12,q3=$13,xba=$14,updated_at=NOW()`,
          [id,l.name||'',l.phone||'',l.status||'Yangi',l.country||'',l.sector||'',
           l.source||'',l.gender||'',l.comment||'',l.note||'',
           !!l.q1,!!l.q2,!!l.q3,!!l.xba]
        );
      } catch (e) { errors.push(`${id}: ${e.message}`); }
    }
    await client.query('COMMIT');
    res.json({ added, updated, errors: errors.slice(0, 10) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────
app.get('/api/transactions', auth, async (req, res) => {
  const { lead_id, type, month } = req.query;
  const conditions = [], params = [];
  if (lead_id) { conditions.push(`t.lead_id=$${params.length+1}`); params.push(lead_id); }
  if (type) { conditions.push(`t.type=$${params.length+1}`); params.push(type); }
  if (month) { conditions.push(`TO_CHAR(t.date,'YYYY-MM')=$${params.length+1}`); params.push(month); }
  const where = conditions.length ? 'WHERE '+conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name as lead_name, u.name as created_by_name
       FROM transactions t
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN users u ON t.created_by = u.id
       ${where} ORDER BY t.date DESC, t.created_at DESC`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (lead_id, date, type, category, description, amount, currency, receipt_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [t.leadId||null, t.date||new Date().toISOString().slice(0,10), t.type, t.category, t.description,
       t.amount, t.currency||'UZS', t.receiptUrl||null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/transactions/:id', auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transactions SET lead_id=$1,date=$2,type=$3,category=$4,description=$5,amount=$6,receipt_url=$7
       WHERE id=$8 RETURNING *`,
      [t.leadId||null, t.date, t.type, t.category, t.description, t.amount, t.receiptUrl||null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── TASKS ────────────────────────────────────────────────────────────────────
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name as lead_name, u.name as assignee_name, u.color as assignee_color, u.avatar as assignee_av
       FROM tasks t
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN users u ON t.assignee = u.id
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, assignee, lead_id, priority, status, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [t.title, t.description||null, t.assignee||null, t.leadId||null,
       t.priority||'medium', t.status||'todo', t.dueDate||null, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1,description=$2,assignee=$3,lead_id=$4,priority=$5,status=$6,due_date=$7
       WHERE id=$8 RETURNING *`,
      [t.title,t.description||null,t.assignee||null,t.leadId||null,
       t.priority||'medium',t.status||'todo',t.dueDate||null,req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get('/api/users', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct,salary_items FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', auth, adminOnly, async (req, res) => {
  const u = req.body;
  const hash = await bcrypt.hash(u.password || 'password123', 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username,password,name,role,avatar,color,phone,email,salary,salary_type,salary_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (username) DO UPDATE SET name=$3,role=$4,avatar=$5,color=$6,phone=$7,email=$8,salary=$9,salary_type=$10,salary_pct=$11
       RETURNING id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct`,
      [u.username,hash,u.name,u.role||'sales',u.avatar||'',u.color||'#6366f1',
       u.phone||null,u.email||null,u.salary||0,u.salaryType||'fixed',u.salaryPct||0]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', auth, adminOnly, async (req, res) => {
  const u = req.body;
  try {
    const updates = [];
    const params = [];
    const fields = {name:'name',role:'role',avatar:'avatar',color:'color',phone:'phone',email:'email',active:'active',salary:'salary',salaryType:'salary_type',salaryPct:'salary_pct',salaryItems:'salary_items'};
    Object.entries(fields).forEach(([k,col]) => {
      if (u[k] !== undefined) { params.push(u[k] === null ? null : (k==='salaryItems'?JSON.stringify(u[k]):u[k])); updates.push(`${col}=$${params.length}`); }
    });
    if (u.password) { params.push(await bcrypt.hash(u.password, 10)); updates.push(`password=$${params.length}`); }
    if (!updates.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(',')} WHERE id=$${params.length} RETURNING id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct,salary_items`,
      params
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CONFIG ───────────────────────────────────────────────────────────────────
app.get('/api/config', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM config');
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    res.json(cfg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/config/:key', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [req.params.key, JSON.stringify(req.body.value)]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}`, originalName: req.file.originalname });
});

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get('/api/stats', auth, async (req, res) => {
  try {
    const [counts, finance, sources] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT type, SUM(amount) as total FROM transactions GROUP BY type`),
      pool.query(`SELECT source, COUNT(*) as count FROM leads WHERE source IS NOT NULL AND source != '' GROUP BY source ORDER BY count DESC LIMIT 10`),
    ]);
    res.json({
      statusCounts: counts.rows,
      finance: finance.rows,
      sources: sources.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── WEBHOOK (Make.com / Tally / Meta) ───────────────────────────────────────
app.post('/api/webhook/lead', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.WEBHOOK_KEY && process.env.WEBHOOK_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const data = req.body;
  const id = data.id || `NO-WH-${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO leads (id,name,phone,status,country,source,comment,telegram)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO NOTHING`,
      [id, data.name||data.full_name||'', data.phone||'', data.status||'Yangi',
       data.country||'', data.source||'Onlayn Ariza', data.comment||data.message||'',
       data.telegram||'']
    );
    res.json({ ok: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  // app.use(express.static(path.join(__dirname, '../client/dist')));
  // app.get('*', (req, res) => {
  //   res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  // });
  app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'OneJobs CRM API is running' });
});
}


// ═══════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS — Tally + Meta Ads + Make.com
// ═══════════════════════════════════════════════════════════

// ─── TALLY FORMS ──────────────────────────────────────────
app.post('/api/webhook/tally', async (req, res) => {
  res.sendStatus(200); // Tally ga darhol javob bering

  try {
    const payload = req.body;
    if (!payload?.data?.fields) return;

    const get = (label) => {
      const f = payload.data.fields.find(f =>
        f.label?.toLowerCase().includes(label.toLowerCase())
      );
      if (!f) return '';
      return Array.isArray(f.value) ? f.value.join(', ') : (f.value || '');
    };

    const name    = get('ism') || get('name') || get('full') || 'Noma\'lum';
    const phone   = get('telefon') || get('phone') || get('tel') || '';
    const country = get('mamlaket') || get('country') || get('davlat') || '';
    const pos     = get('lavozim') || get('position') || get('kasb') || '';
    const comment = get('izoh') || get('comment') || '';
    // Agar formda "hamkor" yoki "partner" maydoni bo'lsa, source shu bo'ladi
    const source  = payload.data.fields.find(f =>
                      f.label?.toLowerCase().includes('hamkor') ||
                      f.label?.toLowerCase().includes('partner')
                    )?.value || 'Tally Form';

    const id = 'TALLY-' + Date.now();
    await pool.query(
      `INSERT INTO leads (id,name,phone,status,country,position,source,reklama_name,comment,created_at)
       VALUES ($1,$2,$3,'Yangi',$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, name, phone, country, pos, source, payload.formName||'', comment]
    );
    console.log('✅ Tally lead:', id, name, phone);
  } catch (err) {
    console.error('Tally error:', err.message);
  }
});

// ─── META ADS — Verification ──────────────────────────────
app.get('/api/webhook/meta', (req, res) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'onejobs2026';
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
    console.log('✅ Meta webhook tasdiqlandi');
  } else {
    res.sendStatus(403);
  }
});

// ─── META ADS — New Lead ──────────────────────────────────
app.post('/api/webhook/meta', async (req, res) => {
  res.sendStatus(200);

  try {
    for (const entry of req.body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const leadgenId = change.value.leadgen_id;

        // Meta Graph API dan to'liq ma'lumot olinadi
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${process.env.META_PAGE_TOKEN}`
        );
        const data = await r.json();
        if (data.error) { console.error('Meta API:', data.error); continue; }

        const f = {};
        for (const field of data.field_data || []) {
          f[field.name] = field.values?.[0] || '';
        }

        const id = 'META-' + leadgenId;
        await pool.query(
          `INSERT INTO leads (id,name,phone,status,country,source,reklama_name,comment,created_at)
           VALUES ($1,$2,$3,'Yangi',$4,'Meta Ads',$5,$6,NOW())
           ON CONFLICT (id) DO NOTHING`,
          [id,
           f.full_name || f.name || 'Noma\'lum',
           f.phone_number || f.phone || '',
           f.country || f.city || '',
           change.value.ad_name || '',
           `Ad: ${change.value.ad_id||''}`]
        );
        console.log('✅ Meta lead:', id, f.full_name, f.phone_number);
      }
    }
  } catch (err) {
    console.error('Meta error:', err.message);
  }
});
// ═══════════════════════════════════════════════════════════

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 OneJobs CRM API running on port ${PORT}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'Using default localhost'}`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
