# 🚀 OneJobs CRM — To'liq Deployment Qo'llanmasi

## 📁 Loyiha tuzilmasi

```
onejobs-fullstack/
├── server/          ← Node.js + Express API
│   ├── index.js     ← Asosiy server
│   └── package.json
├── client/          ← React frontend
│   ├── src/
│   │   ├── App.jsx  ← Asosiy app
│   │   ├── api.js   ← API client
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── db/
│   ├── schema.sql   ← PostgreSQL jadvallar
│   └── seed.sql     ← 200 real lead (OneJobs DB)
├── render.yaml      ← Render.com deploy config
└── .env.example     ← Environment o'zgaruvchilar
```

---

## 🛠️ LOCAL ISHGA TUSHIRISH (10 daqiqa)

### 1. PostgreSQL o'rnating
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql@15
brew services start postgresql@15

# Windows → https://www.postgresql.org/download/windows/
```

### 2. Database yarating
```bash
sudo -u postgres psql
CREATE DATABASE onejobs;
CREATE USER onejobs_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE onejobs TO onejobs_user;
\q
```

### 3. Schema va seed qo'llang
```bash
psql -U onejobs_user -d onejobs -f db/schema.sql
psql -U onejobs_user -d onejobs -f db/seed.sql
# → 200 ta real lead qo'shiladi
```

### 4. Server .env yarating
```bash
cd server
cp ../.env.example .env
# .env ni oching va to'ldiring:
# DATABASE_URL=postgresql://onejobs_user:yourpassword@localhost:5432/onejobs
# JWT_SECRET=super-secret-random-string-here
# PORT=3001
```

### 5. Client .env yarating
```bash
cd client
echo "VITE_API_URL=http://localhost:3001" > .env
```

### 6. Barcha package'larni o'rnating va ishga tushiring
```bash
# Root papkada:
npm install
npm run install:all

# Ikkala server ham parallel ishga tushadi:
npm run dev
# → API: http://localhost:3001
# → Frontend: http://localhost:5173
```

### Login
| Username  | Parol       |
|-----------|-------------|
| admin     | admin123    |
| xusanxon  | manager123  |
| sarvar    | sales123    |

---

## 🌐 PRODUCTION DEPLOY

### Variant A: Render.com (Backend) + Vercel (Frontend) — TAVSIYA ETILADI

#### A1. Backend → Render.com

1. **GitHub'ga push qiling:**
   ```bash
   git init
   git add .
   git commit -m "OneJobs CRM v1"
   git remote add origin https://github.com/SIZNING/onejobs-crm.git
   git push -u origin main
   ```

2. **render.com** → Sign Up → "New +" → "Web Service"
3. GitHub repo'ni ulang
4. Settings:
   ```
   Root Directory: server
   Build Command:  npm install
   Start Command:  npm start
   ```
5. "Environment" tabiga:
   ```
   DATABASE_URL   → (quyida PostgreSQL yaratilgandan keyin)
   JWT_SECRET     → Generate random string
   NODE_ENV       → production
   FRONTEND_URL   → https://onejobs-crm.vercel.app
   ```

6. **Render.com PostgreSQL yarating:**
   - "New +" → "PostgreSQL"
   - Name: `onejobs-db`
   - Plan: **Free** (bepul)
   - "Create Database"
   - "Internal Connection String" → kopiyalang → DATABASE_URL ga paste qiling

7. **Schema va seed qo'llang:**
   ```bash
   psql "postgresql://..." -f db/schema.sql
   psql "postgresql://..." -f db/seed.sql
   ```

8. Deploy → API URL: `https://onejobs-api.onrender.com`

#### A2. Frontend → Vercel

1. **vercel.com** → Sign Up with GitHub
2. "New Project" → import repo
3. Settings:
   ```
   Framework Preset: Vite
   Root Directory:   client
   Build Command:    npm run build
   Output Directory: dist
   ```
