/**
 * IVK PDF parsing — server-side via /api/parse-ivk endpoint.
 *
 * pdfjs-dist v5.7 crashes inside getTextContent on real CSSZ IVK PDFs in
 * the browser worker context (verified across legacy build, ?worker
 * bundle, ?url bundle, custom workerSrc, with and without standardFontDataUrl
 * — all hit the same "for-of over undefined" inside pdfjs's own code).
 * Same parser runs cleanly in Node, so we POST the PDF to the server
 * (server.mjs handles /api/parse-ivk) and receive parsed years JSON back.
 *
 * Client-side this file is now just the API shape + a fetch wrapper.
 */

export interface IvkRow {
  rok: number;
  vz: number;
  vylouceneDny: number;
}

export interface IvkParseResult {
  jmeno: string;
  rc: string;
  rows: IvkRow[];
  parsedRowsCount: number;
  /** Souhrn evidovaných dnů z patičky ČSSZ (vč. náhradních dob), je-li v PDF. */
  celkemDnyPojisteni?: number | null;
  /** Součet dnů náhradních dob ("ND - …") — krátí se na 80 %. */
  nahradniDny?: number;
}

/**
 * Odvodí datum narození a pohlaví z rodného čísla (bez lomítka).
 * Měsíc: 01–12 muž, 51–62 žena; po r. 2004 též +20 muž / +70 žena.
 * Století: 9místné RČ = před 1954; 10místné yy<54 → 20xx, jinak 19xx.
 */
export function birthInfoFromRc(
  rc: string,
): { birthDate: string; gender: "male" | "female"; birthYear: number } | null {
  const digits = rc.replace(/\D/g, "");
  if (digits.length !== 9 && digits.length !== 10) return null;
  const yy = Number(digits.slice(0, 2));
  let mm = Number(digits.slice(2, 4));
  const dd = Number(digits.slice(4, 6));

  let gender: "male" | "female" = "male";
  if (mm > 70) {
    gender = "female";
    mm -= 70;
  } else if (mm > 50) {
    gender = "female";
    mm -= 50;
  } else if (mm > 20) {
    mm -= 20;
  }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const year = digits.length === 9 ? 1900 + yy : yy < 54 ? 2000 + yy : 1900 + yy;
  const iso = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  if (Number.isNaN(new Date(iso).getTime())) return null;
  return { birthDate: iso, gender, birthYear: year };
}

export async function parseIvkOnServer(
  buffer: ArrayBuffer,
): Promise<IvkParseResult> {
  const res = await fetch("/api/parse-ivk", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: buffer,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const json = (await res.json()) as { error?: string; stack?: string[] };
      detail = json.error ?? "";
      if (Array.isArray(json.stack)) {
        detail += "\n" + json.stack.join("\n");
      }
    } catch {
      detail = await res.text();
    }
    throw new Error(`Server vrátil ${res.status}: ${detail || "neznámá chyba"}`);
  }
  return (await res.json()) as IvkParseResult;
}
