/**
 * Parser informativního výpisu konta (IVK) z ePortálu ČSSZ.
 *
 * Port `app/cssz_ivk_parser.py` na pdfjs-dist (browser-side, bez závislosti
 * na Pythonu). Extrakce textu po stránkách → regex match řádků
 * Přehled dob pojištění / Přehled dob neevidovaných.
 */

import * as pdfjsLib from "pdfjs-dist";
// Vite handles ?url import to give us a runtime URL for the worker.
import workerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } })
  .GlobalWorkerOptions.workerSrc = workerUrl;

export interface IvkPeriodOfInsurance {
  od: string; // ISO yyyy-mm-dd
  do: string;
  druh: string;
  pocetDni: number;
  vymerovaciZaklad: number;
  vylouceneDoby: number;
}

export interface IvkUnregisteredPeriod {
  od: string;
  do: string;
  dny: number;
}

export interface Ivk {
  pojistenecJmeno: string;
  pojistenecRc: string;
  datumVystaveni: string | null;
  dobyPojisteni: IvkPeriodOfInsurance[];
  dobyNeevidovane: IvkUnregisteredPeriod[];
  celkemDniEvidovanych: number | null;
  celkemDniNeevidovanych: number | null;
}

export interface IvkAggregates {
  vzPerYear: Record<number, number>;
  daysPerYear: Record<number, number>;
  excludedDaysPerYear: Record<number, number>;
}

const ROW_RE =
  /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+(vyměřovací základ|pojištění|náhradní doba(?:\s+pojištění)?)\s+(\d+)\s+((?:\d{1,3}(?:\s\d{3})*|\d+))\s+(\d+)\s*$/;

const UNREG_RE = /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})\s+(\d+)\s*$/;

const NAME_RE = /Identifikační údaje pojištěnce:\s+(.+)/;
const RC_RE = /^\s*(\d{9,10})\s*$/;
const DATETIME_RE =
  /ePortálu ČSSZ \((\d{2}\.\d{2}\.\d{4}),\s*(\d{2}:\d{2}:\d{2})\)/;
const TOTAL_EVID_RE = /Celkový počet evidovaných dob činí:\s*([\d\s]+?)\s*dnů/;
const TOTAL_NEEVID_RE = /Celkový počet neevidovaných dob činí:\s*([\d\s]+?)\s*dnů/;

function parseInt2(s: string): number {
  return Number(s.replace(/[\s ]/g, ""));
}

function parseDate(s: string): string {
  const [d, m, y] = s.split(".");
  return `${y}-${m}-${d}`;
}

/** Extract all text from a PDF as a flat list of lines. */
async function extractLines(buffer: ArrayBuffer): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // pdfjs returns text items per glyph run; we need to reassemble lines
    // by Y coordinate (baseline). Group items with similar transform[5].
    const items = (content.items as Array<{ str: string; transform: number[] }>).slice();
    const byLine = new Map<number, { y: number; parts: { x: number; str: string }[] }>();
    for (const it of items) {
      if (!it.str) continue;
      const y = Math.round(it.transform[5] * 10) / 10;
      const x = it.transform[4];
      const key = Math.round(y);
      const entry = byLine.get(key) ?? { y, parts: [] };
      entry.parts.push({ x, str: it.str });
      byLine.set(key, entry);
    }
    const sortedLines = Array.from(byLine.values()).sort((a, b) => b.y - a.y);
    for (const ln of sortedLines) {
      ln.parts.sort((a, b) => a.x - b.x);
      const lineText = ln.parts.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
      if (lineText) lines.push(lineText);
    }
  }
  return lines;
}

export async function parseIvkFromBytes(buffer: ArrayBuffer): Promise<Ivk> {
  const lines = await extractLines(buffer);

  // Header: jméno, RČ, datum vystavení
  let jmeno = "";
  let rc = "";
  let datumVystaveni: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = NAME_RE.exec(lines[i]);
    if (m) {
      jmeno = m[1].trim();
      const next = lines[i + 1];
      if (next) {
        const m2 = RC_RE.exec(next);
        if (m2) rc = m2[1];
      }
    }
    const md = DATETIME_RE.exec(lines[i]);
    if (md) {
      datumVystaveni = `${parseDate(md[1])}T${md[2]}`;
    }
  }

  // Body: dvě tabulky (pojištění / neevidované)
  let inUnreg = false;
  const dobyPojisteni: IvkPeriodOfInsurance[] = [];
  const dobyNeevidovane: IvkUnregisteredPeriod[] = [];

  for (const line of lines) {
    if (line.includes("Přehled dob neevidovaných")) {
      inUnreg = true;
      continue;
    }
    if (line.includes("Přehled dob pojištění")) {
      inUnreg = false;
      continue;
    }
    if (!inUnreg) {
      const m = ROW_RE.exec(line);
      if (m) {
        dobyPojisteni.push({
          od: parseDate(m[1]),
          do: parseDate(m[2]),
          druh: m[3].trim(),
          pocetDni: parseInt2(m[4]),
          vymerovaciZaklad: parseInt2(m[5]),
          vylouceneDoby: parseInt2(m[6]),
        });
      }
    } else {
      const m = UNREG_RE.exec(line);
      if (m) {
        dobyNeevidovane.push({
          od: parseDate(m[1]),
          do: parseDate(m[2]),
          dny: parseInt2(m[3]),
        });
      }
    }
  }

  // Souhrny
  const fullText = lines.join("\n");
  const totalEvid = TOTAL_EVID_RE.exec(fullText);
  const totalNeevid = TOTAL_NEEVID_RE.exec(fullText);

  return {
    pojistenecJmeno: jmeno,
    pojistenecRc: rc,
    datumVystaveni,
    dobyPojisteni,
    dobyNeevidovane,
    celkemDniEvidovanych: totalEvid ? parseInt2(totalEvid[1]) : null,
    celkemDniNeevidovanych: totalNeevid ? parseInt2(totalNeevid[1]) : null,
  };
}

/** Group periods by year, summing VZ and excluded days. */
export function aggregateIvk(ivk: Ivk): IvkAggregates {
  const vzPerYear: Record<number, number> = {};
  const daysPerYear: Record<number, number> = {};
  const excludedDaysPerYear: Record<number, number> = {};

  for (const p of ivk.dobyPojisteni) {
    const odYear = Number(p.od.slice(0, 4));
    const doYear = Number(p.do.slice(0, 4));
    if (odYear !== doYear) continue; // multi-year periods skipped

    vzPerYear[odYear] = (vzPerYear[odYear] ?? 0) + p.vymerovaciZaklad;
    excludedDaysPerYear[odYear] =
      (excludedDaysPerYear[odYear] ?? 0) + p.vylouceneDoby;
    if (p.druh !== "vyměřovací základ") {
      daysPerYear[odYear] = (daysPerYear[odYear] ?? 0) + p.pocetDni;
    }
  }

  return { vzPerYear, daysPerYear, excludedDaysPerYear };
}
