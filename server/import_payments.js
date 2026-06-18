const { Client } = require('./node_modules/pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  user: 'onejobs_user',
  password: 'UCSC5kqM4yNZKccItsoe2CFaBA0',
  database: 'onejobs',
});

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/^[\s﻿"]+|[\s"]+$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // Get admin user id for created_by
  const adminRes = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const adminId = adminRes.rows[0]?.id;
  console.log('Admin ID:', adminId);

  const csvText = fs.readFileSync('/var/www/onejobs-crm/server/payments_import.csv', 'utf8');
  const rows = parseCSV(csvText);
  console.log('Parsed ' + rows.length + ' payment rows');

  let matched = 0, notFound = 0, inserted = 0, errors = 0;
  const missing = [];

  for (const r of rows) {
    const clientId = (r['clientId'] || '').trim();
    const name = (r['name'] || '').trim();
    const totalIncome = Number(r['totalIncome'] || 0);
    const totalExpense = Number(r['totalExpense'] || 0);
    const createdAt = r['createdAt'] || null;
    const date = createdAt ? createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

    if (!totalIncome && !totalExpense) continue;

    // Find lead by clientId (NO-XXX stored as lead id) or by name
    let leadId = null;
    if (clientId && clientId.startsWith('NO-')) {
      const res = await client.query('SELECT id FROM leads WHERE id=$1 OR comment LIKE $2 LIMIT 1', [clientId, '%' + clientId + '%']);
      if (res.rows.length) leadId = res.rows[0].id;
    }
    if (!leadId && name) {
      const res = await client.query('SELECT id FROM leads WHERE LOWER(name) LIKE LOWER($1) LIMIT 1', ['%' + name.split(' ')[0] + '%']);
      if (res.rows.length) leadId = res.rows[0].id;
    }

    if (!leadId) {
      notFound++;
      missing.push(clientId + ' - ' + name);
      continue;
    }

    matched++;

    try {
      if (totalIncome > 0) {
        await client.query(
          'INSERT INTO transactions (lead_id, date, type, category, description, amount, currency, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [leadId, date, 'income', 'Tolov', 'Notion import: umumiy kirim', totalIncome, 'UZS', adminId]
        );
        inserted++;
      }
      if (totalExpense > 0) {
        await client.query(
          'INSERT INTO transactions (lead_id, date, type, category, description, amount, currency, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [leadId, date, 'expense', 'Xarajat', 'Notion import: umumiy chiqim', totalExpense, 'UZS', adminId]
        );
        inserted++;
      }
    } catch (err) {
      errors++;
      if (errors <= 3) console.error('Error:', err.message);
    }
  }

  console.log('\nDone:');
  console.log('  Matched leads: ' + matched);
  console.log('  Transactions inserted: ' + inserted);
  console.log('  Not found: ' + notFound);
  console.log('  Errors: ' + errors);
  if (missing.length) console.log('  Missing:', missing.slice(0, 10).join(', ') + (missing.length > 10 ? '...' : ''));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
