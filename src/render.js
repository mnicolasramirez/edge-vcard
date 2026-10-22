// HTML for the card page, the Swap contacts sheet and the QR view. Every value from the card
// data is escaped here; nothing from the query string is written into a page except an event
// code that exists in the card.

import { resolveTheme } from "./theme.js";

// Line icons in currentColor, so they follow the page theme. A link's "icon" picks one.
export const ICONS = {
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 7l8.2 6 8.2-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  linkedin: '<circle cx="6.6" cy="6.4" r="1.75" fill="currentColor"/><rect x="5" y="9.2" width="3.2" height="10" rx=".5" fill="currentColor"/><path d="M10.6 9.2h3.05v1.45c.5-.95 1.75-1.7 3.3-1.7 2.75 0 3.65 1.7 3.65 4.4v5.85h-3.2v-5.2c0-1.3-.3-2.25-1.6-2.25-1.35 0-2 .95-2 2.35v5.1h-3.2z" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  message: '<path d="M12 4.6c4.6 0 8.2 2.9 8.2 6.6s-3.6 6.6-8.2 6.6c-.95 0-1.85-.12-2.7-.35L5.4 19.2l1.1-3.2C4.9 14.8 3.8 13.1 3.8 11.2c0-3.7 3.6-6.6 8.2-6.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  whatsapp: '<path d="M12 3.4a8.6 8.6 0 0 0-7.4 13l-1.2 4.2 4.3-1.1A8.6 8.6 0 1 0 12 3.4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 7.9c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1.1 1.5 1.9 2.6 2.4.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .5-.2 1.2-.7 1.6-.5.4-1.4.6-2.4.3-2.1-.7-3.8-2.3-4.7-4.2-.4-1-.4-2 .1-2.7.3-.5.6-.6.8-.6z" fill="currentColor"/>',
  phone: '<path d="M7.4 4l2-.2c.4 0 .7.2.85.55l1 2.5c.13.35.03.75-.25 1l-1.4 1.2a10.8 10.8 0 0 0 5.35 5.35l1.2-1.4c.25-.28.65-.38 1-.25l2.5 1c.35.15.57.47.55.85l-.2 2c-.08.85-.78 1.5-1.63 1.5C10.6 18.1 5.9 13.4 5.9 5.63c0-.85.65-1.55 1.5-1.63z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="14.8" r="1.6" fill="currentColor"/>',
};

const UI_ICONS = {
  share: '<path d="M12 3.5v11M8 7.3l4-3.8 4 3.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 10.5H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  qr: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13.5 13.5h2.5v2.5h-2.5zM17.5 17.5H20V20h-2.5zM13.5 17.5h2.5V20h-2.5zM17.5 13.5H20V16h-2.5z" fill="currentColor"/>',
  add: '<circle cx="9.5" cy="8" r="3.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 19.5c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18.5 8v6M15.5 11h6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  chev: '<path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  out: '<path d="M8 16L16.5 7.5M9.5 7.5h7v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  flip: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5M20 4v4.5h-4.5M20 12a8 8 0 0 1-13.7 5.6L4 15.5M4 20v-4.5h4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  moon: '<path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
};

// Bump when card.css or a script changes (the QR view's offline copy keys on these URLs too).
export const VERSION = "1";

