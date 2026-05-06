-- OneJobs CRM - PostgreSQL Schema
-- Run: psql -U postgres -d onejobs -f schema.sql

-- ─── TEAMS / USERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,  -- bcrypt hashed
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'sales',
  avatar      TEXT,
  color       TEXT DEFAULT '#6366f1',
  phone       TEXT,
  email       TEXT,
  active      BOOLEAN DEFAULT TRUE,
  salary      BIGINT DEFAULT 0,
  salary_type TEXT DEFAULT 'fixed',  -- 'fixed' | 'percent'
  salary_pct  INTEGER DEFAULT 0,
  salary_items JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  phone           TEXT,
  telegram        TEXT,
  status          TEXT DEFAULT 'Yangi',
  country         TEXT,
  sector          TEXT,
  position        TEXT,
  source          TEXT,
  gender          TEXT,
  comment         TEXT,
  note            TEXT,
  -- Triple ownership
  owner_sales     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_consult   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  owner_docs      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Payments
  q1              BOOLEAN DEFAULT FALSE,
  q2              BOOLEAN DEFAULT FALSE,
  q3              BOOLEAN DEFAULT FALSE,
  xba             BOOLEAN DEFAULT FALSE,
  q1_receipt      TEXT,
  q2_receipt      TEXT,
  q3_receipt      TEXT,
  xba_receipt     TEXT,
  -- KPI
  kpi_sales       BOOLEAN DEFAULT FALSE,
  kpi_consult     BOOLEAN DEFAULT FALSE,
  kpi_docs        BOOLEAN DEFAULT FALSE,
  -- Finance (cached from transactions)
  total_income    BIGINT DEFAULT 0,
  total_expense   BIGINT DEFAULT 0,
  net_balance     BIGINT DEFAULT 0,
  sof_foyda       BIGINT,
  -- Dates
  last_contact    TEXT,
  contract_date   TEXT,
  interview_date  TEXT,
  dest            TEXT,
  -- Extra data
  cv              JSONB DEFAULT '{}',
  docs            JSONB DEFAULT '{}',
  history         JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_country  ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_source   ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_owner_s  ON leads(owner_sales);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads(created_at DESC);

-- ─── TRANSACTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     TEXT REFERENCES leads(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT NOT NULL,  -- 'income' | 'expense'
  category    TEXT,
  description TEXT,
  amount      BIGINT NOT NULL DEFAULT 0,
  currency    TEXT DEFAULT 'UZS',
  receipt_url TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_lead    ON transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_txn_date    ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_txn_type    ON transactions(type);

-- ─── TASKS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  assignee    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  lead_id     TEXT REFERENCES leads(id) ON DELETE CASCADE,
  priority    TEXT DEFAULT 'medium',
  status      TEXT DEFAULT 'todo',
  due_date    DATE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_lead     ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);

-- ─── CONFIG ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info',
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRIGGER: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── TRIGGER: recalculate lead balance after transaction ─────────────────────
CREATE OR REPLACE FUNCTION recalc_lead_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id TEXT;
  v_inc BIGINT;
  v_exp BIGINT;
BEGIN
  v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  IF v_lead_id IS NULL THEN RETURN NEW; END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type='income'  THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0)
  INTO v_inc, v_exp
  FROM transactions WHERE lead_id = v_lead_id;

  UPDATE leads SET
    total_income  = v_inc,
    total_expense = v_exp,
    net_balance   = v_inc - v_exp
  WHERE id = v_lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER txn_after_insert AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION recalc_lead_balance();

-- ─── DEFAULT CONFIG ───────────────────────────────────────────────────────────
INSERT INTO config (key, value) VALUES
('countries', '["Bolgariya","Germaniya","Turkiya","Rossiya","Montenegro","Serbiya","Polsha","Litva","Koreya","Arab","Aniq emas"]'),
('sectors',   '["BCE Haydovchi","Qurilish","Mehmonxona","Zavod","Til kursi","Svarshik","Work and travel","Tikuvchilik","Oshpaz","Animatsiya"]'),
('sources',   '["Target","Telefon","Telegram","Sarafan","Onlayn Ariza","Instagram","Bot orqali","Yarmarka","Taqdimot"]'),
('positions', '["Oshpaz","Yordamchi oshpaz","Ofitsiant","Animatsiya","Barman","Resepshn","Svarshik","Haydovchi","Qurilishchi"]'),
('txn_income',  '["XBA To''lov","1-Qism","2-Qism","3-Qism","Bonus","Ro''yxat","Boshqa"]'),
('txn_expense', '["Maosh","Avans","Bonus","Reklama","Ofis ijara","Transport","KPI","Boshqa"]')
ON CONFLICT (key) DO NOTHING;

-- ─── DEFAULT ADMIN USER ───────────────────────────────────────────────────────
-- Password: admin123 (bcrypt)
INSERT INTO users (username, password, name, role, avatar, color, phone, salary, salary_type)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin Akbar', 'admin', 'AA', '#6366f1', '+998901234567', 5000000, 'fixed')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, name, role, avatar, color, phone, salary, salary_type)
VALUES ('xusanxon', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Xusanxon', 'manager', 'XS', '#22c55e', '+998901234568', 4000000, 'fixed')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, name, role, avatar, color, phone, salary_type, salary_pct)
VALUES ('sarvar', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarvarbek', 'sales', 'SB', '#f97316', '+998901234569', 'percent', 5)
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, name, role, avatar, color, phone, salary, salary_type)
VALUES ('asad', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Asadulloh', 'docs', 'AS', '#06b6d4', '+998901234571', 2500000, 'fixed')
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (username, password, name, role, avatar, color, phone, salary_type)
VALUES ('partner', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Hamkor Europe', 'partner', 'HP', '#6b7280', '+998901234573', 'fixed')
ON CONFLICT (username) DO NOTHING;

-- Note: All passwords above are 'secret' (test hash). Run seed.js for proper bcrypt hashes.
