/**
 * One-time script: run import-notes.sql against the DB using pg (Node.js)
 * Run: node run-notes.js
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/onejobs",
  ssl: false,
});

async function main() {
  const sqlPath = path.join(__dirname, "import-notes.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8").replace(/^﻿/, "");

  // Split into individual statements (each on its own line)
  const statements = sql.split("\n").map(s => s.trim()).filter(s => s && s !== "BEGIN;" && s !== "COMMIT;");

  console.log(`Running ${statements.length} UPDATE statements...`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let updated = 0;
    for (let i = 0; i < statements.length; i++) {
      const res = await client.query(statements[i]);
      if (res.rowCount > 0) updated++;
      if ((i + 1) % 500 === 0) console.log(`  ${i + 1}/${statements.length} done, ${updated} updated so far`);
    }
    await client.query("COMMIT");
    console.log(`Done! ${updated} leads updated with notes.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
