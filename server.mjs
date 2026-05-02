// Tiny static file server for the Vite SPA build.
// Built on Node built-ins — no external deps, designed for Railway.
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
  // Strip query/hash, decode, prevent traversal
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

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  let resolved = safeResolve(url);

  let hit = await tryRead(resolved);
  if (!hit) {
    // SPA fallback for any non-asset path
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
