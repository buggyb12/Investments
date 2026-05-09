/**
 * Parser informativního výpisu konta (IVK) z ePortálu ČSSZ.
 *
 * Port `app/cssz_ivk_parser.py` na pdfjs-dist (browser-side, bez závislosti
 * na Pythonu). Extrakce textu po stránkách → regex match řádků
 * Přehled dob pojištění / Přehled dob neevidovaných.
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

let workerInstalled = false;
function ensureWorker() {
  if (workerInstalled) return;
  const opts = (pdfjsLib as unknown as {
    GlobalWorkerOptions?: { workerSrc?: string };
  }).GlobalWorkerOptions;
  if (opts) {
    // Serve the legacy worker as a static file from public/ so Vite's
    // ?worker transform doesn't touch it. The exact same .min.mjs that
    // ships in pdfjs-dist/legacy/build is copied to /public/pdfjs/
    // verbatim, which is what pdfjs expects to load.
    opts.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  }
  workerInstalled = true;
}

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

interface TextItemLike {
  str?: string;
  transform?: number[];
}

function isTextItem(it: unknown): it is { str: string; transform: number[] } {
  if (!it || typeof it !== "object") return false;
  const o = it as TextItemLike;
  return (
    typeof o.str === "string" && Array.isArray(o.transform) && o.transform.length >= 6
  );
}

/** Extract all text from a PDF as a flat list of lines. */
async function extractLines(buffer: ArrayBuffer): Promise<string[]> {
  ensureWorker();

  // pdfjs v5 expects a typed array, not a raw ArrayBuffer.
  const data = new Uint8Array(buffer);
  // standardFontDataUrl + cMapUrl are required by some PDFs; without them
  // pdfjs internally hits a code path that throws "for-of over undefined".
  // Both directories are copied from pdfjs-dist into public/pdfjs at build.
  const loadingTask = pdfjsLib.getDocument({
    data,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
    cMapUrl: "/pdfjs/cmaps/",
    cMapPacked: true,
  });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch (e) {
    throw new Error(
      `pdfjs nepřečetl PDF: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!doc || typeof doc.numPages !== "number") {
    throw new Error("PDF se otevřel, ale chybí stránky");
  }

  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    // Pass explicit options — pdfjs v5 changed defaults for
    // includeMarkedContent/disableNormalization, and some PDFs trigger
    // crashes inside getTextContent unless these are pinned.
    const content = await page.getTextContent({
      includeMarkedContent: false,
      disableNormalization: false,
    });
    const rawItems =
      (content && (content as { items?: unknown }).items) || [];
    if (!Array.isArray(rawItems)) continue;

    const byLine = new Map<
      number,
      { y: number; parts: { x: number; str: string }[] }
    >();
    for (const it of rawItems) {
      if (!isTextItem(it)) continue;
      const y = it.transform[5];
      const x = it.transform[4];
      const key = Math.round(y);
      const entry = byLine.get(key) ?? { y, parts: [] };
      entry.parts.push({ x, str: it.str });
      byLine.set(key, entry);
    }
    const sortedLines = Array.from(byLine.values()).sort((a, b) => b.y - a.y);
    for (const ln of sortedLines) {
      ln.parts.sort((a, b) => a.x - b.x);
      const lineText = ln.parts
        .map((p) => p.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
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

  const dobyPojisteni = Array.isArray(ivk?.dobyPojisteni) ? ivk.dobyPojisteni : [];
  for (const p of dobyPojisteni) {
    if (!p || typeof p.od !== "string" || typeof p.do !== "string") continue;
    const odYear = Number(p.od.slice(0, 4));
    const doYear = Number(p.do.slice(0, 4));
    if (!odYear || odYear !== doYear) continue;

    vzPerYear[odYear] = (vzPerYear[odYear] ?? 0) + (p.vymerovaciZaklad || 0);
    excludedDaysPerYear[odYear] =
      (excludedDaysPerYear[odYear] ?? 0) + (p.vylouceneDoby || 0);
    if (p.druh !== "vyměřovací základ") {
      daysPerYear[odYear] = (daysPerYear[odYear] ?? 0) + (p.pocetDni || 0);
    }
  }

  return { vzPerYear, daysPerYear, excludedDaysPerYear };
}
