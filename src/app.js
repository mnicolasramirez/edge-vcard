// The Worker: routes, card data, assets, measurement and the Swap contacts endpoint.
// createWorker(bundled) takes the card bundled at deploy (card.json); index.js wires it up.
//
// Routes, relative to BASE_PATH (wrangler.jsonc vars; "/me" by default, "" for the site root):
//   <base>               the card page
//   <base>/contact.vcf   vCard 3.0 with the photo; ?e=<code> adds the event's note
//   <base>/qr            installable QR view; <base>/qr-sw.js is its offline service worker
//   <base>/assets/*      files in public/assets/, plus theme.css and the QR SVGs drawn here
//   <base>/t             POST: tap counts (navigator.sendBeacon from card.js)
//   <base>/swap          POST: the Swap contacts form
//   anything else        302 to the card

import { eventFor, namedEvent, dayIn } from "./events.js";
import { qrSvg } from "./qr.js";
import { site, renderCard, renderQr, slug, hash, VERSION } from "./render.js";
import { parseLead, SWAP_MAX_BYTES, SWAP_MAX_PER_HOUR } from "./swap.js";
import { themeCss, themeFiles, ASSET_NAME } from "./theme.js";
import { buildVcard, vcardFilename } from "./vcard.js";

// Cloudflare Web Analytics (cookieless) is allowed in script-src and connect-src; remove those
// two hosts if you do not use it.
const SECURITY_HEADERS = {
  "content-security-policy":
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "x-robots-tag": "noindex",
};

// Files that are not pages: an SVG opened on its own runs nothing.
const ASSET_HEADERS = {
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
};
const ASSET_TYPES = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

// The fields the page, the QR view and the vCard cannot do without.
export function validCard(c) {
  const isObject = (o) => Boolean(o) && typeof o === "object" && !Array.isArray(o);
  const isText = (s) => typeof s === "string" && s.length > 0;
  return (
    isObject(c) &&
    ["canonical", "name", "givenName", "familyName"].every((k) => isText(c[k])) &&
    /^https:\/\//.test(c.canonical) &&
    isObject(c.contact) &&
    isObject(c.images) &&
    isText(c.images.photo) &&
    ASSET_NAME.test(c.images.photo) &&
    Array.isArray(c.links) &&
    c.links.every((l) => isObject(l) && isText(l.label) && isText(l.href)) &&
    (c.events === undefined || (isObject(c.events) && Object.values(c.events).every(isObject)))
  );
}

export function basePath(env) {
  const raw = env?.BASE_PATH ?? "/me";
  const trimmed = String(raw).trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(trimmed) ? trimmed : "/me";
}

