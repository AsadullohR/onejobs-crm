const { Client } = require('./node_modules/pg');

const updates = [
  ['NO-3709', 568000],
  ['NO-3247', 468000],
  ['NO-690',  1086000],
  ['NO-3175', 468000],
  ['NO-3884', 488000],
  ['NO-3654', 930000],
  ['NO-2493', 220000],
  ['NO-2474', 1530000],
  ['NO-2360', 2399500],
  ['NO-2359', 650000],
  ['NO-2340', 930000],
  ['NO-2317', 1430000],
  ['NO-2104', 749900],
  ['NO-2103', -370000],
  ['NO-2006', 600000],
  ['NO-1474', 568000],
  ['NO-970',  4468000],
  ['NO-774',  2966000],
  ['NO-680',  5230000],
  ['NO-505',  256000],
  ['NO-339',  3468000],
  ['NO-330',  150000],
  ['NO-21',   1500000],
  ['NO-1',    1800000],
  ['NO-2300', 1238000],
  ['NO-3249', 600000],
  ['NO-3465', 330000],
  ['NO-2307', -335000],
  ['NO-1909', 780000],
  ['NO-1021', 330000],
  ['NO-3466', 930000],
  ['NO-3883', 618000],
  ['NO-3844', 618000],
  ['NO-3604', 468000],
  ['NO-3896', 618000],
  ['NO-2491', 538000],
  ['NO-2613', 538000],
  ['NO-2232', 538000],
  ['NO-5442', 618000],
  ['NO-4078', 488000],
  ['NO-4089', 488000],
  ['NO-5167', 618000],
  ['NO-5833', 618000],
  ['NO-1834', 491000],
];

const c = new Client({ host: 'localhost', user: 'onejobs_user', password: 'UCSC5kqM4yNZKccItsoe2CFaBA0', database: 'onejobs' });

c.connect().then(async () => {
  let total = 0;
  for (const [id, sf] of updates) {
    const r = await c.query(
      "UPDATE leads SET status='Jo''nab ketdi', sof_foyda=$1, updated_at=NOW() WHERE id=$2",
      [sf, id]
    );
    if (r.rowCount > 0) {
      console.log(`✓ ${id} → sof_foyda=${sf}`);
      total++;
    } else {
      console.log(`✗ ${id} — not found in DB`);
    }
  }
  // Avaz aka (no client ID)
  const r2 = await c.query(
    "UPDATE leads SET status='Jo''nab ketdi', sof_foyda=-150400, updated_at=NOW() WHERE name ILIKE '%Avaz aka%'",
  );
  console.log(`Avaz aka: ${r2.rowCount} row(s) updated`);
  console.log(`\nDone. ${total + r2.rowCount} leads marked as Tugagan.`);
  await c.end();
}).catch(e => { console.error(e.message); process.exit(1); });