4. Environment Variables:
   ```
   VITE_API_URL = https://onejobs-api.onrender.com
   ```
5. "Deploy" → URL: `https://onejobs-crm.vercel.app`

#### A3. Render.com dagi FRONTEND_URL ni yangilang
```
FRONTEND_URL = https://onejobs-crm.vercel.app
```

---

### Variant B: Railway.app (All-in-one)

```bash
npm install -g railway
railway login
railway init
railway add --database postgresql
railway up
```

---

### Variant C: VPS (DigitalOcean / Hetzner)

```bash
# Server sozlash (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm postgresql nginx

# PostgreSQL
sudo -u postgres createdb onejobs
sudo -u postgres createuser onejobs_user

# PM2 (process manager)
npm install -g pm2
cd server && npm install
pm2 start index.js --name onejobs-api
pm2 save && pm2 startup

# Nginx config
sudo nano /etc/nginx/sites-available/onejobs
```

```nginx
server {
    listen 80;
    server_name onejobs.uz www.onejobs.uz;

    # Frontend (built files)
    location / {
        root /var/www/onejobs/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/onejobs /etc/nginx/sites-enabled/
sudo certbot --nginx -d onejobs.uz  # HTTPS
sudo systemctl restart nginx
```

---

## 🔗 INTEGRATSIYALAR

### Make.com (Tally Forms → CRM)
```
1. Make.com → Create Scenario
2. Trigger: Tally → Watch Responses
3. Action: HTTP → Make a Request
   URL: https://your-api.onrender.com/api/webhook/lead
   Method: POST
   Headers: { "x-api-key": "your-webhook-key", "Content-Type": "application/json" }
   Body: {
     "name": "{{Tally.full_name}}",
     "phone": "{{Tally.phone_number}}",
     "source": "Onlayn Ariza",
     "status": "Yangi",
     "comment": "{{Tally.additional_notes}}"
   }
```

### Meta Lead Ads → CRM
```
1. Make.com → Facebook Lead Ads → Watch New Leads
2. HTTP POST → /api/webhook/lead
   Body: { "name": "{{name}}", "phone": "{{phone_number}}", "source": "Target" }
```

### MicroSIP (Avtomatik qo'ng'iroq)
```
Mijoz kartasida 📞 tugmasi → tel:+998XXXXXXXXX
MicroSIP o'rnatilgan bo'lsa avtomatik ochiladir.
Webhook bilan: MicroSIP → Make.com → Log call in CRM
```

---

## 💰 Narx rejasi

| Xizmat | Bepul | To'liq narx |
|--------|-------|-------------|
| **Vercel** (Frontend) | Bepul | Bepul |
| **Render.com** (API) | Bepul (750h/oy) | $7/oy |
| **Render.com** (DB) | Bepul (1GB) | $7/oy |
| **Make.com** | 1000 ops/oy | $9/oy |
| **Supabase** alternativa | Bepul | $25/oy |

**Jami minimal narx: 0$ (bepul tier)**

---

## 🔒 Xavfsizlik

```bash
# .env da albatta o'zgartiring:
JWT_SECRET=    # 32+ belgilik random string
WEBHOOK_KEY=   # Tally/Make uchun API key

# PostgreSQL password kuchli bo'lsin:
# openssl rand -hex 32
```

---

## 📊 Database monitoring

```sql
-- Lead statistika
SELECT status, COUNT(*) FROM leads GROUP BY status ORDER BY 2 DESC;

-- Oylik daromad
SELECT DATE_TRUNC('month', date) as month, SUM(amount)
FROM transactions WHERE type='income' GROUP BY 1 ORDER BY 1;

-- Xodim samaradorligi
SELECT u.name, COUNT(l.id) as leads
FROM users u LEFT JOIN leads l ON l.owner_sales = u.id
GROUP BY u.id, u.name ORDER BY leads DESC;
```

---

*OneJobs CRM v8 — Toshkent, 2026*
