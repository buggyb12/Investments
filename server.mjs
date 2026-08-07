// Tiny static file server for the Vite SPA build, plus the /api/parse-ivk
// endpoint that runs pdfjs-dist server-side (where v5 is stable on real
// CSSZ IVK PDFs that crash the browser worker version).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const PORT = Number(process.env.PORT) || 5173;
const HOST = "0.0.0.0";
const ROOT = "dist";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json",
  ".pdf": "application/pdf",
};

function safeResolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const normalized = normalize("/" + clean).replace(/^(\.\.[/\\])+/, "");
  return join(ROOT, "." + normalized);
}

async function tryRead(path) {
  try {
    const s = await stat(path);
    if (s.isDirectory()) return tryRead(join(path, "index.html"));
    return { body: await readFile(path), path };
  } catch {
    return null;
  }
}

// — IVK parser (server-side) ———————————————————————————————————————

// Páry dat dd.mm.yyyy oddělené jen mezerou — nesmí mezi tím být žádný text
// (vyloučí to "Doba od 01.01.2012 Doba do 28.02.2013" v sekci neevidovaných).
const DATE_PAIR_RE = /(\d{2}\.\d{2}\.\d{4})\s+(\d{2}\.\d{2}\.\d{4})/g;
// Počet dní — 1–3 ciferné číslo na hranici slova, bez tisícového oddělovače.
const DAYS_RE = /\b(\d{1,3})\b/;
const NAME_RE = /Identifikační údaje pojištěnce:\s+(.+)/;
const RC_RE = /^\s*(\d{9,10})\s*$/;

function parseDate(s) {
  const [d, m, y] = s.split(".");
  return `${y}-${m}-${d}`;
}

function parseIntStripped(s) {
  return Number(String(s).replace(/[\s ]/g, ""));
}

