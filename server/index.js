/**
 * OneJobs CRM - Express.js API Server
 * Node.js + PostgreSQL backend
 */

const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "onejobs-secret-change-in-production";

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:password@localhost:5432/onejobs",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => cb(null, true), // allow all origins (needed for Tally/Meta)
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token required" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminOnly = (req, res, next) => {
  if (!["admin", "manager"].includes(req.user.role))
    return res.status(403).json({ error: "Admin only" });
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND active = TRUE",
      [username],
    );
    if (!rows[0])
      return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Parol noto'g'ri" });

    const token = jwt.sign(
      {
        id: rows[0].id,
        username: rows[0].username,
        role: rows[0].role,
        name: rows[0].name,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    const { password: _, ...user } = rows[0];
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LEADS ROUTES ─────────────────────────────────────────────────────────────
// New leads since timestamp — registered BEFORE /:id to avoid route shadowing
app.get("/api/leads/new", auth, async (req, res) => {
  try {
    const since = req.query.since || new Date(0).toISOString();
    const { rows } = await pool.query(
      "SELECT * FROM leads WHERE created_at > $1 ORDER BY created_at DESC LIMIT 50",
      [since],
    );
    res.json({ leads: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leads", auth, async (req, res) => {
  const {
    status,
    country,
    source,
    owner,
    search,
    page = 1,
    limit = 100,
  } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push(`l.status = $${params.length + 1}`);
    params.push(status);
  }
  if (country) {
    conditions.push(`l.country ILIKE $${params.length + 1}`);
    params.push(`%${country}%`);
  }
  if (source) {
    conditions.push(`l.source = $${params.length + 1}`);
    params.push(source);
  }
  if (owner) {
    conditions.push(
      `(u_s.name ILIKE $${params.length + 1} OR u_c.name ILIKE $${params.length + 1} OR u_d.name ILIKE $${params.length + 1})`,
    );
    params.push(`%${owner}%`);
  }
  if (search) {
    conditions.push(
      `(l.name ILIKE $${params.length + 1} OR l.phone ILIKE $${params.length + 1} OR l.id ILIKE $${params.length + 1} OR l.comment ILIKE $${params.length + 1})`,
    );
    params.push(`%${search}%`);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

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
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const [leads, count] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT COUNT(*) FROM leads l LEFT JOIN users u_s ON l.owner_sales = u_s.id LEFT JOIN users u_c ON l.owner_consult = u_c.id LEFT JOIN users u_d ON l.owner_docs = u_d.id ${where}`,
        params.slice(0, -2),
      ),
    ]);

    res.json({
      leads: leads.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leads/:id", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, 
        u_s.name as owner_sales_name, u_c.name as owner_consult_name, u_d.name as owner_docs_name
       FROM leads l
       LEFT JOIN users u_s ON l.owner_sales = u_s.id
       LEFT JOIN users u_c ON l.owner_consult = u_c.id
       LEFT JOIN users u_d ON l.owner_docs = u_d.id
       WHERE l.id = $1`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Lead topilmadi" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leads", auth, async (req, res) => {
  const l = req.body;
  const id = l.id || `NO-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      `
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
      [
        id,
        l.name,
        l.phone,
        l.telegram,
        l.status,
        l.country,
        l.sector,
        l.position,
        l.source,
        l.gender,
        l.comment,
        l.note,
        l.ownerSales || null,
        l.ownerConsult || null,
        l.ownerDocs || null,
        l.q1 || false,
        l.q2 || false,
        l.q3 || false,
        l.xba || false,
        l.kpiSales || false,
        l.kpiConsult || false,
        l.kpiDocs || false,
        JSON.stringify(l.cv || {}),
        JSON.stringify(l.docs || {}),
        JSON.stringify(l.history || []),
        l.lastContact || null,
        l.contractDate || null,
        l.interviewDate || null,
        l.dest || null,
        l.sofFoyda || null,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/leads/:id", auth, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM leads WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BULK CSV IMPORT ──────────────────────────────────────────────────────────
app.post("/api/leads/bulk", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    const leads = req.body.leads || [];

    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: "leads must be an array" });
    }

    await client.query("BEGIN");

    let inserted = 0;
    let updated = 0;

    for (const l of leads) {
      const id =
        l.id || `IMP-${Date.now()}-${Math.floor(Math.random() * 999999)}`;

      const result = await client.query(
        `
        INSERT INTO leads
        (id, name, phone, telegram, status, country, sector, position, source, gender, comment, note, cv, docs, history)
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'{}','{}','[]')
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          telegram = EXCLUDED.telegram,
          status = EXCLUDED.status,
          country = EXCLUDED.country,
          sector = EXCLUDED.sector,
          position = EXCLUDED.position,
          source = EXCLUDED.source,
          gender = EXCLUDED.gender,
          comment = EXCLUDED.comment,
          note = EXCLUDED.note,
          updated_at = NOW()
        RETURNING xmax
        `,
        [
          id,
          l.name || "",
          l.phone || "",
          l.telegram || "",
          l.status || "Yangi",
          l.country || "",
          l.sector || "",
          l.position || "",
          l.source || "CSV Import",
          l.gender || "",
          l.comment || "",
          l.note || "",
        ],
      );

      if (result.rows[0].xmax === "0") inserted++;
      else updated++;
    }

    await client.query("COMMIT");

    res.json({ ok: true, inserted, updated });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk import error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────────
app.get("/api/transactions", auth, async (req, res) => {
  const { lead_id, type, month } = req.query;
  const conditions = [],
    params = [];
  if (lead_id) {
    conditions.push(`t.lead_id=$${params.length + 1}`);
    params.push(lead_id);
  }
  if (type) {
    conditions.push(`t.type=$${params.length + 1}`);
    params.push(type);
  }
  if (month) {
    conditions.push(`TO_CHAR(t.date,'YYYY-MM')=$${params.length + 1}`);
    params.push(month);
  }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name as lead_name, u.name as created_by_name
       FROM transactions t
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN users u ON t.created_by = u.id
       ${where} ORDER BY t.date DESC, t.created_at DESC`,
      params,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transactions", auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO transactions (lead_id, date, type, category, description, amount, currency, receipt_url, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        t.leadId || null,
        t.date || new Date().toISOString().slice(0, 10),
        t.type,
        t.category,
        t.description,
        t.amount,
        t.currency || "UZS",
        t.receiptUrl || null,
        req.user.id,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/transactions/:id", auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE transactions SET lead_id=$1,date=$2,type=$3,category=$4,description=$5,amount=$6,receipt_url=$7
       WHERE id=$8 RETURNING *`,
      [
        t.leadId || null,
        t.date,
        t.type,
        t.category,
        t.description,
        t.amount,
        t.receiptUrl || null,
        req.params.id,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/transactions/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM transactions WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TASKS ────────────────────────────────────────────────────────────────────
app.get("/api/tasks", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, l.name as lead_name, u.name as assignee_name, u.color as assignee_color, u.avatar as assignee_av
       FROM tasks t
       LEFT JOIN leads l ON t.lead_id = l.id
       LEFT JOIN users u ON t.assignee = u.id
       ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, assignee, lead_id, priority, status, due_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        t.title,
        t.description || null,
        t.assignee || null,
        t.leadId || null,
        t.priority || "medium",
        t.status || "todo",
        t.dueDate || null,
        req.user.id,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/tasks/:id", auth, async (req, res) => {
  const t = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1,description=$2,assignee=$3,lead_id=$4,priority=$5,status=$6,due_date=$7
       WHERE id=$8 RETURNING *`,
      [
        t.title,
        t.description || null,
        t.assignee || null,
        t.leadId || null,
        t.priority || "medium",
        t.status || "todo",
        t.dueDate || null,
        req.params.id,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM tasks WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
app.get("/api/users", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct,salary_items FROM users ORDER BY id",
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", auth, adminOnly, async (req, res) => {
  const u = req.body;
  const hash = await bcrypt.hash(u.password || "password123", 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username,password,name,role,avatar,color,phone,email,salary,salary_type,salary_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (username) DO UPDATE SET name=$3,role=$4,avatar=$5,color=$6,phone=$7,email=$8,salary=$9,salary_type=$10,salary_pct=$11
       RETURNING id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct`,
      [
        u.username,
        hash,
        u.name,
        u.role || "sales",
        u.avatar || "",
        u.color || "#6366f1",
        u.phone || null,
        u.email || null,
        u.salary || 0,
        u.salaryType || "fixed",
        u.salaryPct || 0,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", auth, adminOnly, async (req, res) => {
  const u = req.body;
  try {
    const updates = [];
    const params = [];
    const fields = {
      name: "name",
      role: "role",
      avatar: "avatar",
      color: "color",
      phone: "phone",
      email: "email",
      active: "active",
      salary: "salary",
      salaryType: "salary_type",
      salaryPct: "salary_pct",
      salaryItems: "salary_items",
    };
    Object.entries(fields).forEach(([k, col]) => {
      if (u[k] !== undefined) {
        params.push(
          u[k] === null
            ? null
            : k === "salaryItems"
              ? JSON.stringify(u[k])
              : u[k],
        );
        updates.push(`${col}=$${params.length}`);
      }
    });
    if (u.password) {
      params.push(await bcrypt.hash(u.password, 10));
      updates.push(`password=$${params.length}`);
    }
    if (!updates.length) return res.json({ ok: true });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(",")} WHERE id=$${params.length} RETURNING id,username,name,role,avatar,color,phone,email,active,salary,salary_type,salary_pct,salary_items`,
      params,
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
app.get("/api/notifications", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
      [req.user.id],
    );
    res.json(rows.map(r => ({
      id: String(r.id), msg: r.message, type: r.type,
      read: r.read, at: r.created_at,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/notifications", auth, async (req, res) => {
  const { message, type } = req.body;
  try {
    const { rows } = await pool.query(
      "INSERT INTO notifications (user_id, message, type) VALUES ($1,$2,$3) RETURNING *",
      [req.user.id, message, type || "info"],
    );
    res.json({ id: String(rows[0].id), msg: rows[0].message, type: rows[0].type, read: false, at: rows[0].created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/notifications/:id/read", auth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read=TRUE WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/notifications/read-all", auth, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET read=TRUE WHERE user_id=$1", [req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/notifications/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/notifications", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM notifications WHERE user_id=$1 AND read=TRUE", [req.user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CONFIG ───────────────────────────────────────────────────────────────────
app.get("/api/config", auth, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT key, value FROM config");
    const cfg = {};
    rows.forEach((r) => {
      cfg[r.key] = r.value;
    });
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/config/:key", auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [req.params.key, JSON.stringify(req.body.value)],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
  });
});

// ─── STATS ────────────────────────────────────────────────────────────────────
app.get("/api/stats", auth, async (req, res) => {
  try {
    const [counts, finance, sources] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC`,
      ),
      pool.query(
        `SELECT type, SUM(amount) as total FROM transactions GROUP BY type`,
      ),
      pool.query(
        `SELECT source, COUNT(*) as count FROM leads WHERE source IS NOT NULL AND source != '' GROUP BY source ORDER BY count DESC LIMIT 10`,
      ),
    ]);
    res.json({
      statusCounts: counts.rows,
      finance: finance.rows,
      sources: sources.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WEBHOOK (Make.com / Tally / Meta) ───────────────────────────────────────
app.post("/api/webhook/lead", async (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== process.env.WEBHOOK_KEY && process.env.WEBHOOK_KEY) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const data = req.body;
  const id = data.id || `NO-WH-${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO leads (id, name, phone, status, country, source, comment, telegram)
       VALUES ($1, $2, $3, 'Yangi', $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        data.full_name || data.name || "Noma'lum",
        data.phone_number || data.phone || "",
        data.country || data.city || "",
        data.source || "Webhook",
        data.comment || data.message || "",
        data.telegram || "",
      ],
    );
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  // app.use(express.static(path.join(__dirname, '../client/dist')));
  // app.get('*', (req, res) => {
  //   res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  // });
  app.get("/", (req, res) => {
    res.json({ status: "ok", message: "OneJobs CRM API is running" });
  });
}

// ═══════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS — Tally + Meta Ads + Make.com
// ═══════════════════════════════════════════════════════════

// ─── TALLY FORMS ──────────────────────────────────────────
app.post("/api/webhook/tally", async (req, res) => {
  res.sendStatus(200);

  try {
    const payload = req.body;
    const fields = payload?.data?.fields || payload?.fields || [];

    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/ʻ/g, "'")
        .replace(/‘/g, "'")
        .replace(/`/g, "'");

    const get = (...labels) => {
      for (const label of labels) {
        const f = fields.find((x) => norm(x.label).includes(norm(label)));
        if (!f) continue;

        if (Array.isArray(f.value)) {
          return f.value
            .map((v) => {
              const opt = f.options?.find((o) => o.id === v);
              return opt ? opt.text : v;
            })
            .join(", ");
        }

        return f.value || "";
      }
      return "";
    };

    const id = "TALLY-" + Date.now();

    const name =
      get("isim", "ism", "familya", "fio", "full name", "name") || "Noma'lum";
    const phone = get("telefon", "phone", "tel", "raqam");
    const telegram = get("telegram", "username");
    const country =
      get("davlat", "mamlakat", "country", "qaysi davlat") || "Janubiy Koreya";
    const sector = get("kasb", "yo'nalish", "yonalish", "faoliyat");
    const source = get("qayerdan", "biz haqimizda", "source") || "Tally Form";
    const comment = get("izoh", "comment", "xabar", "tillar");

    await pool.query(
      `INSERT INTO leads
       (id, name, phone, telegram, status, country, sector, source, comment, cv, docs, history)
       VALUES
       ($1,$2,$3,$4,'Yangi',$5,$6,$7,$8,'{}','{}','[]')
       ON CONFLICT (id) DO NOTHING`,
      [id, name, phone, telegram, country, sector, source, comment],
    );

    console.log("✅ Tally lead saved:", id, name, phone);
  } catch (err) {
    console.error("❌ Tally webhook error:", err.message);
  }
});

// ─── META ADS — Verification ──────────────────────────────
app.get("/api/webhook/meta", (req, res) => {
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "onejobs2026";
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    res.send(req.query["hub.challenge"]);
    console.log("✅ Meta webhook tasdiqlandi");
  } else {
    res.sendStatus(403);
  }
});

// ─── META ADS — New Lead ──────────────────────────────────
app.post("/api/webhook/meta", async (req, res) => {
  res.sendStatus(200);

  try {
    for (const entry of req.body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value.leadgen_id;

        // Meta Graph API dan to'liq ma'lumot olinadi
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${process.env.META_PAGE_TOKEN}`,
        );
        const data = await r.json();
        if (data.error) {
          console.error("Meta API:", data.error);
          continue;
        }

        const f = {};
        for (const field of data.field_data || []) {
          f[field.name] = field.values?.[0] || "";
        }

        const id = "META-" + leadgenId;
        await pool.query(
          `INSERT INTO leads (id,name,phone,status,country,source,reklama_name,comment,created_at)
           VALUES ($1,$2,$3,'Yangi',$4,'Meta Ads',$5,$6,NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            id,
            f.full_name || f.name || "Noma'lum",
            f.phone_number || f.phone || "",
            f.country || f.city || "",
            change.value.ad_name || "",
            `Ad: ${change.value.ad_id || ""}`,
          ],
        );
        console.log("✅ Meta lead:", id, f.full_name, f.phone_number);
      }
    }
  } catch (err) {
    console.error("Meta error:", err.message);
  }
});
// ─── VACANCIES ───────────────────────────────────────────────────────────────
const vacRow = (r) => ({
  id: r.id, title: r.title, company: r.company, country: r.country,
  jobType: r.job_type, contractType: r.contract_type, salary: r.salary,
  additionalPay: r.additional_pay, workingHours: r.working_hours,
  positions: r.positions, accommodation: r.accommodation,
  foodVouchers: r.food_vouchers, logo: r.logo,
  description: r.description, requirements: r.requirements,
  otherDesc: r.other_desc, postedDate: r.posted_date?.toISOString?.()?.slice(0,10) || r.posted_date,
  status: r.status, createdAt: r.created_at,
  candidateCount: Number(r.candidate_count || 0),
  hiredCount: Number(r.hired_count || 0),
  approvedCount: Number(r.approved_count || 0),
});

app.get("/api/vacancies", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
        COUNT(c.id) FILTER (WHERE c.id IS NOT NULL) as candidate_count,
        COUNT(c.id) FILTER (WHERE c.status IN ('hired','approved')) as hired_count,
        COUNT(c.id) FILTER (WHERE c.status = 'approved') as approved_count
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id = v.id
       GROUP BY v.id ORDER BY v.created_at DESC`,
    );
    res.json(rows.map(vacRow));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/vacancies", auth, async (req, res) => {
  const b = req.body;
  const id = b.id || `VAC-${Date.now()}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO vacancies (id, title, company, country, job_type, contract_type, salary,
         additional_pay, working_hours, positions, accommodation, food_vouchers, logo,
         description, requirements, other_desc, posted_date, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (id) DO UPDATE SET
         title=$2, company=$3, country=$4, job_type=$5, contract_type=$6, salary=$7,
         additional_pay=$8, working_hours=$9, positions=$10, accommodation=$11,
         food_vouchers=$12, logo=$13, description=$14, requirements=$15,
         other_desc=$16, posted_date=$17, status=$18, updated_at=NOW()
       RETURNING *`,
      [id, b.title, b.company||null, b.country||null, b.jobType||null, b.contractType||null,
       b.salary||null, b.additionalPay||null, b.workingHours||null, b.positions||1,
       b.accommodation||null, b.foodVouchers||null, b.logo||null,
       b.description||null, b.requirements||null, b.otherDesc||null,
       b.postedDate||new Date().toISOString().slice(0,10), b.status||"active", req.user.id],
    );
    res.json(vacRow({ ...rows[0], candidate_count: 0, hired_count: 0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/vacancies/:id", auth, async (req, res) => {
  const b = req.body;
  try {
    await pool.query(
      `UPDATE vacancies SET title=$1, company=$2, country=$3, job_type=$4, contract_type=$5,
         salary=$6, additional_pay=$7, working_hours=$8, positions=$9, accommodation=$10,
         food_vouchers=$11, logo=$12, description=$13, requirements=$14, other_desc=$15,
         posted_date=$16, status=$17, updated_at=NOW()
       WHERE id=$18`,
      [b.title, b.company||null, b.country||null, b.jobType||null, b.contractType||null,
       b.salary||null, b.additionalPay||null, b.workingHours||null, b.positions||1,
       b.accommodation||null, b.foodVouchers||null, b.logo||null,
       b.description||null, b.requirements||null, b.otherDesc||null,
       b.postedDate||null, b.status||"active", req.params.id],
    );
    const { rows } = await pool.query(
      `SELECT v.*,
        COUNT(c.id) FILTER (WHERE c.id IS NOT NULL) as candidate_count,
        COUNT(c.id) FILTER (WHERE c.status IN ('hired','approved')) as hired_count,
        COUNT(c.id) FILTER (WHERE c.status = 'approved') as approved_count
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id = v.id
       WHERE v.id=$1 GROUP BY v.id`,
      [req.params.id],
    );
    res.json(vacRow(rows[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/vacancies/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM vacancies WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CANDIDATES ──────────────────────────────────────────────────────────────

// Get all candidacies for a specific lead (for client profile vacancy tab)
app.get("/api/candidates", auth, async (req, res) => {
  const { lead_id } = req.query;
  if (!lead_id) return res.status(400).json({ error: "lead_id required" });
  try {
    const { rows } = await pool.query(
      `SELECT c.*, v.title as vacancy_title, v.company, v.country
       FROM candidates c
       LEFT JOIN vacancies v ON v.id = c.vacancy_id
       WHERE c.lead_id = $1 ORDER BY c.created_at DESC`,
      [lead_id],
    );
    res.json(rows.map(r => ({
      id: String(r.id), vacancyId: r.vacancy_id, leadId: r.lead_id,
      vacancy_title: r.vacancy_title, company: r.company, country: r.country,
      name: r.name, phone: r.phone, status: r.status, note: r.note,
      appliedAt: r.applied_at,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/vacancies/:id/candidates", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, l.name as lead_name, l.phone as lead_phone
       FROM candidates c
       LEFT JOIN leads l ON l.id=c.lead_id
       WHERE c.vacancy_id=$1 ORDER BY c.created_at DESC`,
      [req.params.id],
    );
    res.json(rows.map(r => ({
      id: String(r.id), vacancyId: r.vacancy_id, leadId: r.lead_id,
      leadName: r.lead_name || r.name, leadPhone: r.lead_phone || r.phone,
      name: r.name, phone: r.phone, status: r.status, note: r.note,
      appliedAt: r.applied_at,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/candidates", auth, async (req, res) => {
  const { vacancy_id, lead_id, name, phone, status, note, applied_at } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO candidates (vacancy_id, lead_id, name, phone, status, note, applied_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [vacancy_id, lead_id||null, name, phone||null, status||"applied", note||null, applied_at||null],
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/candidates/:id", auth, async (req, res) => {
  const { name, phone, status, note } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE candidates SET name=$1, phone=$2, status=$3, note=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, phone||null, status, note||null, req.params.id],
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/candidates/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM candidates WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── EXTERNAL EXPENSES ───────────────────────────────────────────────────────
app.get("/api/external-expenses", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM external_expenses ORDER BY date DESC, created_at DESC",
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/external-expenses", auth, async (req, res) => {
  const { date, category, description, amount, recurring } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO external_expenses (date, category, description, amount, recurring, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [date||new Date().toISOString().slice(0,10), category, description||null,
       amount||0, recurring||false, req.user.id],
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/external-expenses/:id", auth, async (req, res) => {
  const { date, category, description, amount, recurring } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE external_expenses SET date=$1, category=$2, description=$3, amount=$4, recurring=$5
       WHERE id=$6 RETURNING *`,
      [date, category, description||null, amount||0, recurring||false, req.params.id],
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/external-expenses/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM external_expenses WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 OneJobs CRM API running on port ${PORT}`);
  console.log(
    `   Database: ${process.env.DATABASE_URL ? "Connected" : "Using default localhost"}`,
  );
  console.log(`   Env: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
