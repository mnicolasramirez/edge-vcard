#!/usr/bin/env node
// Styled QR codes for print and phones, drawn with the same code as the card (src/qr.js):
// round dot modules and three ring finders, each in its own colour.
//
//   node tools/qr/qr.mjs --url https://card.example.com/me --out out --prefix card [options]
//
// Outputs, for --prefix P in --out:
//   P-qr.svg / P-qr-<N>px.png    the code alone (--bg, --pad, --qr-px)
//   P-card.svg / P-card.png      a vertical card: logo, code, name band, link band (skip: --qr-only yes)
//   P-wallpaper.png              phone Lock Screen wallpaper, 1290 x 2796 (--wallpaper yes)
//   P-widget-medium.png / P-widget-large.png   iPhone Photos-widget cards (--widgets yes)
//
// --config card.json fills the name, title, link, colours and logo from your card; any flag
// given on the command line wins. Run with --help for every option.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qrMatrix, qrBody, QR_DEFAULTS } from "../../src/qr.js";
import { resolveTheme } from "../../src/theme.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FONTS = path.join(HERE, "fonts");

const HELP = `Options:
  --url <text>          what the code encodes (required, or "canonical" from --config)
  --out <folder>        where files are written (default: out)
  --prefix <name>       file name prefix (default: card)
  --config <card.json>  read name, title, link, colours and logo from a card file
  --name, --title       text on the card, widgets and wallpaper
  --footer <text>       link line (default: the URL without https://)
  --ecc L|M|Q|H         error correction (default Q)
  --bg <#hex>           ground of the code alone (default #ffffff)
  --pad <modules>       quiet zone around the code alone (default 2)
  --qr-px <px>          PNG width of the code alone (default 2000)
  --dot <#hex>          dot colour
  --finders <#a,#b,#c>  finder rings: top-left, top-right, bottom-left
  --brand <#hex>        dark bands and widget fronts
  --band <#hex>         the card's name band (default: the accent)
  --accent <#hex>       the small rule on widgets
  --light <#hex>        light grounds (card, large widget)
  --logo <file>         logo on light grounds (SVG or PNG), for the card
  --logo-inverse <file> logo on dark grounds (SVG or PNG), for widgets
  --bg-dark <file>      optional background image for widget fronts (JPEG or PNG)
  --qr-only yes         only the code alone
  --wallpaper yes       also the Lock Screen wallpaper
  --widgets yes         also the medium and large widget images`;

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { help: true };
    if (!a.startsWith("--")) throw new Error(`Unexpected argument ${a}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${a} needs a value`);
    out[a.slice(2)] = value;
    i++;
  }
  return out;
}

