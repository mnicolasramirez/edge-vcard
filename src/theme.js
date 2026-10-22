// The configurable look: colours, fonts, logo and background images from the card's "theme",
// merged over a neutral default and served as /assets/theme.css. Every value is checked before
// it is written into CSS, so a card edited elsewhere (KV) cannot inject styles.

import { QR_DEFAULTS } from "./qr.js";

export const THEME_DEFAULTS = {
  // Starting mode for first-time visitors: "light", "dark" or "system" (the device's setting).
  // The sun/moon switch overrides it and is remembered on that device.
  mode: "light",
  // Card front, dark page, primary button in light mode, QR view header.
  brand: "#1f2937",
  // The small rule on the card, focus rings.
  accent: "#2563eb",
  // Light page and the QR side of the card.
  light: "#f3f4f6",
  // Dark page. Unset: the brand colour, a little darker, so the card stands out on it.
  dark: null,
  // Logo shown in white on the card front (an asset name, e.g. "logo-white.svg"). Without one,
  // the company name is shown in text.
  logo: null,
  // Optional background images (asset names) for the dark and light page.
  backgrounds: { dark: null, light: null },
  fonts: {
    heading: { family: "Montserrat", files: { 700: "fonts/Montserrat-Bold.woff2", 800: "fonts/Montserrat-ExtraBold.woff2" } },
    body: { family: "Sora", files: { 400: "fonts/Sora-Regular.woff2" } },
  },
  // QR colours. Unset values follow the brand and accent.
  qr: { dot: null, finders: null },
};

const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FAMILY = /^[A-Za-z0-9 _-]{1,40}$/;
export const ASSET_NAME = /^[a-z0-9][a-z0-9._/-]{0,80}$/i;

// Mixes a #rrggbb (or #rgb) colour with black: amount 0 keeps it, 1 gives black.
export function shade(hex, amount) {
  const full = hex.length === 4 ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex.slice(0, 7);
  const channel = (i) => Math.round(parseInt(full.slice(i, i + 2), 16) * (1 - amount)).toString(16).padStart(2, "0");
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

const color = (value, fallback) => (typeof value === "string" && COLOR.test(value) ? value : fallback);
const assetName = (value) =>
  typeof value === "string" && ASSET_NAME.test(value) && !value.includes("..") ? value : null;

function font(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  const family = typeof value.family === "string" && FAMILY.test(value.family) ? value.family : null;
  if (!family) return fallback;
  const files = {};
  for (const [weight, file] of Object.entries(value.files || {})) {
    if (/^[1-9]00$/.test(weight) && assetName(file)) files[weight] = file;
  }
  return { family, files };
}

// The theme with defaults filled in and every value checked.
export function resolveTheme(card) {
  const t = card?.theme && typeof card.theme === "object" ? card.theme : {};
  const d = THEME_DEFAULTS;
  const brand = color(t.brand, d.brand);
  const accent = color(t.accent, d.accent);
  const finders = Array.isArray(t.qr?.finders) ? t.qr.finders : [];
  return {
    mode: ["light", "dark", "system"].includes(t.mode) ? t.mode : d.mode,
    brand,
    accent,
    light: color(t.light, d.light),
    dark: color(t.dark, shade(brand, 0.3)),
    logo: assetName(t.logo),
    backgrounds: { dark: assetName(t.backgrounds?.dark), light: assetName(t.backgrounds?.light) },
    fonts: { heading: font(t.fonts?.heading, d.fonts.heading), body: font(t.fonts?.body, d.fonts.body) },
    qr: {
      dot: color(t.qr?.dot, brand),
      finders: [color(finders[0], QR_DEFAULTS.finders[0]), color(finders[1], accent), color(finders[2], brand)],
    },
  };
}

// theme.css: the custom properties card.css reads, and the @font-face rules.
export function themeCss(theme, assetUrl) {
  const formats = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };
  const faces = [];
  for (const f of [theme.fonts.heading, theme.fonts.body]) {
    for (const [weight, file] of Object.entries(f.files)) {
      const format = formats[file.split(".").pop().toLowerCase()] || "woff2";
      faces.push(
        `@font-face { font-family: "${f.family}"; font-weight: ${weight}; font-display: swap; src: url("${assetUrl(file)}") format("${format}"); }`
      );
    }
  }
  const image = (name) => (name ? `url("${assetUrl(name)}")` : "none");
  return `/* Generated from the card's theme. */
${faces.join("\n")}
:root {
  --brand: ${theme.brand};
  --accent: ${theme.accent};
  --light: ${theme.light};
  --dark: ${theme.dark};
  --head-font: "${theme.fonts.heading.family}";
  --body-font: "${theme.fonts.body.family}";
  --bg-dark: ${image(theme.backgrounds.dark)};
  --bg-light: ${image(theme.backgrounds.light)};
}
`;
}

// Files the theme needs, for the QR view's offline copy.
export function themeFiles(theme) {
  return [
    ...Object.values(theme.fonts.heading.files),
    ...Object.values(theme.fonts.body.files),
    theme.logo,
    theme.backgrounds.dark,
    theme.backgrounds.light,
  ].filter(Boolean);
}
