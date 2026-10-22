// Styled QR codes: round dot modules and the three finder patterns drawn as rings, each in its
// own colour. Shared by the Worker (the SVGs on the card and the QR view) and by the
// command-line generator in tools/qr/, so a code drawn on the edge and one made for print match.

import QRCode from "qrcode/lib/core/qrcode.js";

export const QR_DEFAULTS = {
  bg: "#ffffff",
  dot: "#1f2937",
  // Top-left, top-right, bottom-left.
  finders: ["#6b7280", "#2563eb", "#1f2937"],
  pad: 2,
  ecc: "Q",
};

// Rows of "0"/"1", top to bottom. Error correction defaults to Q: dots cover less area than
// square modules, so the code needs the extra redundancy to read reliably.
export function qrMatrix(text, ecc = QR_DEFAULTS.ecc) {
  const qr = QRCode.create(text, { errorCorrectionLevel: ecc });
  const n = qr.modules.size;
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = "";
    for (let x = 0; x < n; x++) row += qr.modules.get(y, x) ? "1" : "0";
    rows.push(row);
  }
  return { size: n, version: qr.version, rows };
}

// The code drawn at one unit per module, starting at (0, 0). Returns SVG markup without a root.
export function qrBody(matrix, { dot = QR_DEFAULTS.dot, finders = QR_DEFAULTS.finders } = {}) {
  const n = matrix.size;
  const inFinder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const dots = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix.rows[y][x] === "1" && !inFinder(x, y)) dots.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.43"/>`);
    }
  }
  const [tl, tr, bl] = [0, 1, 2].map((i) => finders[i] || dot);
  const finder = (fx, fy, color) =>
    `<circle cx="${fx + 3.5}" cy="${fy + 3.5}" r="3" fill="none" stroke="${color}" stroke-width="1"/>` +
    `<circle cx="${fx + 3.5}" cy="${fy + 3.5}" r="1.25" fill="${color}"/>`;
  return `<g fill="${dot}">${dots.join("")}</g>` + finder(0, 0, tl) + finder(n - 7, 0, tr) + finder(0, n - 7, bl);
}

// The code alone, as a standalone SVG. pad is the quiet zone in modules.
export function qrSvg(text, options = {}) {
  const { bg, pad, ecc, dot, finders } = { ...QR_DEFAULTS, ...options };
  const m = qrMatrix(text, ecc);
  const full = m.size + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="${full * 20}" height="${full * 20}">
<rect width="${full}" height="${full}" fill="${bg}"/>
<g transform="translate(${pad} ${pad})">${qrBody(m, { dot, finders })}</g>
</svg>`;
}
