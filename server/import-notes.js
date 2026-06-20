/**
 * One-time script: import Notion notes (🗒Izoh) into leads.comment
 * Run from server dir: node import-notes.js
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const CSV_PATH = "C:/Users/rakhi/Downloads/notion_extracted/Leads 2873be939da780e291f2e4005789d1aa_all.csv";

const pool = new Pool({
  host: "dpg-d7tgr90sfn5c73anhrpg-a.frankfurt-postgres.render.com",
  port: 5432,
  database: "onejobs",
  user: "onejobs_user",
  password: "Y7XzI3rFh7cj1lVir51AdLB1nC52NPRX",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || "").trim(); });
    rows.push(obj);
  }
  return rows;
}

function parseRow(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

async function main() {
  const raw = fs.readFileSync(CSV_PATH, "utf-8").replace(/^﻿/, "");
  const rows = parseCSV(raw);

  const idCol = "ID";
  const noteCol = "🗒Izoh"; // 🗒Izoh

  // Find actual column names
  const cols = Object.keys(rows[0]);
  const actualNoteCol = cols.find(c => c.includes("Izoh")) || noteCol;
  const actualIdCol = cols.find(c => c === "ID") || idCol;
  console.log("Using columns:", actualIdCol, "|", actualNoteCol);

  let updated = 0, skipped = 0, notFound = 0;

  for (const row of rows) {
    const id = row[actualIdCol]?.trim();
    const note = row[actualNoteCol]?.trim();
    if (!id || !note) { skipped++; continue; }

    const res = await pool.query(
      "UPDATE leads SET comment = $1 WHERE id = $2 AND (comment IS NULL OR comment = '')",
      [note, id]
    );
    if (res.rowCount > 0) {
      updated++;
    } else {
      // Check if lead exists but already has comment
      const exists = await pool.query("SELECT id, comment FROM leads WHERE id=$1", [id]);
      if (exists.rows.length === 0) {
        notFound++;
      } else {
        // Lead exists but already has a comment — append if different
        const existing = exists.rows[0].comment || "";
        if (!existing.includes(note.slice(0, 30))) {
          await pool.query("UPDATE leads SET comment = $1 WHERE id=$2", [existing + "\n" + note, id]);
          updated++;
        } else {
          skipped++;
        }
      }
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped (empty/duplicate): ${skipped}, Not found: ${notFound}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
