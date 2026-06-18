const { Client } = require('./node_modules/pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost', user: 'onejobs_user',
  password: 'UCSC5kqM4yNZKccItsoe2CFaBA0', database: 'onejobs',
});

// All valid CRM stages — must match constants.js STAGES
const VALID_STAGES = new Set([
  "Yangi","Qilindi","Boglanildi","Onlayn Suhbat Uchun","Onlayn Suhbat","Suhbat",
  "Shartnoma qildi","Hujjat","XBA To'lov qildi","CV Topshirildi","Interview ga qo'yildi",
  "Ishga qabul qilindi","1 - Qism To'landi","Hujjatlar Tayyorlanmoqda",
  "Hujjatlar Jonatilishga Tayyor","Hujjatlar Jonatildi","Ish shartnomasi keldi",
  "Ish shartnomasi imzolandi","Taklifnoma keldi","Elchixonaga Hujjatlar Tayyor",
  "Vizaga Topshirildi","Viza Oldi","Jo'nab ketdi","Viza Rad Etildi",
  "Rad etildi","Bekor qildi","Keyinchalik","Anchagacha ko'tarmadi",
]);

// Only normalize known Notion-specific spellings; everything else passes through
const STATUS_NORMALIZE = {
  "Anchagacha Kotarmadi":  "Anchagacha ko'tarmadi",
  "anchagacha kotarmadi":  "Anchagacha ko'tarmadi",
  "Anchagacha Ko'tarmadi": "Anchagacha ko'tarmadi",
};

function normalizeStatus(raw) {
  if (!raw || !raw.trim()) return "Yangi";
  const trimmed = raw.trim();
  const mapped = STATUS_NORMALIZE[trimmed] || trimmed;
  return VALID_STAGES.has(mapped) ? mapped : "Yangi";
}

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^[\s﻿"]+|[\s"]+$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    const row = {}; headers.forEach((h, idx) => { row[h] = (cols[idx] || '').trim(); }); rows.push(row);
  }
  return rows;
}

async function main() {
  await client.connect();
  console.log('Connected');

  const teamRes = await client.query('SELECT id, name FROM users');
  const team = teamRes.rows;
  console.log('Team:', team.map(t => t.name).join(', '));

  const csvText = fs.readFileSync('/var/www/onejobs-crm/server/leads_import.csv', 'utf8');
  const rows = parseCSV(csvText);
  console.log('Parsed', rows.length, 'rows from CSV');

  let ok = 0, skipped = 0, errors = 0;
  const unknownStatuses = {};

  for (const r of rows) {
    const uid       = (r['uid'] || r['ID'] || '').trim();
    const clientId  = (r['clientId'] || r['Client ID'] || uid).trim();
    const name      = (r['Ism familiya'] || r['name'] || r['Name'] || '').trim();
    const rawPhone  = (r['Telefon'] || r['phone'] || r['Phone'] || '').trim();
    const dest      = (r["🏭 Ish o'rni"] || r["Ish o'rni"] || r['dest'] || r['Destination'] || '').trim();
    const source    = (r['📥 Manba'] || r['Manba'] || r['source'] || '').trim();
    const rawStatus = (r['⚙️ Holat'] || r['Holat'] || r['⚡ Holat'] || r['status'] || r['Status'] || '').trim();
    const note      = (r['note'] || r['Note'] || '').trim();
    const rawDate   = (r['createdAt'] || r['Qayd qilingan sana'] || '').trim();
    const ownerRaw  = (r["Mas'ul"] || r['owner'] || '').trim();

    if (!name) { skipped++; continue; }

    const digits = (rawPhone.match(/\d/g) || []).length;
    if (digits < 9) { skipped++; continue; }

    const status = normalizeStatus(rawStatus);

    // Track unknown statuses for diagnostic output
    if (rawStatus && !VALID_STAGES.has(rawStatus) && !STATUS_NORMALIZE[rawStatus]) {
      unknownStatuses[rawStatus] = (unknownStatuses[rawStatus] || 0) + 1;
    }

    let createdAt = null;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d)) createdAt = d.toISOString();
    }

    let ownerSales = null;
    if (ownerRaw) {
      const firstName = ownerRaw.split(' ')[0].toLowerCase();
      const match = team.find(t => t.name.toLowerCase().startsWith(firstName));
      if (match) ownerSales = match.id;
    }

    const id = clientId || uid || null;

    try {
      await client.query(
        `INSERT INTO leads
           (id, name, phone, status, dest, source, note, owner_sales, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, phone=EXCLUDED.phone, status=EXCLUDED.status,
           dest=EXCLUDED.dest, source=EXCLUDED.source, note=EXCLUDED.note,
           owner_sales=EXCLUDED.owner_sales, created_at=EXCLUDED.created_at`,
        [id, name, rawPhone, status, dest, source, note, ownerSales, createdAt]
      );
      ok++;
      if (ok % 500 === 0) console.log('...', ok, 'imported');
    } catch (err) {
      errors++;
      if (errors <= 5) console.error('Row error:', name, err.message);
    }
  }

  console.log('\nDone: ok=' + ok + ' skipped=' + skipped + ' errors=' + errors);

  if (Object.keys(unknownStatuses).length) {
    console.log('\nUnknown Notion statuses (mapped to Yangi):');
    Object.entries(unknownStatuses).sort((a,b)=>b[1]-a[1]).forEach(([s,n]) => console.log('  ' + n + 'x  ' + s));
  }

  const dist = await client.query('SELECT status, COUNT(*) as cnt FROM leads GROUP BY status ORDER BY cnt DESC');
  console.log('\nStatus distribution after import:');
  dist.rows.forEach(r => console.log('  ' + r.cnt.toString().padStart(6), r.status));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