async function readBody(req, max = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > max) {
        reject(new Error("PDF je větší než 12 MB"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function extractLines(buffer) {
  // Lazy-load pdfjs only when actually parsing — keeps cold start fast.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise;

  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content && content.items) || [];

    const byLine = new Map();
    for (const it of items) {
      if (!it || typeof it.str !== "string") continue;
      if (!Array.isArray(it.transform) || it.transform.length < 6) continue;
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
        .map((q) => q.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (lineText) lines.push(lineText);
    }
  }
  return lines;
}

function parseIvkLines(lines) {
  let jmeno = "";
  let rc = "";
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
  }

  let inUnreg = false;
  const dobyPojisteni = [];
  for (const line of lines) {
    if (line.includes("Přehled dob neevidovaných")) {
      inUnreg = true;
      continue;
    }
    if (line.includes("Přehled dob pojištění")) {
      inUnreg = false;
      continue;
    }
    if (inUnreg) continue;

    // Najdi všechny páry "od do" v řádku (pdfjs občas slepí dva roky do jednoho).
    const pairs = [];
    DATE_PAIR_RE.lastIndex = 0;
    let dm;
    while ((dm = DATE_PAIR_RE.exec(line)) !== null) {
      pairs.push({ od: dm[1], do: dm[2], start: dm.index, end: dm.index + dm[0].length });
    }
    if (pairs.length === 0) continue;

    for (let i = 0; i < pairs.length; i++) {
      const segStart = pairs[i].end;
      const segEnd = i + 1 < pairs.length ? pairs[i + 1].start : line.length;
      const seg = line.slice(segStart, segEnd);

      // Počet dní extrahuj zvlášť (1–3 ciferné, bez tisícového oddělovače).
      const dm2 = DAYS_RE.exec(seg);
      if (!dm2) continue;
      const pocetDni = Number(dm2[1]);
      // 0 dní je validní u řádků typu "vyměřovací základ" (doplatek VZ bez dnů).
      if (pocetDni < 0 || pocetDni > 366) continue;

      const rest = seg.slice(dm2.index + dm2[0].length);
      // Sloupce "VZ" a "vyloučené doby" se v textové vrstvě slijí do jedné
      // sekvence číslic (např. "5 318 353" = VZ 5 318 + vyl. 353). Greedy
      // regex s tisícovými mezerami je proto nespolehlivý. Heuristika:
      // POSLEDNÍ číselný token je sloupec vyloučených dob, vše před ním
      // jsou tisícové skupiny vyměřovacího základu.
      const tokens = rest.match(/\d+/g) ?? [];
      let vymerovaciZaklad = 0;
      let vylouceneDoby = 0;
      if (tokens.length === 1) {
        // Jen jedno číslo → VZ prázdný (např. OSVČ), číslo je vyloučená doba.
        vylouceneDoby = Number(tokens[0]);
      } else if (tokens.length >= 2) {
        vylouceneDoby = Number(tokens[tokens.length - 1]);
        vymerovaciZaklad = Number(tokens.slice(0, -1).join(""));
        if (vylouceneDoby > 366) {
          // Vyloučené doby nemohou přesáhnout rok — celá sekvence je VZ.
          vymerovaciZaklad = Number(tokens.join(""));
          vylouceneDoby = 0;
        }
      }

      const druh = seg.slice(0, dm2.index).replace(/\s+/g, " ").trim();

      dobyPojisteni.push({
        od: parseDate(pairs[i].od),
        do: parseDate(pairs[i].do),
        druh: druh || "neznámý",
        pocetDni,
        vymerovaciZaklad,
        vylouceneDoby,
      });
    }
  }

  const vzPerYear = {};
  const excludedDaysPerYear = {};
  let nahradniDny = 0;
  for (const p of dobyPojisteni) {
    const yOd = Number(p.od.slice(0, 4));
    const yDo = Number(p.do.slice(0, 4));
    if (!yOd || yOd !== yDo) continue;
    // Náhradní doby ("ND - uchazeč o zaměstnání", "náhradní doba" apod.):
    // do doby pojištění se krátí na 80 % (řeší klient), pro OVZ jsou to
    // vyloučené doby (§ 16 odst. 4) — jinak by nulový VZ ředil průměr.
    const jeNahradni = /^nd\b|náhradní/i.test(p.druh);
    if (jeNahradni) nahradniDny += p.pocetDni;
    vzPerYear[yOd] = (vzPerYear[yOd] ?? 0) + p.vymerovaciZaklad;
    excludedDaysPerYear[yOd] =
      (excludedDaysPerYear[yOd] ?? 0) +
      (jeNahradni ? Math.max(p.vylouceneDoby, p.pocetDni) : p.vylouceneDoby);
  }

  // Souhrnný počet evidovaných dnů z patičky ČSSZ — přesnější než součet
  // celých let (zachycuje částečné roky). Vč. náhradních dob.
  let celkemDnyPojisteni = null;
  for (const line of lines) {
    const tm = /Celkový počet evidovaných dob činí:\s*([\d\s]+?)\s*dn/.exec(line);
    if (tm && celkemDnyPojisteni == null) {
      celkemDnyPojisteni = parseIntStripped(tm[1]);
    }
    // Explicitní souhrn náhradních dob (novější IVK) má přednost před součtem řádků.
    const nm = /Náhradní doba pojištění činí:\s*([\d\s]+?)\s*dn/.exec(line);
    if (nm) {
      nahradniDny = Math.max(nahradniDny, parseIntStripped(nm[1]));
    }
  }

  const years = Object.keys(vzPerYear).map(Number).sort((a, b) => a - b);
  const rows = years.map((rok) => {
    const maxDny = rok % 4 === 0 && (rok % 100 !== 0 || rok % 400 === 0) ? 366 : 365;
    return {
      rok,
      vz: vzPerYear[rok] ?? 0,
      vylouceneDny: Math.min(excludedDaysPerYear[rok] ?? 0, maxDny),
    };
  });

  return {
    jmeno,
    rc,
    rows,
    parsedRowsCount: dobyPojisteni.length,
    celkemDnyPojisteni,
    nahradniDny,
  };
}

// — IDA parser (Informativní důchodová aplikace) ————————————————————
//
// Novější výstup z https://eportal.cssz.cz/web/portal/informativni-duchodova-aplikace
// Obsahuje navíc přímý výpočet ČSSZ (odhad důchodu, OVZ, výměry, datum
// důchodového věku, počet dětí). Formát řádků se liší od IOLDP:
// data s mezerami („1. 1. 2003"), VZ s „Kč", vyloučené dny „-" nebo číslo
// a sloupec Zhodnocení (✓ = započteno, ⦸ = nezapočteno).

const IDA_DATE_RE = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/g;

function idaDateToIso(d, m, y) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** „19 roků a 37 dnů" → počet dnů (roky × 365 + dny, shodně s IOLDP patičkou). */
function rokyADnyNaDny(text) {
  // \S* místo \w*: JS \w nematchuje „ů" v „roků".
  const m = /(\d+)\s*rok\S*\s*a\s*(\d+)\s*dn/i.exec(text);
  if (!m) return null;
  return Number(m[1]) * 365 + Number(m[2]);
}

/** Číslo „33 300 Kč" z řádku / textu. */
function kcValue(text) {
  const m = /([\d][\d\s]*)\s*Kč/.exec(text);
  return m ? parseIntStripped(m[1]) : null;
}

function parseIdaLines(lines) {
  // — Identifikace: řádek s RČ mezi jménem a datem narození —
  let jmeno = "";
  let rc = "";
  let datumNarozeni = null;
  for (const line of lines) {
    const m = /^(.+?)\s+(\d{9,10})\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/.exec(
      line.trim(),
    );
    if (m) {
      jmeno = m[1].trim();
      rc = m[2];
      datumNarozeni = idaDateToIso(Number(m[3]), Number(m[4]), Number(m[5]));
      break;
    }
  }

  // — Počet vychovaných dětí: hodnota na samostatném řádku za „(výchovné):" —
  let pocetDeti = null;
  for (let i = 0; i < lines.length; i++) {
    if (/výchovné/i.test(lines[i])) {
      const inline = /výchovné\)?\s*:?\s*(\d{1,2})\s*$/.exec(lines[i]);
      if (inline) {
        pocetDeti = Number(inline[1]);
        break;
      }
      const next = (lines[i + 1] ?? "").trim();
      if (/^\d{1,2}$/.test(next)) {
        pocetDeti = Number(next);
        break;
      }
    }
  }

  // — Souhrnné hodnoty ČSSZ —
  let odhadDuchodu = null;
  let datumDuchodovehoVeku = null;
  let celkemDnyPojisteni = null;
  let nahradniDny = null;
  for (const line of lines) {
    if (odhadDuchodu == null && /Odhad(ovaná)?\s+výše?\s+.*důchodu/i.test(line)) {
      odhadDuchodu = kcValue(line);
    }
    if (datumDuchodovehoVeku == null && /dosažení důchodového věku/i.test(line)) {
      const m = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/.exec(line);
      if (m) datumDuchodovehoVeku = idaDateToIso(Number(m[1]), Number(m[2]), Number(m[3]));
    }
    if (celkemDnyPojisteni == null && /Celkový počet získaných/i.test(line)) {
      celkemDnyPojisteni = rokyADnyNaDny(line);
    }
    if (nahradniDny == null && /z toho náhradní doba/i.test(line)) {
      nahradniDny = rokyADnyNaDny(line);
    }
  }

  // — Podrobnosti k výpočtu: hodnota v Kč na řádku pod popiskem —
  const detailValue = (labelRe) => {
    for (let i = 0; i < lines.length; i++) {
      if (labelRe.test(lines[i])) {
        const own = kcValue(lines[i]);
        if (own != null) return own;
        const next = kcValue(lines[i + 1] ?? "");
        if (next != null) return next;
      }
    }
    return null;
  };
  const ovz = detailValue(/^Osobní vyměřovací základ/i);
  const vypoctovyZaklad = detailValue(/^Výpočtový základ/i);
  const procentniVymera = detailValue(/^Procentní výměra/i);
  const zakladniVymera = detailValue(/^Základní výměra/i);

  // — Roční řádky z „Kompletního přehledu evidovaných dob pojištění" —
  // Bereme jen zhodnocené řádky (✓); ⦸ ČSSZ do výpočtu nezapočítává
  // (např. duplicitní „DPČ - vykázání příjmu" překrývající se se ✓ řádky).
  const vzPerYear = {};
  const excludedDaysPerYear = {};
  let parsedRowsCount = 0;
  let inKompletni = false;
  for (const line of lines) {
    if (/Kompletní přehled evidovaných dob/i.test(line)) {
      inKompletni = true;
      continue;
    }
    if (/Podrobnosti k výpočtu/i.test(line)) inKompletni = false;
    if (!inKompletni) continue;
    if (line.includes("⦸")) continue;

    IDA_DATE_RE.lastIndex = 0;
    const d1 = IDA_DATE_RE.exec(line);
    const d2 = IDA_DATE_RE.exec(line);
    if (!d1 || !d2) continue;
    const yOd = Number(d1[3]);
    const yDo = Number(d2[3]);
    if (yOd !== yDo) continue;

    let seg = line.slice(IDA_DATE_RE.lastIndex);
    // Nejdřív ukroj počet dní (1–3 ciferné číslo hned za daty) — jinak by se
    // u řádků bez inline druhu slil s VZ („29 920 Kč" = 29 dní + VZ 920).
    const daysMatch = /\b(\d{1,3})\b/.exec(seg);
    if (daysMatch) seg = seg.slice(daysMatch.index + daysMatch[0].length);
    // VZ = číselné skupiny bezprostředně před „Kč".
    const vzMatch = /([\d][\d\s]*)\s*Kč/.exec(seg);
    const vz = vzMatch ? parseIntStripped(vzMatch[1]) : 0;
    // Vyloučené dny = první číslo za „Kč" („-" znamená žádné).
    let vyl = 0;
    if (vzMatch) {
      const after = seg.slice(vzMatch.index + vzMatch[0].length);
      const vylMatch = /\b(\d{1,3})\b/.exec(after);
      if (vylMatch) vyl = Number(vylMatch[1]);
    }

    vzPerYear[yOd] = (vzPerYear[yOd] ?? 0) + vz;
    excludedDaysPerYear[yOd] = (excludedDaysPerYear[yOd] ?? 0) + vyl;
    parsedRowsCount++;
  }

  const years = Object.keys(vzPerYear).map(Number).sort((a, b) => a - b);
  const rows = years.map((rok) => {
    const maxDny = rok % 4 === 0 && (rok % 100 !== 0 || rok % 400 === 0) ? 366 : 365;
    return {
      rok,
      vz: vzPerYear[rok] ?? 0,
      vylouceneDny: Math.min(excludedDaysPerYear[rok] ?? 0, maxDny),
    };
  });

  return {
    format: "ida",
    jmeno,
    rc,
    datumNarozeni,
    pocetDeti,
    rows,
    parsedRowsCount,
    celkemDnyPojisteni,
    nahradniDny: nahradniDny ?? 0,
    ida: {
      odhadDuchodu,
      datumDuchodovehoVeku,
      ovz,
      vypoctovyZaklad,
      procentniVymera,
      zakladniVymera,
    },
  };
}