// Flags over the card file over the defaults.
export function options(flags) {
  let card = null;
  if (flags.config) card = JSON.parse(fs.readFileSync(flags.config, "utf8"));
  const theme = resolveTheme(card || {});
  const assetFile = (name) => (name ? path.join(ROOT, "public/assets", name) : null);
  const url = flags.url || card?.canonical;
  if (!url) throw new Error("--url is required (or --config with a canonical URL)");
  const finders = flags.finders ? flags.finders.split(",").map((s) => s.trim()) : theme.qr.finders;
  return {
    url,
    out: flags.out || "out",
    prefix: flags.prefix || "card",
    name: flags.name ?? card?.name ?? "",
    title: flags.title ?? card?.title ?? "",
    footer: flags.footer || url.replace(/^https?:\/\//, ""),
    ecc: flags.ecc || QR_DEFAULTS.ecc,
    bg: flags.bg || QR_DEFAULTS.bg,
    pad: flags.pad !== undefined ? Number(flags.pad) : QR_DEFAULTS.pad,
    qrPx: flags["qr-px"] ? Number(flags["qr-px"]) : 2000,
    dot: flags.dot || theme.qr.dot,
    finders,
    brand: flags.brand || theme.brand,
    band: flags.band || flags.accent || theme.accent,
    accent: flags.accent || theme.accent,
    light: flags.light || theme.light,
    logo: flags.logo || null,
    logoInverse: flags["logo-inverse"] || assetFile(theme.logo),
    bgDark: flags["bg-dark"] || assetFile(theme.backgrounds.dark),
    qrOnly: flags["qr-only"] === "yes",
    wallpaper: flags.wallpaper === "yes",
    widgets: flags.widgets === "yes",
  };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function code(o) {
  const m = qrMatrix(o.url, o.ecc);
  return { size: m.size, version: m.version, body: qrBody(m, { dot: o.dot, finders: o.finders }) };
}

// A logo placed at (x, y), width w: SVG files are inlined (scaled from their viewBox), raster
// files embedded as data URIs. Missing file: nothing.
function placeLogo(file, x, y, w) {
  if (!file || !fs.existsSync(file)) return "";
  if (/\.svg$/i.test(file)) {
    const src = fs.readFileSync(file, "utf8").replace(/<\?xml[^>]*>/, "");
    const vb = src.match(/viewBox="([\d.\s-]+)"/);
    const [, , vw, vh] = vb ? vb[1].trim().split(/\s+/).map(Number) : [0, 0, 100, 100];
    const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<svg x="${x}" y="${y}" width="${w}" height="${(w * vh) / vw}" viewBox="0 0 ${vw} ${vh}">${inner}</svg>`;
  }
  const type = /\.png$/i.test(file) ? "png" : "jpeg";
  const data = fs.readFileSync(file).toString("base64");
  return `<image href="data:image/${type};base64,${data}" x="${x}" y="${y}" width="${w}" height="${w * 0.36}" preserveAspectRatio="xMinYMid meet"/>`;
}

function imageUri(file) {
  if (!file || !fs.existsSync(file)) return null;
  const type = /\.png$/i.test(file) ? "png" : "jpeg";
  return `data:image/${type};base64,${fs.readFileSync(file).toString("base64")}`;
}

export function qrOnlySvg(o) {
  const { size, body, version } = code(o);
  const full = size + o.pad * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="${full * 20}" height="${full * 20}">
<rect width="${full}" height="${full}" fill="${o.bg}"/>
<g transform="translate(${o.pad} ${o.pad})">${body}</g>
</svg>`;
  return { svg, size, version };
}

// Vertical card on a 720 x 1182 canvas: logo, code, name band, link band.
export function cardSvg(o) {
  const { size, body } = code(o);
  const qrW = 557;
  const k = qrW / size;
  const link =
    '<path d="M10.6 13.4a3.6 3.6 0 0 0 5.1 0l3.2-3.2a3.6 3.6 0 0 0-5.1-5.1l-1.1 1.1M13.4 10.6a3.6 3.6 0 0 0-5.1 0l-3.2 3.2a3.6 3.6 0 0 0 5.1 5.1l1.1-1.1" ' +
    'fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1182" width="720" height="1182">
<rect width="720" height="1182" fill="${o.light}"/>
${placeLogo(o.logo, 75, 75, 260)}
<g transform="translate(75 248) scale(${k})">${body}</g>
<rect y="907" width="720" height="170" fill="${o.band}"/>
<text x="75" y="986" font-family="Montserrat" font-weight="800" font-size="35" fill="#ffffff">${esc(o.name)}</text>
<text x="75" y="1029" font-family="Montserrat" font-weight="700" font-size="22" fill="#ffffff">${esc(o.title)}</text>
<rect y="1077" width="720" height="105" fill="${o.brand}"/>
<g transform="translate(73 1118)">${link}</g>
<text x="115" y="1139" font-family="Montserrat" font-weight="700" font-size="24" fill="#ffffff" text-decoration="underline">${esc(o.footer)}</text>
</svg>`;
}

// Phone Lock Screen wallpaper, 1290 x 2796. The top third stays empty for the clock and
// widgets, the bottom for the flashlight and camera.
export function wallpaperSvg(o) {
  const { size, body } = code(o);
  const W = 1290;
  const panel = { x: 165, y: 1010, w: 960 };
  const margin = 70;
  const k = (panel.w - margin * 2) / size;
  const cx = W / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 2796" width="${W}" height="2796">
<rect width="${W}" height="2796" fill="${o.brand}"/>
<rect x="${panel.x}" y="${panel.y}" width="${panel.w}" height="${panel.w}" rx="56" fill="#ffffff"/>
<g transform="translate(${panel.x + margin} ${panel.y + margin}) scale(${k})">${body}</g>
<text x="${cx}" y="${panel.y + panel.w + 135}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="64" fill="#ffffff">${esc(o.name)}</text>
<text x="${cx}" y="${panel.y + panel.w + 205}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="38" fill="#ffffff" fill-opacity="0.75">${esc(o.title)}</text>
<text x="${cx}" y="${panel.y + panel.w + 275}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="36" fill="#ffffff" text-decoration="underline">${esc(o.footer)}</text>
</svg>`;
}

// The card front for widgets: brand block, optional background image, inverse logo, accent
// rule, name and title. s scales the type.
function front(o, x, y, w, h, s) {
  const pad = 56 * s;
  const bg = imageUri(o.bgDark);
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
<rect width="${w}" height="${h}" fill="${o.brand}"/>
${bg ? `<image href="${bg}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMax slice"/>` : ""}
</svg>
${placeLogo(o.logoInverse, x + pad, y + pad * 0.95, 210 * s)}
<rect x="${x + pad}" y="${y + h - pad - 132 * s}" width="${44 * s}" height="${5 * s}" rx="${2.5 * s}" fill="${o.accent}"/>
<text x="${x + pad}" y="${y + h - pad - 62 * s}" font-family="Montserrat" font-weight="800" font-size="${48 * s}" fill="#ffffff">${esc(o.name)}</text>
<text x="${x + pad}" y="${y + h - pad - 8 * s}" font-family="Sora" font-weight="400" font-size="${27 * s}" fill="#ffffff" fill-opacity="0.85">${esc(o.title)}</text>`;
}

// Photos-widget images, at 3x the iPhone Pro Max widget points so the widget shows them
// uncropped: medium 364 x 170 pt, large 364 x 382 pt.
export function widgetMediumSvg(o) {
  const W = 1092;
  const H = 510;
  const { size, body } = code(o);
  const m = 52;
  const k = (H - m * 2) / size;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${H}" height="${H}" fill="#ffffff"/>
<g transform="translate(${m} ${m}) scale(${k})">${body}</g>
${front(o, H, 0, W - H, H, 1)}
</svg>`;
}

export function widgetLargeSvg(o) {
  const W = 1092;
  const H = 1146;
  const { size, body } = code(o);
  const bandH = 400;
  const top = H - bandH;
  const qrW = 560;
  const k = qrW / size;
  const qx = (W - qrW) / 2;
  const qy = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${top}" fill="${o.light}"/>
<rect x="${qx - 36}" y="${qy - 36}" width="${qrW + 72}" height="${qrW + 72}" rx="40" fill="#ffffff" stroke="#d6d9dc" stroke-width="2"/>
<g transform="translate(${qx} ${qy}) scale(${k})">${body}</g>
<text x="${W / 2}" y="${qy + qrW + 36 + 62}" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="27" letter-spacing="4.2" fill="${o.brand}">SCAN TO SAVE MY CONTACT</text>
${front(o, 0, top, W, bandH, 1.2)}
</svg>`;
}

export async function png(svg, width) {
  const { Resvg } = await import("@resvg/resvg-js");
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: ["Montserrat-Bold.ttf", "Montserrat-ExtraBold.ttf", "Sora-Regular.ttf"].map((f) => path.join(FONTS, f)),
      loadSystemFonts: false,
      defaultFontFamily: "Montserrat",
    },
  });
  return r.render().asPng();
}

export async function generate(o) {
  fs.mkdirSync(o.out, { recursive: true });
  const base = path.join(o.out, o.prefix);
  const written = [];
  const write = (file, data) => {
    fs.writeFileSync(file, data);
    written.push(file);
  };
  const q = qrOnlySvg(o);
  write(`${base}-qr.svg`, q.svg);
  write(`${base}-qr-${o.qrPx}px.png`, await png(q.svg, o.qrPx));
  if (!o.qrOnly) {
    const card = cardSvg(o);
    write(`${base}-card.svg`, card);
    write(`${base}-card.png`, await png(card, 1440));
  }
  if (o.wallpaper) write(`${base}-wallpaper.png`, await png(wallpaperSvg(o), 1290));
  if (o.widgets) {
    write(`${base}-widget-medium.png`, await png(widgetMediumSvg(o), 1092));
    write(`${base}-widget-large.png`, await png(widgetLargeSvg(o), 1092));
  }
  return { written, size: q.size, version: q.version };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const flags = parseArgs(process.argv.slice(2));
    if (flags.help) {
      console.log(HELP);
      process.exit(0);
    }
    const o = options(flags);
    const { written, size, version } = await generate(o);
    console.log(`${o.prefix}: ${o.url} (QR version ${version}, ${size}x${size} modules, ECC ${o.ecc})`);
    for (const file of written) console.log(`  ${file}`);
  } catch (err) {
    console.error(err.message);
    console.error('Run with --help for the options.');
    process.exit(1);
  }
}
