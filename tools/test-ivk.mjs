// Node test for IVK parser logic against the real fixture PDF.
// Calls pdfjs-dist/legacy directly (no Vite ?worker), then re-uses the
// same extractLines + parseIvkFromBytes logic as the browser build.
import { readFileSync } from "node:fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_PATH = "/tmp/duchod-ref/tests/fixtures/ivk_sample.pdf";

const ROW_RE =
  /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+(vyměřovací základ|pojištění|náhradní doba(?:\s+pojištění)?)\s+(\d+)\s+((?:\d{1,3}(?:\s\d{3})*|\d+))\s+(\d+)\s*$/;
const NAME_RE = /Identifikační údaje pojištěnce:\s+(.+)/;

function isTextItem(it) {
  return (
    it &&
    typeof it === "object" &&
    typeof it.str === "string" &&
    Array.isArray(it.transform) &&
    it.transform.length >= 6
  );
}

async function extractLines(buffer) {
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const lines = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    });
    const rawItems = (content && content.items) || [];
    if (!Array.isArray(rawItems)) continue;

    const byLine = new Map();
    for (const it of rawItems) {
      if (!isTextItem(it)) continue;
      const y = it.transform[5];
      const x = it.transform[4];
      const key = Math.round(y);
      const entry = byLine.get(key) ?? { y, parts: [] };
      entry.parts.push({ x, str: it.str });
      byLine.set(key, entry);
    }
    const sorted = Array.from(byLine.values()).sort((a, b) => b.y - a.y);
    for (const ln of sorted) {
      ln.parts.sort((a, b) => a.x - b.x);
      const lineText = ln.parts.map((q) => q.str).join(" ").replace(/\s+/g, " ").trim();
      if (lineText) lines.push(lineText);
    }
  }
  return lines;
}

const buf = readFileSync(PDF_PATH);
const t0 = Date.now();
let lines;
try {
  lines = await extractLines(buf.buffer);
} catch (e) {
  console.error("✗ extractLines threw:", e.message);
  console.error(e.stack);
  process.exit(1);
}
const ms = Date.now() - t0;
console.log(`✓ extracted ${lines.length} lines in ${ms} ms`);

// Header
let jmeno = "";
for (let i = 0; i < lines.length; i++) {
  const m = NAME_RE.exec(lines[i]);
  if (m) jmeno = m[1].trim();
}
console.log(`  pojištěnec: "${jmeno || "(nenalezen)"}"`);

// Body — count parsed rows
let inUnreg = false;
const rows = [];
for (const line of lines) {
  if (line.includes("Přehled dob neevidovaných")) { inUnreg = true; continue; }
  if (line.includes("Přehled dob pojištění"))      { inUnreg = false; continue; }
  if (inUnreg) continue;
  const m = ROW_RE.exec(line);
  if (m) {
    rows.push({
      od: m[1], do: m[2], druh: m[3].trim(),
      dny: Number(m[4]),
      vz: Number(m[5].replace(/\s/g, "")),
      vyl: Number(m[6]),
    });
  }
}
console.log(`  rozparsováno ${rows.length} řádků dob pojištění`);

// Group by year
const vzPerYear = {};
for (const r of rows) {
  const y = Number(r.od.split(".")[2]);
  vzPerYear[y] = (vzPerYear[y] ?? 0) + r.vz;
}
const years = Object.keys(vzPerYear).map(Number).sort();
console.log(`  rozsah let: ${years[0]} → ${years[years.length - 1]} (${years.length} let)`);
console.log(`  posledních 5 let:`);
for (const y of years.slice(-5)) {
  console.log(`    ${y}: ${vzPerYear[y].toLocaleString("cs-CZ")} Kč`);
}

// Show some lines that don't match ROW_RE around the table
console.log("\n  Sample řádky kolem tabulky (pro debug regex):");
const tableStart = lines.findIndex((l) => l.includes("Přehled dob pojištění"));
for (let i = Math.max(0, tableStart); i < Math.min(lines.length, tableStart + 10); i++) {
  const matches = ROW_RE.test(lines[i]);
  console.log(`    [${matches ? "✓" : " "}] ${lines[i].slice(0, 120)}`);
}