async function handleParseIvk(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }
  try {
    const buffer = await readBody(req);
    if (buffer.length === 0) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Prázdný request body" }));
      return;
    }
    const t0 = Date.now();
    const lines = await extractLines(buffer);
    // Rozliš formát: IDA (Informativní důchodová aplikace) vs. klasické IOLDP.
    const isIda = lines.some((l) => l.includes("Informativní důchodová aplikace"));
    const parsed = isIda ? parseIdaLines(lines) : parseIvkLines(lines);
    const ms = Date.now() - t0;
    console.log(
      `[ivk] ${isIda ? "IDA" : "IOLDP"}: parsed ${parsed.rows.length} let in ${ms} ms (${parsed.parsedRowsCount} rows from ${lines.length} lines)`,
    );

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(parsed));
  } catch (err) {
    console.error("[ivk] parse failed:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5) : null,
      }),
    );
  }
}

// — Request router —————————————————————————————————————————————————

const server = createServer(async (req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api/parse-ivk")) {
    return handleParseIvk(req, res);
  }

  const resolved = safeResolve(url);
  let hit = await tryRead(resolved);
  if (!hit) {
    hit = await tryRead(join(ROOT, "index.html"));
  }
  if (!hit) {
    res.statusCode = 500;
    res.end("Build output not found — did `npm run build` run?");
    return;
  }

  const ext = extname(hit.path);
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  res.setHeader(
    "Cache-Control",
    hit.path.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=0, must-revalidate",
  );
  res.end(hit.body);
});

server.on("error", (err) => {
  console.error("[server] fatal:", err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[server] listening on http://${HOST}:${PORT} (root: ${ROOT})`);
});
