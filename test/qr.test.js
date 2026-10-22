import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { qrMatrix, qrSvg, QR_DEFAULTS } from "../src/qr.js";
import { options, generate } from "../tools/qr/qr.mjs";
import { decode, decodePng, ROOT } from "./helpers.js";

test("matrix size follows the QR version", () => {
  const m = qrMatrix("https://card.example.com/me");
  assert.equal(m.size, 17 + 4 * m.version);
  assert.equal(m.rows.length, m.size);
  assert.ok(m.rows.every((r) => r.length === m.size && /^[01]+$/.test(r)));
});

test("the styled SVG decodes to the URL", async () => {
  for (const url of ["https://card.example.com/me", "https://card.example.com/me?e=summit", "https://example.com/" + "x".repeat(120)]) {
    assert.equal(await decode(qrSvg(url)), url);
  }
});

test("decodes with no margin on white, as the card draws it, also small", async () => {
  const url = "https://card.example.com/me?e=summit";
  const svg = qrSvg(url, { bg: "#ffffff", pad: 0 });
  for (const width of [600, 240, 160]) assert.equal(await decode(svg, width), url, `${width} px`);
});

test("colours are parameters", async () => {
  const svg = qrSvg("hello", { dot: "#112233", finders: ["#aa0000", "#00aa00", "#0000aa"], bg: "#fafafa" });
  assert.match(svg, /<g fill="#112233">/);
  for (const c of ["#aa0000", "#00aa00", "#0000aa", "#fafafa"]) assert.ok(svg.includes(c), c);
  assert.equal(await decode(svg), "hello");
  // Defaults when nothing is given.
  assert.ok(qrSvg("hello").includes(QR_DEFAULTS.finders[1]));
});

test("every error-correction level decodes", async () => {
  for (const ecc of ["L", "M", "Q", "H"]) assert.equal(await decode(qrSvg("https://card.example.com/me", { ecc })), "https://card.example.com/me");
});

test("command-line layouts all decode", async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "edge-vcard-qr-"));
  try {
    const o = options({
      config: path.join(ROOT, "card.example.json"),
      logo: path.join(ROOT, "examples/logo.svg"),
      out,
      prefix: "t",
      "qr-px": "600",
      wallpaper: "yes",
      widgets: "yes",
    });
    const { written } = await generate(o);
    const pngs = written.filter((f) => f.endsWith(".png"));
    assert.equal(pngs.length, 5);
    for (const file of pngs) {
      for (const width of [800, 300]) assert.equal(await decodePng(file, width), "https://card.example.com/me", `${path.basename(file)} at ${width} px`);
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
