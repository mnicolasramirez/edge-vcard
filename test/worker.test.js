import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorker, basePath, validCard } from "../src/app.js";
import { resolveTheme, themeCss } from "../src/theme.js";
import { exampleCard, fakeAssets, fakeCtx, fakeD1, fakeKV, decode, unfold } from "./helpers.js";

const ORIGIN = "https://card.example.com";

function setup({ card = exampleCard(), env = {} } = {}) {
  const worker = createWorker(card);
  const stats = env.STATS ?? fakeD1();
  const fullEnv = { ASSETS: fakeAssets(), STATS: stats, BASE_PATH: "/me", ...env };
  const call = async (path, init = {}) => {
    const ctx = fakeCtx();
    const res = await worker.fetch(new Request(ORIGIN + path, init), fullEnv, ctx);
    await ctx.settle();
    return res;
  };
  return { call, stats };
}

const swapBody = (extra = {}) =>
  JSON.stringify({ name: "Sam Visitor", email: "sam@example.org", company: "Visitor Ltd", role: "", phone: "", website: "", ms: 4000, ...extra });
const swapInit = (body, origin = ORIGIN) => ({ method: "POST", headers: { origin, "content-type": "application/json" }, body });

test("card page: 200, strict CSP, noindex, escaped content", async () => {
  const card = { ...exampleCard(), name: 'Riley <script>alert(1)</script> "Morgan"' };
  const { call, stats } = setup({ card });
  const res = await call("/me");
  assert.equal(res.status, 200);
  const csp = res.headers.get("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
  const html = await res.text();
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("Riley &lt;script&gt;alert(1)&lt;/script&gt; &quot;Morgan&quot;"));
  assert.ok(!/<script>(?!<\/script>)/.test(html), "no inline scripts");
  assert.equal(stats.runs.filter((r) => r.sql.startsWith("INSERT INTO hits")).length, 1);
});

