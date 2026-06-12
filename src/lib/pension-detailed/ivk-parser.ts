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
