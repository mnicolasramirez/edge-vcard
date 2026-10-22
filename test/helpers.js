// Test helpers: QR decoding, and a fake of the Worker's bindings (assets, D1, KV).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const exampleCard = () => JSON.parse(fs.readFileSync(path.join(ROOT, "card.example.json"), "utf8"));

// ZXing (C++ via WebAssembly) reads styled codes the way phone cameras do. The .wasm file is
// loaded from node_modules, so the tests never go to the network.
const require = createRequire(import.meta.url);
await prepareZXingModule({
  overrides: { wasmBinary: fs.readFileSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm")) },
  fireImmediately: true,
});

// Decodes the QR code in an SVG string, rendered at `width` px; returns the text or null.
export async function decode(svg, width = 600) {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: width }, background: "#ffffff" }).render();
  const image = { data: new Uint8ClampedArray(r.pixels), width: r.width, height: r.height, colorSpace: "srgb" };
  const found = await readBarcodes(image, { formats: ["QRCode"], tryHarder: false });
  return found[0]?.text ?? null;
}

// Decodes a PNG file, scaled to `width` px (also checks the code still reads when small).
export function decodePng(file, width = 800) {
  const bytes = fs.readFileSync(file);
  const [w, h] = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]; // PNG IHDR
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="data:image/png;base64,${bytes.toString("base64")}" width="${w}" height="${h}"/></svg>`;
  return decode(svg, width);
}

// Unfolds vCard lines (RFC 2425 §5.8.1).
export const unfold = (text) => text.replace(/\r\n /g, "");

// A minimal D1: records statements, answers count queries with `count`.
export function fakeD1({ count = 0 } = {}) {
  const runs = [];
  return {
    runs,
    prepare(sql) {
      const stmt = {
        sql,
        args: [],
        bind(...args) {
          stmt.args = args;
          return stmt;
        },
        async run() {
          runs.push({ sql, args: stmt.args });
          return { success: true };
        },
        async first() {
          return { n: count };
        },
      };
      return stmt;
    },
  };
}

// Serves public/ like the assets binding.
export function fakeAssets() {
  const types = { css: "text/css", js: "text/javascript", svg: "image/svg+xml", jpg: "image/jpeg", png: "image/png", woff2: "font/woff2" };
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const file = path.join(ROOT, "public", decodeURIComponent(url.pathname));
      if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        return new Response("Not found", { status: 404 });
      }
      return new Response(fs.readFileSync(file), { headers: { "content-type": types[file.split(".").pop()] || "application/octet-stream" } });
    },
  };
}

export function fakeKV(entries = {}) {
  return {
    async get(key, opts) {
      if (!(key in entries)) return null;
      const value = entries[key];
      if (opts?.type === "json") return typeof value === "string" ? JSON.parse(value) : value;
      return value;
    },
  };
}

export function fakeCtx() {
  const pending = [];
  return { pending, waitUntil: (p) => pending.push(p), settle: () => Promise.all(pending) };
}