test("routes: QR view, service worker, theme, unknown paths", async () => {
  const { call } = setup();
  assert.equal((await call("/me/qr")).status, 200);
  const sw = await call("/me/qr-sw.js");
  assert.match(sw.headers.get("content-type"), /javascript/);
  const swText = await sw.text();
  assert.ok(swText.includes('"/me/qr?e=summit"'));
  assert.ok(swText.includes("/me/assets/qr-summit.svg?v="));
  const theme = await call("/me/assets/theme.css");
  assert.match(await theme.text(), /--brand: #1f2937;/);
  const nope = await call("/me/nope");
  assert.equal(nope.status, 302);
  assert.equal(nope.headers.get("location"), `${ORIGIN}/me`);
  assert.equal((await call("/me/")).status, 301);
  assert.equal((await call("/me/assets/card.css")).status, 200);
  assert.equal((await call("/me", { method: "DELETE" })).status, 405);
});

test("paths outside the base redirect, or pass through when asked", async () => {
  const { call } = setup();
  assert.equal((await call("/media")).status, 302);
  const real = globalThis.fetch;
  globalThis.fetch = async (req) => new Response(`origin saw ${new URL(req.url).pathname}`);
  try {
    const { call: through } = setup({ env: { PASS_THROUGH: "true" } });
    assert.equal(await (await through("/media")).text(), "origin saw /media");
  } finally {
    globalThis.fetch = real;
  }
});

test("BASE_PATH: default, root and invalid values", () => {
  assert.equal(basePath({}), "/me");
  assert.equal(basePath({ BASE_PATH: "" }), "");
  assert.equal(basePath({ BASE_PATH: "/" }), "");
  assert.equal(basePath({ BASE_PATH: "/card/" }), "/card");
  assert.equal(basePath({ BASE_PATH: "/../x" }), "/me");
});

test("the card at the site root", async () => {
  const { call } = setup({ env: { BASE_PATH: "" } });
  const html = await (await call("/")).text();
  assert.ok(html.includes('href="/contact.vcf"'));
  assert.ok(html.includes('src="/assets/card.js?v='));
  assert.equal((await call("/contact.vcf")).status, 200);
  assert.equal((await call("/qr")).status, 200);
});

test("vCard: headers, photo from assets, note only for an open event", async () => {
  const { call } = setup();
  const res = await call("/me/contact.vcf");
  assert.equal(res.headers.get("content-type"), "text/vcard; charset=utf-8");
  assert.match(res.headers.get("content-disposition"), /filename="Riley-Morgan\.vcf"/);
  const text = unfold(await res.text());
  assert.match(text, /PHOTO;ENCODING=b;TYPE=JPEG:\/9j\//);
  assert.doesNotMatch(text, /NOTE/);

  const card = exampleCard();
  card.events.summit.from = "2000-01-01";
  card.events.summit.until = "2999-12-31";
  const open = setup({ card });
  assert.match(unfold(await (await open.call("/me/contact.vcf?e=summit")).text()), /NOTE:Met at Example Summit/);
  assert.doesNotMatch(await (await open.call("/me/contact.vcf?e=__proto__")).text(), /NOTE/);
});

test("event pages pre-fill Text, WhatsApp and Email", async () => {
  const card = exampleCard();
  card.events.summit.from = "2000-01-01";
  card.events.summit.until = "2999-12-31";
  const { call } = setup({ card });
  const html = await (await call("/me?e=summit")).text();
  assert.ok(html.includes("sms:+12025550143?&amp;body=Hi%20Riley%2C%20we%20met"));
  assert.ok(html.includes("https://wa.me/12025550143?text=Hi%20Riley"));
  assert.ok(html.includes("mailto:riley@example.com?subject=We%20met%20at%20Example%20Summit%202027&amp;body=Hi%20Riley%2C%0D%0A%0D%0AWe"));
  assert.ok(html.includes('href="/me/contact.vcf?e=summit"'));
  assert.ok(html.includes("/me/assets/qr-summit.svg?v="));
  // The plain card has none of it.
  const plain = await (await call("/me")).text();
  assert.ok(!plain.includes("body=") && !plain.includes("qr-summit"));
});

test("QR SVGs: drawn in theme colours, decode, unknown codes 404", async () => {
  const card = exampleCard();
  card.theme.qr = { dot: "#123456", finders: ["#aa0000", "#00aa00", "#0000aa"] };
  const { call } = setup({ card });
  const plain = await call("/me/assets/qr.svg");
  assert.equal(plain.status, 200);
  assert.match(plain.headers.get("content-security-policy"), /sandbox/);
  const svg = await plain.text();
  assert.ok(svg.includes('fill="#123456"') && svg.includes("#aa0000"));
  assert.equal(await decode(svg), card.canonical);
  assert.equal(await decode(await (await call("/me/assets/qr-summit.svg")).text()), `${card.canonical}?e=summit`);
  assert.equal((await call("/me/assets/qr-nope.svg")).status, 404);
});

test("theme values are checked before they reach CSS", () => {
  const theme = resolveTheme({
    theme: {
      brand: "red;} body{display:none",
      accent: "#00ff00",
      logo: "../../secret.svg",
      fonts: { heading: { family: 'X"; } *{', files: { 700: "a.woff2" } } },
      backgrounds: { dark: "bg.jpg", light: "javascript:alert(1)" },
    },
  });
  assert.equal(theme.brand, "#1f2937");
  assert.equal(theme.accent, "#00ff00");
  assert.equal(theme.logo, null);
  assert.equal(theme.fonts.heading.family, "Montserrat");
  assert.equal(theme.backgrounds.light, null);
  const css = themeCss(theme, (n) => `/me/assets/${n}`);
  assert.ok(!css.includes("display:none") && !css.includes("javascript"));
  assert.ok(css.includes('--bg-dark: url("/me/assets/bg.jpg")'));
});

test("swap: a valid contact is stored", async () => {
  const { call, stats } = setup();
  const res = await call("/me/swap", swapInit(swapBody()));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const insert = stats.runs.find((r) => r.sql.startsWith("INSERT INTO leads"));
  assert.ok(insert);
  assert.equal(insert.args[3], "Sam Visitor");
  assert.equal(insert.args[4], "sam@example.org");
});

test("swap: honeypot and too-fast sends get ok but store nothing", async () => {
  for (const body of [swapBody({ website: "http://spam.example" }), swapBody({ ms: 300 }), swapBody({ ms: undefined })]) {
    const { call, stats } = setup();
    const res = await call("/me/swap", swapInit(body));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(stats.runs.filter((r) => r.sql.startsWith("INSERT INTO leads")).length, 0);
  }
});

test("swap: origin, size, format, validation, rate limit, switch", async () => {
  const { call } = setup();
  assert.equal((await call("/me/swap", swapInit(swapBody(), "https://evil.example"))).status, 403);
  assert.equal((await call("/me/swap", { method: "POST", headers: { "content-type": "application/json" }, body: swapBody() })).status, 403);
  assert.equal((await call("/me/swap", swapInit(swapBody({ name: "x".repeat(5000) })))).status, 413);
  assert.equal((await call("/me/swap", swapInit("{not json"))).status, 400);
  const err = async (extra) => (await (await call("/me/swap", swapInit(swapBody(extra)))).json()).error;
  assert.equal(await err({ name: "  " }), "name");
  assert.equal(await err({ email: "not-an-email" }), "email");
  assert.equal(await err({ email: "", phone: "abc" }), "phone");
  assert.equal(await err({ email: "", phone: "" }), "reach");
  assert.equal((await call("/me/swap")).status, 405);

  const busy = setup({ env: { STATS: fakeD1({ count: 30 }) } });
  assert.equal((await busy.call("/me/swap", swapInit(swapBody()))).status, 429);

  const off = setup({ card: { ...exampleCard(), swap: { enabled: false } } });
  assert.equal((await off.call("/me/swap", swapInit(swapBody()))).status, 404);
  assert.ok(!(await (await off.call("/me")).text()).includes("swapform"));
});

test("taps: known targets counted, others dropped", async () => {
  const { call, stats } = setup();
  const tap = (q, origin = ORIGIN) => call(`/me/t?${q}`, { method: "POST", headers: { origin, "user-agent": "Mozilla/5.0 (iPhone)" } });
  assert.equal((await tap("t=linkedin")).status, 204);
  assert.equal((await tap("t=share")).status, 204);
  assert.equal((await tap("t=not-a-button")).status, 204);
  assert.equal((await tap("t=linkedin", "https://evil.example")).status, 204);
  const taps = stats.runs.filter((r) => r.sql.startsWith("INSERT INTO hits"));
  assert.deepEqual(taps.map((r) => r.args[2]), ["linkedin", "share"]);
});

test("measurement keeps link previews apart and skips prefetches", async () => {
  const { call, stats } = setup();
  await call("/me", { headers: { "user-agent": "WhatsApp/2.23 A" } });
  await call("/me", { headers: { "user-agent": "Mozilla/5.0 (iPhone)", "sec-purpose": "prefetch" } });
  await call("/me", { headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) LinkedInApp" } });
  const rows = stats.runs.filter((r) => r.sql.startsWith("INSERT INTO hits")).map((r) => r.args);
  assert.equal(rows.length, 2);
  assert.equal(rows[0][1], "preview");
  assert.deepEqual([rows[1][1], rows[1][7], rows[1][8]], ["view", "phone", "linkedin"]);
});

test("works with no D1 and no KV bound", async () => {
  const { call } = setup({ env: { STATS: undefined } });
  assert.equal((await call("/me")).status, 200);
  assert.equal((await call("/me/swap", swapInit(swapBody()))).status, 404);
});

test("KV card wins when valid, bundled card otherwise", async () => {
  const kvCard = { ...exampleCard(), title: "Chief Example Officer" };
  const good = setup({ env: { CARD: fakeKV({ card: kvCard }) } });
  assert.ok((await (await good.call("/me")).text()).includes("Chief Example Officer"));
  const broken = setup({ env: { CARD: fakeKV({ card: { name: "only a name" } }) } });
  assert.ok((await (await broken.call("/me")).text()).includes("Head of Partnerships"));
  assert.equal(validCard(exampleCard()), true);
  assert.equal(validCard({ ...exampleCard(), canonical: "http://insecure.example" }), false);
});
