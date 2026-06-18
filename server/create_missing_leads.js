const { Client } = require('./node_modules/pg');

const leads = [
  { id: 'NO-1',    name: 'Farrux',               dest: "Rossiya Qo'ziqorin", income: 1800000, expense: 0,       sofFoyda: 1800000 },
  { id: 'NO-3465', name: 'Xusanxon Lutfillayev', dest: 'Germaniya W/T',      income: 1800000, expense: 1470000, sofFoyda: 330000  },
  { id: 'NO-3466', name: "Og'abek Mirzakarimov", dest: 'Germaniya W/T',      income: 2400000, expense: 1470000, sofFoyda: 930000  },
  { id: 'NO-5833', name: 'Azamov Fayzullo',      dest: 'Bolgariya W/T',      income: 618000,  expense: 0,       sofFoyda: 618000  },
];

const c = new Client({ host: 'localhost', user: 'onejobs_user', password: 'UCSC5kqM4yNZKccItsoe2CFaBA0', database: 'onejobs' });

c.connect().then(async () => {
  for (const l of leads) {
    await c.query(
      `INSERT INTO leads (id, name, status, dest, total_income, total_expense, net_balance, sof_foyda, created_at, updated_at)
       VALUES ($1, $2, 'Jo''nab ketdi', $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET status='Jo''nab ketdi', sof_foyda=$7, updated_at=NOW()`,
      [l.id, l.name, l.dest, l.income, l.expense, l.income - l.expense, l.sofFoyda]
    );
    console.log(`✓ Created ${l.id} — ${l.name}`);
  }
  await c.end();
  console.log('Done.');
}).catch(e => { console.error(e.message); process.exit(1); });