export function createWorker(bundled) {
  // The card data: the KV key "card" when a KV namespace is bound as CARD and holds a valid card
  // (an admin tool can write it), otherwise the bundled card.json. Read through the edge cache
  // for a minute, so a change shows within about a minute plus the page's 5-minute browser cache.
  async function loadCard(env) {
    if (!env.CARD) return bundled;
    try {
      const live = await env.CARD.get("card", { type: "json", cacheTtl: 60 });
      if (live && validCard(live)) return live;
      if (live) console.log("card in KV is malformed; serving the bundled card.json");
    } catch (err) {
      console.log("card KV read failed; serving the bundled card.json:", err.message);
    }
    return bundled;
  }

  async function fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const base = basePath(env);
    const page = base || "/";

    // A route such as example.com/me* also catches /media, /meetings…: with PASS_THROUGH on,
    // those go to the site behind the route untouched.
    if (base && path !== base && !path.startsWith(`${base}/`)) {
      if (env.PASS_THROUGH === "true") return globalThis.fetch(request);
      return Response.redirect(`${url.origin}${page}`, 302);
    }
    const rel = base ? path.slice(base.length) || "/" : path;

    const read = request.method === "GET" || request.method === "HEAD";
    const card = await loadCard(env);
    const s = site(card, base);
    if (read && rel.startsWith("/assets/")) return asset(request, env, s, rel.slice("/assets/".length));

    if (rel === "/t") return tap(request, env, ctx, url, card);
    if (rel === "/swap") return swap(request, env, ctx, url, card);
    if (!read) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    if (base && rel === "/" && path.endsWith("/")) return Response.redirect(`${url.origin}${base}${url.search}`, 301);

    const visit = { event: eventFor(card, url.searchParams.get("e")), src: sourceFor(url.searchParams.get("s")) };

    if (rel === "/") {
      record(request, env, ctx, visit, "view");
      return html(renderCard(s, visit));
    }
    if (rel === "/qr") return html(renderQr(s, visit));
    if (rel === "/qr-sw.js") return serviceWorker(s);
    if (rel === "/contact.vcf") {
      record(request, env, ctx, visit, "save");
      return vcard(request, env, s, visit.event);
    }
    return Response.redirect(`${url.origin}${page}`, 302);
  }

  // Static files live in public/assets/ and are fetched from the assets binding. For a name that
  // is not there:
  // - theme.css is generated from the card's theme;
  // - qr.svg and qr-<code>.svg (a code in the card's events) are drawn in the theme's colours;
  // - anything else is looked up in KV as "asset:<name>", so a KV copy can add files but never
  //   replace a bundled one.
  async function asset(request, env, s, name) {
    if (name === "theme.css") {
      const body = themeCss(s.theme, s.asset);
      return new Response(request.method === "HEAD" ? null : body, {
        headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" },
      });
    }
    const res = await env.ASSETS.fetch(new Request(new URL(`/assets/${name}`, request.url), request));
    if (res.status !== 404) {
      const out = new Response(res.body, res);
      if (!/max-age/.test(res.headers.get("cache-control") || "")) out.headers.set("cache-control", "public, max-age=86400");
      out.headers.set("x-content-type-options", "nosniff");
      out.headers.set("x-robots-tag", "noindex");
      return out;
    }
    const qr = name.match(/^qr(?:-([a-z0-9][a-z0-9-]{0,23}))?\.svg$/);
    if (qr) return drawQr(request, s, qr[1], res);
    const ext = name.split(".").pop().toLowerCase();
    if (!env.CARD || !/^[a-z0-9][a-z0-9._-]{0,80}$/.test(name) || !Object.hasOwn(ASSET_TYPES, ext)) return res;
    let body = null;
    try {
      body = await env.CARD.get(`asset:${name}`, { type: "arrayBuffer", cacheTtl: 300 });
    } catch (err) {
      console.log("asset KV read failed:", err.message);
    }
    if (!body) return res;
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "content-type": ASSET_TYPES[ext], "cache-control": "public, max-age=300", ...ASSET_HEADERS },
    });
  }

  // The QR for the plain card or ?e=<code>, on white with no margin (the page puts it on a white
  // panel). Only codes in the card's events: an unknown code gets the 404, so nobody can make the
  // Worker draw arbitrary codes. Kept a day in the browser and in this data centre's cache; the
  // URL carries a version of the colours, so a theme change gets a new file.
  async function drawQr(request, s, code, notFound) {
    if (code && !Object.hasOwn(s.card.events || {}, code)) return notFound;
    const cache = globalThis.caches?.default;
    const key = new Request(request.url, { method: "GET" });
    const cached = cache && (await cache.match(key).catch(() => null));
    if (cached) return request.method === "HEAD" ? new Response(null, cached) : cached;
    const target = code ? `${s.card.canonical}?e=${encodeURIComponent(code)}` : s.card.canonical;
    const res = new Response(qrSvg(target, { bg: "#ffffff", pad: 0, dot: s.theme.qr.dot, finders: s.theme.qr.finders }), {
      headers: { "content-type": ASSET_TYPES.svg, "cache-control": "public, max-age=86400", ...ASSET_HEADERS },
    });
    if (cache) await cache.put(key, res.clone()).catch(() => {});
    return request.method === "HEAD" ? new Response(null, res) : res;
  }

  async function vcard(request, env, s, event) {
    const photo = await photoBase64(request, env, s);
    const body = buildVcard(s.card, { photo, event });
    return new Response(body, {
      headers: {
        "content-type": "text/vcard; charset=utf-8",
        "content-disposition": `inline; filename="${vcardFilename(s.card)}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
      },
    });
  }

  async function photoBase64(request, env, s) {
    const name = s.card.images.vcardPhoto;
    if (!name) return null;
    try {
      const res = await asset(new Request(new URL(s.asset(name), request.url)), env, s, name);
      if (!res.ok) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { base64: btoa(binary), type: /\.png$/i.test(name) ? "PNG" : "JPEG" };
    } catch {
      return null;
    }
  }

  return { fetch };
}

// Source tag (?s=nfc, ?s=sig…) for links placed in different places.
export function sourceFor(s) {
  if (!s) return null;
  return /^[a-z0-9-]{1,16}$/.test(s) ? s : "other";
}

function html(body) {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", ...SECURITY_HEADERS },
  });
}

// ---- Measurement (D1, binding STATS; optional) ----
// One row per card view, contact save and button tap. No cookies, no IP, no user agent kept:
// only the event, source, country, phone/desktop, in-app browser and the day.
const UI_TAPS = ["share", "qr", "flip", "photo", "swap"];
const PREVIEW_BOTS =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebot|whatsapp\/|preview|embedly|pinterest|skypeuripreview|headless|curl|wget|python|go-http|node-fetch|undici|axios|okhttp|^$/i;
const IN_APP = [
  ["linkedin", /LinkedInApp/i],
  ["instagram", /Instagram/i],
  ["facebook", /FBAN|FBAV|FB_IAB/],
  ["x", /Twitter/i],
  ["tiktok", /musical_ly|BytedanceWebview|TikTok/i],
  ["google", /\bGSA\//],
  ["line", /\bLine\//],
  ["wechat", /MicroMessenger/i],
];

function record(request, env, ctx, visit, kind, target = null) {
  if (!env.STATS || request.method === "HEAD") return;
  // Browsers' speculative prefetches are not visits.
  const purpose = request.headers.get("sec-purpose") || request.headers.get("purpose") || "";
  if (/prefetch|prerender/i.test(purpose)) return;
  const ua = request.headers.get("user-agent") || "";
  // Link-preview fetchers (WhatsApp, LinkedIn, Slack, iMessage…) are kept apart as "preview".
  const preview = PREVIEW_BOTS.test(ua);
  const event = visit.event;
  const write = env.STATS.prepare(
    "INSERT INTO hits (day, kind, target, event, via, src, country, device, inapp) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
  )
    .bind(
      dayIn(event?.timeZone || "UTC"),
      preview ? "preview" : kind,
      preview ? kind : target,
      event?.code ?? null,
      event?.via ?? null,
      visit.src,
      request.cf?.country ?? null,
      /Mobi|iPhone|iPod|Android/i.test(ua) ? "phone" : "desktop",
      IN_APP.find(([, re]) => re.test(ua))?.[0] ?? null
    )
    .run()
    // 13-month retention, trimmed now and then instead of on a schedule.
    .then(() => Math.random() < 0.02 && env.STATS.prepare("DELETE FROM hits WHERE day < date('now', '-13 months')").run())
    .catch((err) => console.log("stats write failed:", err.message));
  ctx.waitUntil(write);
}

// Button taps from card.js: navigator.sendBeacon('<base>/t?t=<tap>&e=<code>&v=<via>&s=<source>').
// Only known taps and event codes are kept; anything else is answered and dropped.
function tap(request, env, ctx, url, card) {
  const done = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return done;
  const target = url.searchParams.get("t");
  const taps = new Set([...card.links.map((link) => slug(link.label)), ...UI_TAPS]);
  if (!taps.has(target)) return done;
  const event = namedEvent(card, url.searchParams.get("e"), url.searchParams.get("v"));
  record(request, env, ctx, { event, src: sourceFor(url.searchParams.get("s")) }, "tap", target);
  return done;
}

// ---- Swap contacts (D1 table leads) ----
async function swap(request, env, ctx, url, card) {
  const reply = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
    });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
  if (!card.swap?.enabled || !env.STATS) return reply(404, { ok: false, error: "off" });
  if (request.headers.get("origin") !== url.origin) return reply(403, { ok: false, error: "origin" });
  if (Number(request.headers.get("content-length") || 0) > SWAP_MAX_BYTES) return reply(413, { ok: false, error: "size" });

  let data;
  try {
    const raw = await request.text();
    if (raw.length > SWAP_MAX_BYTES) return reply(413, { ok: false, error: "size" });
    data = JSON.parse(raw);
  } catch {
    return reply(400, { ok: false, error: "format" });
  }
  const parsed = parseLead(data);
  if (parsed.spam) return reply(200, { ok: true });
  if (parsed.error) return reply(422, { ok: false, error: parsed.error });
  const { lead } = parsed;

  const recent = await env.STATS.prepare("SELECT count(*) AS n FROM leads WHERE created_at > datetime('now', '-1 hour')").first();
  if (recent?.n >= SWAP_MAX_PER_HOUR) return reply(429, { ok: false, error: "busy" });

  const event = namedEvent(card, data.e, data.v);
  await env.STATS.prepare(
    "INSERT INTO leads (created_at, event, via, src, name, email, phone, company, role, country) VALUES (datetime('now'), ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
  )
    .bind(
      event?.code ?? null,
      event?.via ?? null,
      typeof data.s === "string" ? sourceFor(data.s) : null,
      lead.name,
      lead.email || null,
      lead.phone || null,
      lead.company || null,
      lead.role || null,
      request.cf?.country ?? null
    )
    .run();
  // 12-month retention, trimmed now and then.
  if (Math.random() < 0.1) {
    ctx.waitUntil(env.STATS.prepare("DELETE FROM leads WHERE created_at < datetime('now', '-12 months')").run().catch(() => {}));
  }
  return reply(200, { ok: true });
}

// Service worker for the QR view only (scope <base>/qr), so the Home Screen app opens with no
// signal. It keeps a copy of the QR view (plain and per event) and the files it uses, shows the
// copy at once and refreshes it in the background when there is a connection. The card page is
// never handled by it. Built here so the file list follows the card's events and theme.
const SW_REVISION = 1; // bump to force phones to drop their copies
function serviceWorker(s) {
  const codes = Object.keys(s.card.events || {});
  const qrPage = s.path("/qr");
  const files = [
    qrPage,
    ...codes.map((code) => `${qrPage}?e=${encodeURIComponent(code)}`),
    s.themeCss,
    s.css,
    s.qrJs,
    ...themeFiles(s.theme).map(s.asset),
    s.qrImage(null),
    ...codes.map((code) => s.qrImage(code)),
    s.asset(s.card.images.appIcon || s.card.images.photo),
  ];
  const cacheName = `card-qr-${SW_REVISION}-${hash(JSON.stringify(files) + VERSION)}`;
  const body = `// Generated by the Worker (serviceWorker in src/app.js).
const CACHE = ${JSON.stringify(cacheName)};
const FILES = ${JSON.stringify(files)};
const PAGE = ${JSON.stringify(qrPage)};
const ASSETS = ${JSON.stringify(s.asset(""))};

self.addEventListener("install", (e) => {
  // One missing file must not stop the rest from being kept.
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(FILES.map((f) => cache.add(f).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("card-qr-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const page = req.mode === "navigate" && url.pathname === PAGE;
  if (!page && !url.pathname.startsWith(ASSETS)) return;
  e.respondWith(fromCopy(e, req, page));
});

// The kept copy first, refreshed in the background; the network when there is no copy yet.
async function fromCopy(e, req, page) {
  const cache = await caches.open(CACHE);
  let copy = await cache.match(req);
  if (!copy && page) copy = await cache.match(PAGE);
  const fresh = fetch(req).then((res) => {
    if (res.ok) return cache.put(req, res.clone()).then(() => res);
    return res;
  });
  if (copy) {
    e.waitUntil(fresh.catch(() => {}));
    return copy;
  }
  return fresh;
}
`;
  return new Response(body, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
