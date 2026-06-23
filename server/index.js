/**
 * OneJobs CRM - Express.js API Server
 * Node.js + PostgreSQL backend
 */

const express = require("express");
const pg = require("pg");
const { Pool } = pg;
// Return timestamps as ISO strings instead of Date objects
pg.types.setTypeParser(1114, v => v); // TIMESTAMP
pg.types.setTypeParser(1184, v => v); // TIMESTAMPTZ
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

// ─── PUBLIC TRACKING ─────────────────────────────────────────────────────────
// No auth required — clients use this to check their application status
app.get("/api/track/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, status, country, position, sector, created_at, history
       FROM leads WHERE id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Topilmadi" });
    const l = rows[0];
    // Only expose non-sensitive fields to the public
    res.json({
      id: l.id,
      name: l.name,
      status: l.status,
      country: l.country || null,
      position: l.position || l.sector || null,
      createdAt: l.created_at,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
    // Duplicate check: phone (hard block) + name (soft, bypassable with force=true)
    if (l.phone) {
      const digits = (l.phone.match(/\d/g) || []).join("");
      if (digits.length >= 7) {
        const phoneDup = await pool.query(
          `SELECT id, name, phone, status FROM leads WHERE regexp_replace(phone,'[^0-9]','','g') LIKE $1 LIMIT 1`,
          [`%${digits.slice(-9)}`]
        );
        if (phoneDup.rows.length > 0 && phoneDup.rows[0].id !== (l.id || "")) {
          return res.status(409).json({ duplicates: phoneDup.rows, message: `Bu telefon raqam allaqachon ro'yxatda: ${phoneDup.rows[0].name} (${phoneDup.rows[0].id})` });
        }
      }
    }
    // Name duplicate check removed — similar names are allowed
    const { rows } = await pool.query(
      `
      INSERT INTO leads (id, name, phone, telegram, status, country, sector, position, source, gender,
        comment, note, owner_sales, owner_consult, owner_docs, q1, q2, q3, xba,
        kpi_sales, kpi_consult, kpi_docs, cv, docs, history,
        last_contact, contract_date, interview_date, dest, sof_foyda, quality, quality_note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)
      ON CONFLICT (id) DO UPDATE SET
        name=$2, phone=$3, telegram=$4, status=$5, country=$6, sector=$7, position=$8, source=$9, gender=$10,
        comment=$11, note=$12, owner_sales=$13, owner_consult=$14, owner_docs=$15, q1=$16, q2=$17, q3=$18, xba=$19,
        kpi_sales=$20, kpi_consult=$21, kpi_docs=$22, cv=$23, docs=$24, history=$25,
        last_contact=$26, contract_date=$27, interview_date=$28, dest=$29, sof_foyda=$30,
        quality=$31, quality_note=$32, updated_at=NOW()
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
        l.quality || null,
        l.qualityNote || null,
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

// ─── DUPLICATE CHECK ──────────────────────────────────────────────────────────
app.post("/api/leads/check-duplicate", auth, async (req, res) => {
  try {
    const { name, clientNo } = req.body;
    const results = [];
    if (name) {
      const r = await pool.query(
        `SELECT id, name, comment, status, country FROM leads WHERE LOWER(name) LIKE LOWER($1) LIMIT 5`,
        [`%${name.trim()}%`]
      );
      results.push(...r.rows);
    }
    if (clientNo) {
      const r = await pool.query(
        `SELECT id, name, comment, status, country FROM leads WHERE comment LIKE $1 LIMIT 5`,
        [`%${clientNo}%`]
      );
      for (const row of r.rows) {
        if (!results.find(x => x.id === row.id)) results.push(row);
      }
    }
    res.json({ duplicates: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── BULK CSV IMPORT ──────────────────────────────────────────────────────────
app.post("/api/leads/bulk", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const leads = req.body.leads || [];
    const ownerSalesId = req.body.ownerSalesId || null;
    const skipDuplicates = req.body.skipDuplicates !== false;
    const checkByPhone = req.body.checkByPhone === true;

    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: "leads must be an array" });
    }

    await client.query("BEGIN");

    let inserted = 0, updated = 0, skipped = 0;
    const skippedNames = [];

    for (const l of leads) {
      const id = l.uid || l.id || `NO-${Date.now()}${Math.floor(Math.random() * 999)}`;
      const clientNo = l.clientId || "";
      const destParts = (l.dest || l.country || "").split(" ");
      const country = destParts[0] || "";
      const sector = destParts.slice(1).join(" ") || "";
      const statusMap = { progress: "Hujjat", finished: "Jo'nab ketdi" };
      const status = statusMap[l.status] || l.status || "Yangi";
      const sofFoyda = l.netBalance || l.sofFoyda || null;
      const createdAt = l.createdAt || null;
      const source = l.source || null;

      if (checkByPhone && l.phone) {
        const dupCheck = await client.query(
          `SELECT id FROM leads WHERE phone=$1 LIMIT 1`,
          [l.phone]
        );
        if (dupCheck.rows.length > 0) {
          skipped++;
          skippedNames.push(l.name);
          continue;
        }
      } else if (skipDuplicates && (clientNo || l.name)) {
        const dupCheck = await client.query(
          `SELECT id FROM leads WHERE (comment LIKE $1 AND $1 != '') OR (LOWER(name)=LOWER($2) AND $2 != '') LIMIT 1`,
          [`%${clientNo}%`, l.name || ""]
        );
        if (dupCheck.rows.length > 0) {
          skipped++;
          skippedNames.push(l.name);
          continue;
        }
      }

      const result = await client.query(
        `INSERT INTO leads
          (id, name, phone, status, country, sector, comment, note, owner_sales, dest, sof_foyda, source, cv, docs, history, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULLIF($13,''),'{}','{}','[]', COALESCE($12::timestamptz, NOW()))
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, status=EXCLUDED.status, country=EXCLUDED.country,
           sector=EXCLUDED.sector, comment=EXCLUDED.comment, note=EXCLUDED.note,
           owner_sales=COALESCE(EXCLUDED.owner_sales, leads.owner_sales),
           dest=EXCLUDED.dest, sof_foyda=EXCLUDED.sof_foyda,
           source=COALESCE(EXCLUDED.source, leads.source),
           updated_at=NOW()
         RETURNING xmax`,
        [id, l.name||"", l.phone||"", status, country, sector,
         clientNo, l.note||"", ownerSalesId, l.dest||"", sofFoyda, createdAt, source||""]
      );

      if (result.rows[0].xmax === "0") inserted++;
      else updated++;
    }

    await client.query("COMMIT");
    res.json({ ok: true, inserted, updated, skipped, skippedNames });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bulk import error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── CLEAR LEAD FINANCE ───────────────────────────────────────────────────────
app.delete("/api/transactions/lead/:leadId", auth, adminOnly, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM transactions WHERE lead_id=$1", [req.params.leadId]
    );
    res.json({ ok: true, deleted: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      `INSERT INTO transactions (lead_id, date, type, category, description, amount, currency, receipt_url, payment_method, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        t.leadId || null,
        t.date || new Date().toISOString().slice(0, 10),
        t.type,
        t.category,
        t.description,
        t.amount,
        t.currency || "UZS",
        t.receiptUrl || null,
        t.paymentMethod || 'cash',
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
      `UPDATE transactions SET lead_id=$1,date=$2,type=$3,category=$4,description=$5,amount=$6,receipt_url=$7,payment_method=$8
       WHERE id=$9 RETURNING *`,
      [
        t.leadId || null,
        t.date,
        t.type,
        t.category,
        t.description,
        t.amount,
        t.receiptUrl || null,
        t.paymentMethod || 'cash',
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
    const canSalary = ["admin", "finance_manager"].includes(req.user.role);
    const data = canSalary ? rows : rows.map(({ salary, salary_type, salary_pct, salary_items, ...rest }) => rest);
    res.json(data);
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

// Send notification to multiple specific users (for task assignments etc.)
app.post("/api/notifications/send", auth, async (req, res) => {
  const { message, type, userIds } = req.body;
  if (!Array.isArray(userIds) || !userIds.length) return res.json({ ok: true });
  try {
    const unique = [...new Set(userIds.map(Number).filter(Boolean))];
    await Promise.all(unique.map(uid =>
      pool.query(
        "INSERT INTO notifications (user_id, message, type) VALUES ($1,$2,$3)",
        [uid, message, type || "info"]
      )
    ));
    res.json({ ok: true, sent: unique.length });
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
      try { cfg[r.key] = JSON.parse(r.value); } catch(e) { cfg[r.key] = r.value; }
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
  allowedPartners: r.allowed_partners || [],
});

app.get("/api/vacancies", auth, async (req, res) => {
  try {
    const role = req.user.role;
    let whereClause = "";
    let params = [];
    if (role === "employer") {
      whereClause = "WHERE v.created_by=$1";
      params = [req.user.id];
    } else if (role === "partner") {
      whereClause = "WHERE v.allowed_partners @> $1::jsonb";
      params = [JSON.stringify([req.user.id])];
    }
    const { rows } = await pool.query(
      `SELECT v.*,
        COUNT(c.id) FILTER (WHERE c.id IS NOT NULL) as candidate_count,
        COUNT(c.id) FILTER (WHERE c.status IN ('hired','approved')) as hired_count,
        COUNT(c.id) FILTER (WHERE c.status = 'approved') as approved_count
       FROM vacancies v LEFT JOIN candidates c ON c.vacancy_id = v.id
       ${whereClause}
       GROUP BY v.id ORDER BY v.created_at DESC`,
      params
    );
    res.json(rows.map(vacRow));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: assign partners to a vacancy
app.patch("/api/vacancies/:id/partners", auth, adminOnly, async (req, res) => {
  try {
    const { partnerIds } = req.body; // array of user ids
    const { rows } = await pool.query(
      `UPDATE vacancies SET allowed_partners=$1 WHERE id=$2 RETURNING *`,
      [JSON.stringify(partnerIds || []), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(vacRow(rows[0]));
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

// Get all candidate pairs (vacancy_id, lead_id) for vacancy filter
app.get("/api/candidates/all", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.vacancy_id, c.lead_id, v.title as vacancy_title
       FROM candidates c
       LEFT JOIN vacancies v ON v.id = c.vacancy_id`,
    );
    res.json(rows.map(r => ({ vacancyId: r.vacancy_id, leadId: r.lead_id, vacancyTitle: r.vacancy_title })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
  const b = req.body;
  // Support both snake_case (from Vacancies tab) and camelCase (from partner portal)
  const vacancy_id = b.vacancy_id || b.vacancyId;
  const lead_id = b.lead_id || b.leadId || null;
  const name = b.name || b.leadName || "Nomsiz";
  const phone = b.phone || b.leadPhone || null;
  const status = b.status || "applied";
  const note = b.note || null;
  const applied_at = b.applied_at || null;
  if (!vacancy_id) return res.status(400).json({ error: "vacancy_id required" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO candidates (vacancy_id, lead_id, name, phone, status, note, applied_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [vacancy_id, lead_id, name, phone, status, note, applied_at],
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
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const cand = rows[0];

    if (status === 'hired' || status === 'approved') {
      const leadRes = await pool.query("SELECT * FROM leads WHERE id=$1", [cand.lead_id]).catch(()=>({rows:[]}));
      const lead = leadRes.rows[0];

      if (status === 'approved' && lead) {
        const consultId = lead.owner_consult || lead.owner_sales;
        if (consultId) {
          await pool.query(
            `INSERT INTO tasks (title, description, assignee, lead_id, priority, status, due_date, created_by)
             VALUES ($1,$2,$3,$4,'high','todo',(NOW() + INTERVAL '3 days')::DATE::TEXT,$5)`,
            [`Ish beruvchi tasdiqladi: ${lead.name} uchun shartnoma imzolash`, `Ish beruvchi nomzodni tasdiqladi. Shartnoma imzolash bosqichiga o'tkazish kerak.`, consultId, lead.id, req.user.id]
          ).catch(()=>{});
        }
        await pool.query(
          `INSERT INTO notifications (message, type, user_id, created_at) VALUES ($1,'success',$2,NOW())`,
          [`✅ Ish beruvchi nomzodni tasdiqladi: ${lead?.name || cand.lead_id}`, consultId || req.user.id]
        ).catch(()=>{});
      }

      if (status === 'hired' && lead) {
        const partnerRes = await pool.query(
          `SELECT u.id FROM users u WHERE u.role='partner' AND u.id=(SELECT added_by FROM candidates WHERE id=$1)`,
          [cand.id]
        ).catch(()=>({rows:[]}));
        if (partnerRes.rows[0]) {
          await pool.query(
            `INSERT INTO notifications (message, type, user_id, created_at) VALUES ($1,'success',$2,NOW())`,
            [`🎉 Sizning nomzodingiz yollandi: ${lead?.name || 'Nomzod'}! Tabriklaymiz!`, partnerRes.rows[0].id]
          ).catch(()=>{});
        }
      }
    }

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

// ─── DEBTS ────────────────────────────────────────────────────────────────────
app.get("/api/debts", auth, async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'client',
      name TEXT,
      amount NUMERIC DEFAULT 0,
      paid BOOLEAN DEFAULT FALSE,
      due_date TEXT,
      category TEXT,
      description TEXT,
      lead_id TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT NOW()::TEXT
    )`);
    const { rows } = await pool.query("SELECT * FROM debts ORDER BY created_at DESC");
    res.json(rows.map(r => ({
      id: r.id, type: r.type, name: r.name, amount: Number(r.amount),
      paid: r.paid, dueDate: r.due_date, category: r.category,
      desc: r.description, leadId: r.lead_id, by: r.created_by,
      createdAt: r.created_at
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/debts", auth, async (req, res) => {
  const { id, type, name, amount, paid, dueDate, category, desc, leadId } = req.body;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY, type TEXT NOT NULL DEFAULT 'client', name TEXT,
      amount NUMERIC DEFAULT 0, paid BOOLEAN DEFAULT FALSE, due_date TEXT,
      category TEXT, description TEXT, lead_id TEXT, created_by INTEGER, created_at TEXT DEFAULT NOW()::TEXT
    )`);
    const { rows } = await pool.query(
      `INSERT INTO debts (id,type,name,amount,paid,due_date,category,description,lead_id,created_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()::TEXT) RETURNING *`,
      [id || require('crypto').randomUUID(), type||'client', name, Number(amount)||0, paid||false, dueDate||null, category||null, desc||null, leadId||null, req.user.id]
    );
    const r = rows[0];
    res.json({ id:r.id,type:r.type,name:r.name,amount:Number(r.amount),paid:r.paid,dueDate:r.due_date,category:r.category,desc:r.description,leadId:r.lead_id,by:r.created_by,createdAt:r.created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/debts/:id", auth, async (req, res) => {
  const { type, name, amount, paid, dueDate, category, desc, leadId } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE debts SET type=$1,name=$2,amount=$3,paid=$4,due_date=$5,category=$6,description=$7,lead_id=$8
       WHERE id=$9 RETURNING *`,
      [type, name, Number(amount)||0, paid||false, dueDate||null, category||null, desc||null, leadId||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const r = rows[0];
    res.json({ id:r.id,type:r.type,name:r.name,amount:Number(r.amount),paid:r.paid,dueDate:r.due_date,category:r.category,desc:r.description,leadId:r.lead_id,by:r.created_by,createdAt:r.created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/debts/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM debts WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LEAD DOCUMENTS CHECKLIST ─────────────────────────────────────────────────
app.get("/api/leads/:id/documents", auth, async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS lead_documents (
      id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, doc_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending', notes TEXT, updated_by INTEGER, updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(lead_id, doc_type)
    )`);
    const { rows } = await pool.query("SELECT * FROM lead_documents WHERE lead_id=$1 ORDER BY id", [req.params.id]);
    res.json(rows.map(r => ({ id:r.id, leadId:r.lead_id, docType:r.doc_type, status:r.status, notes:r.notes, updatedBy:r.updated_by, updatedAt:r.updated_at })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/leads/:leadId/documents/:docType", auth, async (req, res) => {
  const { status, notes } = req.body;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS lead_documents (
      id SERIAL PRIMARY KEY, lead_id TEXT NOT NULL, doc_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending', notes TEXT, updated_by INTEGER, updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(lead_id, doc_type)
    )`);
    const { rows } = await pool.query(
      `INSERT INTO lead_documents (lead_id, doc_type, status, notes, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (lead_id, doc_type) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes, updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING *`,
      [req.params.leadId, req.params.docType, status||'pending', notes||null, req.user.id]
    );
    const r = rows[0];
    res.json({ id:r.id, leadId:r.lead_id, docType:r.doc_type, status:r.status, notes:r.notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── MONTHLY REPORT (HTML, browser-printable) ─────────────────────────────────
app.get("/api/reports/monthly", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).send("Kirish taqiqlangan");
  let user;
  try { user = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).send("Token noto'g'ri"); }
  if (!["admin","manager"].includes(user.role)) return res.status(403).send("Faqat admin");

  const month = req.query.month || new Date().toISOString().slice(0,7);
  try {
    const [leadRes, txnRes, debtRes] = await Promise.all([
      pool.query(`SELECT * FROM leads WHERE status=$1 AND updated_at::TEXT LIKE $2`, ["Jo'nab ketdi", `${month}%`]),
      pool.query(`SELECT * FROM transactions WHERE date::TEXT LIKE $1`, [`${month}%`]),
      pool.query(`SELECT * FROM debts WHERE paid=FALSE ORDER BY created_at DESC`).catch(()=>({rows:[]})),
    ]);
    const leads = leadRes.rows;
    const txns = txnRes.rows;
    const debts = debtRes.rows;
    const income = txns.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const expense = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const totalDebt = debts.reduce((s,d)=>s+Number(d.amount),0);
    const fmt = n => n.toLocaleString('uz-UZ') + " so'm";
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>OneJobs Hisobot ${month}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{color:#6366f1}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}th{background:#f3f4f6}@media print{button{display:none}}</style></head>
<body>
<button onclick="window.print()" style="float:right;padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer">🖨️ Chop etish</button>
<h1>✈️ OneJobs CRM — Oylik Hisobot</h1>
<p>Davr: <b>${month}</b> | Yaratildi: ${new Date().toLocaleDateString('uz-UZ')}</p>
<h2>📊 Moliya Xulosasi</h2>
<table><tr><th>Ko'rsatkich</th><th>Miqdor</th></tr>
<tr><td>Jami Kirim</td><td style="color:#16a34a"><b>${fmt(income)}</b></td></tr>
<tr><td>Jami Chiqim</td><td style="color:#dc2626"><b>${fmt(expense)}</b></td></tr>
<tr><td>Balans</td><td style="color:${income-expense>=0?'#16a34a':'#dc2626'}"><b>${fmt(income-expense)}</b></td></tr>
<tr><td>To'lanmagan Qarzlar</td><td style="color:#d97706"><b>${fmt(totalDebt)}</b></td></tr>
</table>
<h2>👷 Jo'nab Ketgan Ishchilar (${leads.length} ta)</h2>
<table><tr><th>Ism</th><th>Mamlakat</th><th>Sof Foyda</th><th>Sana</th></tr>
${leads.map(l=>`<tr><td>${l.name||''}</td><td>${l.country||''}</td><td style="color:#16a34a">${fmt(Number(l.sof_foyda||0))}</td><td>${(l.updated_at||'').toString().slice(0,10)}</td></tr>`).join('')}
</table>
<h2>⚠️ Qarzlar (${debts.length} ta)</h2>
<table><tr><th>Ism</th><th>Miqdor</th><th>Muddat</th><th>Turi</th></tr>
${debts.map(d=>`<tr><td>${d.name||''}</td><td style="color:#dc2626">${fmt(Number(d.amount||0))}</td><td>${d.due_date||'—'}</td><td>${d.type||''}</td></tr>`).join('')}
</table>
</body></html>`);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── STALE LEAD AUTO-TASKS ────────────────────────────────────────────────────
const SKIP_STAGES_STALE = ["Jo'nab ketdi", "Rad etildi", "Keyinchalik", "Anchagacha ko'tarmadi"];

async function createStaleTasks() {
  try {
    const { rows: staleLeads } = await pool.query(`
      SELECT l.* FROM leads l
      WHERE l.status NOT IN (${SKIP_STAGES_STALE.map((_,i)=>`$${i+1}`).join(',')})
      AND (l.updated_at < NOW() - INTERVAL '7 days' OR l.updated_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.lead_id = l.id
        AND t.title LIKE 'Mijoz bilan bog%'
        AND t.created_at > NOW() - INTERVAL '7 days'
      )
    `, SKIP_STAGES_STALE);

    for (const lead of staleLeads) {
      const assignee = lead.owner_sales || lead.assigned_to;
      if (!assignee) continue;
      await pool.query(
        `INSERT INTO tasks (title, description, assignee, lead_id, priority, status, due_date, created_by)
         VALUES ($1,$2,$3,$4,'medium','todo',(NOW() + INTERVAL '1 day')::DATE::TEXT,1)`,
        [`Mijoz bilan bog'laning: ${lead.name}`, `Bu vazifa avtomatik yaratildi — mijoz 7 kun davomida faoliyatsiz`, assignee, lead.id]
      ).catch(()=>{});
    }
    if (staleLeads.length > 0) console.log(`✅ Stale tasks created: ${staleLeads.length}`);
  } catch (err) {
    console.error('Stale task cron error:', err.message);
  }
}

app.post("/api/admin/run-stale-tasks", auth, adminOnly, async (req, res) => {
  await createStaleTasks();
  res.json({ ok: true });
});

// ─── DEBTS ────────────────────────────────────────────────────────────────────
const ensureDebtsTable = () => pool.query(`CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'client',
  name TEXT,
  amount NUMERIC DEFAULT 0,
  paid BOOLEAN DEFAULT FALSE,
  due_date TEXT,
  category TEXT,
  description TEXT,
  lead_id TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT NOW()::TEXT
)`).catch(()=>{});

app.get("/api/debts", auth, async (req, res) => {
  try {
    await ensureDebtsTable();
    const { rows } = await pool.query("SELECT * FROM debts ORDER BY paid ASC, created_at DESC");
    res.json(rows.map(r => ({ id:r.id, type:r.type, name:r.name, amount:Number(r.amount), paid:r.paid, dueDate:r.due_date, category:r.category, desc:r.description, leadId:r.lead_id, by:r.created_by, createdAt:r.created_at })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/debts", auth, async (req, res) => {
  const { id, type, name, amount, paid, dueDate, category, desc, leadId } = req.body;
  try {
    await ensureDebtsTable();
    const { rows } = await pool.query(
      `INSERT INTO debts (id,type,name,amount,paid,due_date,category,description,lead_id,created_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()::TEXT) RETURNING *`,
      [id||`D-${Date.now()}`, type||'client', name, Number(amount)||0, paid||false, dueDate||null, category||null, desc||null, leadId||null, req.user.id]
    );
    const r = rows[0];
    res.json({ id:r.id, type:r.type, name:r.name, amount:Number(r.amount), paid:r.paid, dueDate:r.due_date, category:r.category, desc:r.description, leadId:r.lead_id, by:r.created_by, createdAt:r.created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/debts/:id", auth, async (req, res) => {
  const { type, name, amount, paid, dueDate, category, desc, leadId } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE debts SET type=$1,name=$2,amount=$3,paid=$4,due_date=$5,category=$6,description=$7,lead_id=$8 WHERE id=$9 RETURNING *`,
      [type, name, Number(amount)||0, paid||false, dueDate||null, category||null, desc||null, leadId||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const r = rows[0];
    res.json({ id:r.id, type:r.type, name:r.name, amount:Number(r.amount), paid:r.paid, dueDate:r.due_date, category:r.category, desc:r.description, leadId:r.lead_id, by:r.created_by, createdAt:r.created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/debts/:id", auth, async (req, res) => {
  try {
    await pool.query("DELETE FROM debts WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LEAD DOCUMENT CHECKLIST ──────────────────────────────────────────────────
const ensureLeadDocsTable = () => pool.query(`CREATE TABLE IF NOT EXISTS lead_documents (
  id SERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  updated_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, doc_type)
)`).catch(()=>{});

app.get("/api/leads/:id/documents", auth, async (req, res) => {
  try {
    await ensureLeadDocsTable();
    const { rows } = await pool.query("SELECT * FROM lead_documents WHERE lead_id=$1 ORDER BY id", [req.params.id]);
    res.json(rows.map(r => ({ id:r.id, leadId:r.lead_id, docType:r.doc_type, status:r.status, notes:r.notes, updatedBy:r.updated_by, updatedAt:r.updated_at })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/api/leads/:leadId/documents/:docType", auth, async (req, res) => {
  const { status, notes } = req.body;
  try {
    await ensureLeadDocsTable();
    const { rows } = await pool.query(
      `INSERT INTO lead_documents (lead_id, doc_type, status, notes, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (lead_id, doc_type) DO UPDATE SET status=EXCLUDED.status, notes=EXCLUDED.notes, updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING *`,
      [req.params.leadId, req.params.docType, status||'pending', notes||null, req.user.id]
    );
    const r = rows[0];
    res.json({ id:r.id, leadId:r.lead_id, docType:r.doc_type, status:r.status, notes:r.notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── MONTHLY HTML REPORT ──────────────────────────────────────────────────────
app.get("/api/reports/monthly", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] || req.query.token;
  if (!token) return res.status(401).send("Kirish taqiqlangan");
  let ru;
  try { ru = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).send("Token noto'g'ri"); }
  if (!["admin","manager"].includes(ru.role)) return res.status(403).send("Faqat admin");

  const month = req.query.month || new Date().toISOString().slice(0,7);
  const fmt = n => Number(n||0).toLocaleString('uz-UZ') + " so'm";
  try {
    const [lr, tr, dr] = await Promise.all([
      pool.query(`SELECT * FROM leads WHERE status='Jo''nab ketdi' AND updated_at::TEXT LIKE $1`, [`${month}%`]),
      pool.query(`SELECT * FROM transactions WHERE date LIKE $1`, [`${month}%`]),
      pool.query(`SELECT * FROM debts WHERE paid=FALSE ORDER BY created_at DESC`).catch(()=>({rows:[]})),
    ]);
    const leads=lr.rows, txns=tr.rows, debts=dr.rows;
    const inc = txns.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    const exp = txns.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const totalDebt = debts.reduce((s,d)=>s+Number(d.amount),0);
    const totalSofFoyda = leads.reduce((s,l)=>s+Number(l.sof_foyda||0),0);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>OneJobs Hisobot ${month}</title>
<style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:900px;margin:0 auto}h1{color:#6366f1;margin-bottom:4px}h2{color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left}th{background:#f9fafb;font-weight:700}tr:nth-child(even){background:#f9fafb}.green{color:#16a34a;font-weight:700}.red{color:#dc2626;font-weight:700}.blue{color:#6366f1;font-weight:700}.yellow{color:#d97706;font-weight:700}@media print{.noprint{display:none}}</style></head>
<body>
<div class="noprint" style="text-align:right;margin-bottom:20px"><button onclick="window.print()" style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">🖨️ Chop etish / PDF</button></div>
<h1>✈️ OneJobs CRM</h1><p style="color:#6b7280;margin:0 0 24px">Oylik hisobot · <b>${month}</b> · Yaratildi: ${new Date().toLocaleDateString('uz-UZ')}</p>
<h2>📊 Moliyaviy Ko'rsatkichlar</h2>
<table><tr><th>Ko'rsatkich</th><th>Miqdor</th></tr>
<tr><td>Jami Kirim</td><td class="green">${fmt(inc)}</td></tr>
<tr><td>Jami Chiqim</td><td class="red">${fmt(exp)}</td></tr>
<tr><td>Balans (Kirim − Chiqim)</td><td class="${inc-exp>=0?'green':'red'}">${fmt(inc-exp)}</td></tr>
<tr><td>Jo'nab ketganlardan sof foyda</td><td class="blue">${fmt(totalSofFoyda)}</td></tr>
<tr><td>To'lanmagan qarzlar (jami)</td><td class="yellow">${fmt(totalDebt)}</td></tr>
</table>
<h2>👷 Jo'nab Ketgan Ishchilar — ${leads.length} ta</h2>
${leads.length===0?'<p style="color:#6b7280">Bu oyda jo\'nab ketgan ishchi yo\'q</p>':`<table><tr><th>Ism</th><th>Mamlakat</th><th>Manba</th><th>Sof Foyda</th><th>Sana</th></tr>${leads.map(l=>`<tr><td>${l.name||''}</td><td>${l.country||''}</td><td>${l.source||'—'}</td><td class="green">${fmt(l.sof_foyda)}</td><td>${(l.updated_at||'').slice(0,10)}</td></tr>`).join('')}</table>`}
<h2>⚠️ To'lanmagan Qarzlar — ${debts.length} ta</h2>
${debts.length===0?'<p style="color:#16a34a">✅ Barcha qarzlar to\'langan</p>':`<table><tr><th>Ism</th><th>Turi</th><th>Miqdor</th><th>Muddat</th></tr>${debts.map(d=>`<tr><td>${d.name||''}</td><td>${d.type==='client'?'Mijoz':'Kompaniya'}</td><td class="red">${fmt(d.amount)}</td><td style="color:${d.due_date&&new Date(d.due_date)<new Date()?'#dc2626':'#374151'}">${d.due_date||'—'}</td></tr>`).join('')}</table>`}
</body></html>`);
  } catch (err) { res.status(500).send("Xatolik: " + err.message); }
});

// ─── STALE LEAD AUTO-TASKS (nightly cron) ────────────────────────────────────
const SKIP_STAGES = ["Jo'nab ketdi","Rad etildi","Keyinchalik","Anchagacha ko'tarmadi","Arxiv"];

async function createStaleTasks() {
  try {
    const { rows: stale } = await pool.query(`
      SELECT l.* FROM leads l
      WHERE l.status != ALL($1::text[])
      AND (l.updated_at < NOW() - INTERVAL '7 days' OR l.updated_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.lead_id = l.id
        AND t.title LIKE 'Mijoz bilan bog%'
        AND t.created_at > NOW() - INTERVAL '7 days'
      )
    `, [SKIP_STAGES]);

    for (const lead of stale) {
      const assignee = lead.owner_sales || lead.assigned_to;
      if (!assignee) continue;
      await pool.query(
        `INSERT INTO tasks (title, description, assignee, lead_id, priority, status, due_date, created_by)
         VALUES ($1,$2,$3,$4,'medium','todo',(NOW() + INTERVAL '1 day')::DATE::TEXT,1)`,
        [`Mijoz bilan bog'laning: ${lead.name}`, `Avtomatik vazifa — mijoz 7 kun davomida faoliyatsiz`, assignee, lead.id]
      ).catch(()=>{});
    }
    if (stale.length > 0) console.log(`⏰ Stale lead tasks created: ${stale.length}`);
  } catch (err) { console.error('Stale task cron error:', err.message); }
}

// Manual trigger for admin
app.post("/api/admin/run-stale-tasks", auth, adminOnly, async (req, res) => {
  await createStaleTasks();
  res.json({ ok: true, message: "Stale tasks yaratildi" });
});

// Schedule nightly at 00:05
const msUntilMidnight = (() => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 5, 0);
  return next - now;
})();
setTimeout(() => { createStaleTasks(); setInterval(createStaleTasks, 24*60*60*1000); }, msUntilMidnight);

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 OneJobs CRM API running on port ${PORT}`);
  console.log(
    `   Database: ${process.env.DATABASE_URL ? "Connected" : "Using default localhost"}`,
  );
  console.log(`   Env: ${process.env.NODE_ENV || "development"}`);
  try {
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality TEXT`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quality_note TEXT`);
    console.log("   Migrations: quality columns OK");
  } catch (e) {
    console.error("   Migrations error:", e.message);
  }

  // Schedule stale lead auto-tasks at midnight daily
  const now = new Date();
  const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0, 5, 0) - now;
  setTimeout(() => {
    createStaleTasks();
    setInterval(createStaleTasks, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
});

// ─── FACEBOOK LEAD ADS WEBHOOK ───────────────────────────────────────────────
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "onejobs_fb_2026";
const FB_PAGE_TOKEN   = process.env.FB_PAGE_TOKEN   || "EAATFUqrQq2UBR0q9PttKrGEf0bp6mMocEjUMTUhy36RU5eHoOsHiCBhyW3pcqXjioOlTwK91LZBIEuorpmkZAwHmqVTTP5c9XiXdkuoklPSiYcYJDBa3RCkQ5M7ZATQZA8CZBnZCF0DRUMoxxHvaiZB7Gs2fg31BgHVVKZAdXTCSrbn9nbPxJxUCURhH7ZBoekUJd1eitlos1";

// Map Facebook field keys → DB columns
function mapFbLead(fieldData) {
  const m = {};
  (fieldData || []).forEach(({ name, values }) => {
    const v = (values || [])[0] || "";
    const k = name.toLowerCase();
    if (k.includes("full_name") || k.includes("name"))        m.name    = v;
    else if (k.includes("phone"))                              m.phone   = v;
    else if (k.includes("email"))                              m.email   = v;
    else if (k.includes("city") || k.includes("country"))     m.country = v;
    else if (k.includes("job") || k.includes("sector"))       m.sector  = v;
    else                                                       m[k]      = v;
  });
  return m;
}

async function fetchAndSaveFbLead(leadId) {
  if (!FB_PAGE_TOKEN) return;
  const https = require("https");
  const url = `https://graph.facebook.com/v19.0/${leadId}?fields=id,created_time,field_data,form_id&access_token=${FB_PAGE_TOKEN}`;
  const data = await new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); } });
    }).on("error", reject);
  });
  if (data.error) { console.error("FB lead fetch error:", data.error.message); return; }

  const fields = mapFbLead(data.field_data);
  if (!fields.name && !fields.phone) return;

  const phone = fields.phone || "";
  // Skip if phone already exists
  if (phone) {
    const dup = await pool.query("SELECT id FROM leads WHERE phone=$1 LIMIT 1", [phone]);
    if (dup.rows.length > 0) { console.log("FB lead dup phone:", phone); return; }
  }

  // Generate next NO- id
  const last = await pool.query("SELECT id FROM leads WHERE id ~ '^NO-[0-9]+$' ORDER BY CAST(SUBSTRING(id,4) AS BIGINT) DESC LIMIT 1");
  const nextNum = last.rows.length ? parseInt(last.rows[0].id.replace("NO-","")) + 1 : 1;
  const newId = `NO-${nextNum}`;

  await pool.query(
    `INSERT INTO leads (id,name,phone,status,country,sector,source,comment,created_at)
     VALUES ($1,$2,$3,'Yangi',$4,$5,'Target',$6,NOW())`,
    [newId, fields.name||"", phone, fields.country||"", fields.sector||"", fields.email ? `Email: ${fields.email}` : ""]
  );
  console.log(`FB lead saved: ${newId} ${fields.name} ${phone}`);
}

// Webhook verification (Facebook sends GET to confirm endpoint)
app.get("/api/facebook/webhook", (req, res) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
    console.log("Facebook webhook verified");
    return res.send(challenge);
  }
  res.sendStatus(403);
});

// Webhook event receiver
app.post("/api/facebook/webhook", express.json(), async (req, res) => {
  res.sendStatus(200); // acknowledge immediately
  const body = req.body;
  if (body.object !== "page") return;
  for (const entry of (body.entry || [])) {
    for (const change of (entry.changes || [])) {
      if (change.field === "leadgen") {
        const leadId = change.value?.leadgen_id;
        if (leadId) fetchAndSaveFbLead(leadId).catch(console.error);
      }
    }
  }
});

module.exports = app;