export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const svg = (paths, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;

export function slug(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Short, stable fingerprint for cache names and version strings.
export function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Everything a page needs about where it lives. base is "" (the card at the site root) or a
// path such as "/me".
export function site(card, base) {
  const theme = resolveTheme(card);
  const asset = (name) => `${base}/assets/${name}`;
  const qrVersion = hash(JSON.stringify([card.canonical, theme.qr]));
  return {
    card,
    theme,
    base,
    page: base || "/",
    path: (p) => `${base}${p}`,
    asset,
    themeCss: `${asset("theme.css")}?v=${hash(JSON.stringify(theme))}`,
    css: `${asset("card.css")}?v=${VERSION}`,
    qrJs: `${asset("qr.js")}?v=${VERSION}`,
    // The QR image for an event code (or the plain card), drawn by the Worker in the theme's colours.
    qrImage: (code) => `${asset(code ? `qr-${code}.svg` : "qr.svg")}?v=${qrVersion}`,
    display: card.canonical.replace(/^https?:\/\//, ""),
  };
}

// Links inside the card keep the visit's explicit code and source, so a save or a tap is
// counted the same way. A code that came from the date window is not written into links.
export function carry(href, visit) {
  const params = new URLSearchParams();
  if (visit.event?.via === "code") params.set("e", visit.event.code);
  if (visit.src) params.set("s", visit.src);
  const query = params.toString();
  return query ? `${href}?${query}` : href;
}

// The QR shows the event's code only when the visit came with it; in the date window the plain
// card already acts as the event, so the QR stays plain.
export function qrFor(s, visit) {
  const code = visit.event?.via === "code" ? visit.event.code : null;
  return {
    target: code ? `${s.card.canonical}?e=${encodeURIComponent(code)}` : s.card.canonical,
    image: s.qrImage(code),
  };
}

// Pre-filled messages: with an event that has "swapMessage", Text and WhatsApp open with it
// written, so the visitor only adds their name and sends; with "emailSubject" / "emailBody",
// Email opens a new mail with them.
export function linkHref(link, event) {
  const sep = link.href.includes("?") ? "&" : "?";
  if (link.href.startsWith("mailto:") && (event?.emailSubject || event?.emailBody)) {
    // encodeURIComponent, not URLSearchParams: mail apps show a "+" literally. CRLF line breaks (RFC 6068).
    const parts = [];
    if (event.emailSubject) parts.push(`subject=${encodeURIComponent(event.emailSubject)}`);
    if (event.emailBody) parts.push(`body=${encodeURIComponent(event.emailBody.replace(/\r?\n/g, "\r\n"))}`);
    return `${link.href}${sep}${parts.join("&")}`;
  }
  const message = event?.swapMessage;
  if (!message) return link.href;
  // "?&body=" is the form both iOS Messages and Android read.
  if (link.href.startsWith("sms:")) return `${link.href}${sep === "?" ? "?&" : "&"}body=${encodeURIComponent(message)}`;
  if (link.href.startsWith("https://wa.me/")) return `${link.href}${sep}text=${encodeURIComponent(message)}`;
  return link.href;
}

function head(s, { title, extra = "", icon, themeColor }) {
  const { card } = s;
  const description = [card.title, card.company].filter(Boolean).join(" · ");
  const share = new URL(s.asset(card.images.share || card.images.photo), card.canonical).href;
  return `<!doctype html>
<html lang="${esc(card.lang || "en")}" data-base="${esc(s.base)}" data-mode="${s.theme.mode}" data-tc-light="${s.theme.light}" data-tc-dark="${s.theme.dark}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${themeColor}">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc([card.name, card.company].filter(Boolean).join(" · "))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(card.canonical)}">
<meta property="og:image" content="${esc(share)}">
<link rel="canonical" href="${esc(card.canonical)}">
<link rel="apple-touch-icon" href="${esc(icon)}">
<link rel="stylesheet" href="${esc(s.themeCss)}">
<link rel="stylesheet" href="${esc(s.css)}">
${extra}
</head>`;
}

function logo(s, cls) {
  const { card, theme } = s;
  if (theme.logo) return `<img class="${cls}" src="${esc(s.asset(theme.logo))}" alt="${esc(card.company || "")}">`;
  return `<span class="${cls} logo-text">${esc(card.company || "")}</span>`;
}

// The card page: the business card as an object that flips to its QR, then Save Contact, a row
// of quick actions and full-width links in the thumb zone. Links with "group": "quick" go in the
// row of four; the rest are full-width rows. On large screens card.css puts .me-hero on the left
// and shows the .me-scan QR panel above the actions; on phones .me-hero is display: contents and
// .me-scan is hidden.
export function renderCard(s, visit) {
  const { card } = s;
  const { event } = visit;
  const { target, image: qr } = qrFor(s, visit);
  const swapOn = Boolean(card.swap?.enabled);
  const photo = s.asset(card.images.photo);
  const open = (link) =>
    `<a href="${esc(linkHref(link, event))}"${link.newTab ? ' target="_blank"' : ""} rel="noopener" data-t="${esc(slug(link.label))}">`;
  // card.js sends these with each tap, so taps are counted under the same event and source.
  const data =
    (event ? ` data-e="${esc(event.code)}" data-v="${event.via}"` : "") + (visit.src ? ` data-s="${esc(visit.src)}"` : "");
  const quick = card.links
    .filter((link) => link.group === "quick")
    .map((link) => `<li>${open(link)}${svg(ICONS[link.icon] || ICONS.globe, "ic")}${esc(link.label)}</a></li>`)
    .join("\n");
  const rows = card.links
    .filter((link) => link.group !== "quick")
    .map(
      (link) => `<li>${open(link)}${svg(ICONS[link.icon] || ICONS.globe, "ic")}<span class="lbl">${esc(link.label)}</span>` +
        `<span class="end">${svg(link.newTab ? UI_ICONS.out : UI_ICONS.chev, "ic")}</span></a></li>`
    )
    .join("\n");
  // theme.js runs before the first paint so the page never flashes the wrong theme.
  const scripts =
    `<script src="${esc(s.asset("theme.js"))}?v=${VERSION}"></script>` +
    `<script src="${esc(s.asset("card.js"))}?v=${VERSION}" defer></script>`;
  const title = [card.name, card.company].filter(Boolean).join(" · ");

  return `${head(s, { title, extra: scripts, icon: photo, themeColor: s.theme.mode === "dark" ? s.theme.dark : s.theme.light })}
<body class="me-page">
<main class="me" data-base="${esc(s.base)}"${data}>
  <div class="me-bar">
    <span class="me-url">${esc(s.display)}</span>
    <div class="me-tools">
      <button class="me-tool" type="button" id="theme" aria-label="Switch to dark mode">${svg(UI_ICONS.sun, "ic sun")}${svg(UI_ICONS.moon, "ic moon")}</button>
      <a class="me-tool" href="${esc(carry(s.path("/qr"), visit))}" aria-label="Show QR code" data-t="qr">${svg(UI_ICONS.qr, "ic")}</a>
      <button class="me-tool" type="button" id="share" aria-label="Share this card" data-t="share">${svg(UI_ICONS.share, "ic")}</button>
    </div>
  </div>
  <div class="me-hero">
  <div class="me-stage">
    <div class="me-card" id="card" data-t="flip">
      <section class="me-face me-front">
        <div class="me-top">
          ${logo(s, "me-logo")}
          <button class="me-photo" type="button" id="zoom" aria-label="Enlarge photo" data-t="photo"><img src="${esc(photo)}" alt="" width="480" height="480"></button>
        </div>
        <div>
          <span class="me-rule" aria-hidden="true"></span>
          <h1>${esc(card.name)}</h1>
          <p class="me-title">${esc(card.title || "")}</p>
        </div>
      </section>
      <section class="me-face me-back" id="back" aria-hidden="true">
        <div class="me-qr"><img src="${esc(qr)}" alt="QR code for ${esc(target)}" width="600" height="600"></div>
        <p>Scan to save<br>my contact<small>${esc(s.display)}</small></p>
      </section>
    </div>
  </div>
  <button class="me-flip" type="button" id="flip" aria-controls="card" data-t="flip">${svg(UI_ICONS.flip, "ic")}Flip the card for my QR</button>
  </div>
  <aside class="me-scan" aria-label="Scan to save my contact on your phone">
    <div class="me-scan-qr"><img src="${esc(qr)}" alt="QR code for ${esc(target)}" width="600" height="600"></div>
    <div>
      <p class="me-scan-h">Scan to save<br> my contact</p>
      <p class="me-scan-s">Point your phone's camera at the code. On this computer, use Save Contact.</p>
    </div>
  </aside>
  <div class="me-actions">
    <a class="me-save" id="save" href="${esc(carry(s.path("/contact.vcf"), visit))}">${svg(UI_ICONS.add, "ic")}Save Contact</a>
    <p class="me-inapp" id="inapp" hidden>If saving doesn't open, tap ··· and choose <strong>Open in browser</strong>.</p>
    <ul class="me-dock">
${quick}
    </ul>
    <ul class="me-rows">
${rows}
    </ul>${swapOn ? '\n    <button class="me-swaplink" type="button" id="swaplink" data-t="swap" aria-haspopup="dialog">Swap contacts</button>' : ""}
  </div>
  <p class="me-foot">${card.company ? `<b>${esc(card.company)}</b>` : ""}${card.company && card.tagline ? " · " : ""}${esc(card.tagline || "")}</p>
</main>
<div class="me-lb" id="lb" role="dialog" aria-modal="true" aria-label="Photo of ${esc(card.name)}" hidden>
  <button class="me-lbx" type="button" id="lbx" aria-label="Close photo">×</button>
  <img src="${esc(photo)}" alt="${esc(card.name)}" width="480" height="480">
  <p class="me-lbn">${esc(card.name)}</p>
  <p class="me-lbt">${esc([card.title, card.company].filter(Boolean).join(" · "))}</p>
</div>
<p class="me-toast" id="toast" role="status" aria-live="polite"></p>${swapOn ? `\n${renderSwap(s, visit)}` : ""}
</body>
</html>`;
}

// The Swap contacts sheet. Real labels and autocomplete tokens, so iOS offers "AutoFill Contact"
// and Android its autofill. card.js opens it, checks it and sends it.
function renderSwap(s, visit) {
  const swap = s.card.swap || {};
  const consent = (swap.consent || "Shared with {name} so they can follow up.").replaceAll("{name}", s.card.name);
  return `<div class="me-dim" id="dim" hidden></div>
<section class="me-sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sh-title" tabindex="-1" hidden>
  <div class="me-grab" aria-hidden="true"></div>
  <div id="ask">
    <h2 id="sh-title">Swap contacts?</h2>
    <p class="me-sub">${esc(swap.subtitle || "Leave yours and I'll follow up.")}</p>
    <form class="me-frm" id="swapform" method="post" novalidate>
      <div class="me-fld"><label for="f-name">Name</label>
        <input id="f-name" name="name" type="text" autocomplete="name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="next" maxlength="100" required></div>
      <div class="me-fld"><label for="f-email">Email</label>
        <input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" maxlength="254"></div>
      <div class="me-two">
        <div class="me-fld"><label for="f-org">Company</label>
          <input id="f-org" name="company" type="text" autocomplete="organization" autocapitalize="words" enterkeyhint="next" maxlength="100"></div>
        <div class="me-fld"><label for="f-role">Role <i>· optional</i></label>
          <input id="f-role" name="role" type="text" autocomplete="organization-title" autocapitalize="words" enterkeyhint="next" maxlength="100"></div>
      </div>
      <div class="me-fld"><label for="f-tel">Phone <i>· optional if you give an email</i></label>
        <input id="f-tel" name="phone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="send" maxlength="40"></div>
      <div class="me-hp" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="me-err" id="swaperr" role="alert"></p>
      <p class="me-consent">${esc(consent)}</p>
      <button class="me-send" type="submit" id="swapsend">Send</button>
    </form>
    <button class="me-nothanks" type="button" data-close>No thanks</button>
  </div>
  <div class="me-done" id="done" hidden>
    <div class="me-tick" aria-hidden="true">${svg(UI_ICONS.tick, "ic")}</div>
    <h2>Thanks — saved</h2>
    <p class="me-sub">Don't forget to save my contact.</p>
    <a class="me-save" href="${esc(carry(s.path("/contact.vcf"), visit))}">${svg(UI_ICONS.add, "ic")}Save Contact</a>
    <button class="me-nothanks" type="button" data-close>Close</button>
  </div>
</section>`;
}

// The QR view: one phone screen with the card front on top and the QR below. Installable on the
// Home Screen; qr.js registers the service worker that lets it open offline.
export function renderQr(s, visit) {
  const { card } = s;
  const { target, image: qr } = qrFor(s, visit);
  const back = carry(s.page, visit);
  const appTitle = card.qr?.appTitle || "My QR";
  const install =
    '<meta name="apple-mobile-web-app-capable" content="yes">' +
    '<meta name="mobile-web-app-capable" content="yes">' +
    `<meta name="apple-mobile-web-app-title" content="${esc(appTitle)}">` +
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">' +
    // iOS Home Screen apps size 100vh without the status bar; qr.js sets the real height.
    `<script src="${esc(s.qrJs)}"></script>`;
  const icon = s.asset(card.images.appIcon || card.images.photo);
  return `${head(s, { title: `${card.name} · QR`, extra: install, icon, themeColor: s.theme.brand })}
<body class="qr-page">
<main class="qrv">
  <section class="qrv-front">
    ${logo(s, "qrv-logo")}
    <div class="qrv-id">
      <span class="qrv-rule" aria-hidden="true"></span>
      <h1 class="qrv-name">${esc(card.givenName)}<br>${esc(card.familyName)}</h1>
      <p class="qrv-title">${esc(card.title || "")}</p>
    </div>
  </section>
  <section class="qrv-back">
    <div class="qrv-center">
      <div class="qrv-panel"><img src="${esc(qr)}" alt="QR code for ${esc(target)}" width="600" height="600"></div>
      <p class="qrv-scan">Scan to save my contact</p>
      <a class="qrv-link" href="${esc(back)}">${esc(s.display)}</a>
    </div>
    <a class="qrv-btn" href="${esc(back)}">← Back to card</a>
  </section>
</main>
</body>
</html>`;
}
