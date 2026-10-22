# Contributing

Thanks for helping. Bug reports, fixes and small, focused features are all welcome.

## Getting started

```bash
npm install
npm run setup     # card.json and wrangler.jsonc from the examples
npm test
npm run dev       # http://localhost:8787/me
```

Node.js 22 or later. The local database for the Swap form and the counts: `npx wrangler d1 migrations apply edge-vcard --local`.

## Principles

The project stays small on purpose. A change is more likely to be merged when it keeps these:

- **No build step and no framework.** Plain JavaScript modules for the Worker, server-rendered HTML, two small page scripts.
- **The strict Content Security Policy stays.** No inline scripts, no third-party requests from the page, no new origins in the policy.
- **Privacy by default.** No cookies, no IP addresses or user agents stored, nothing sent to third parties.
- **Free tier.** It must keep running on Cloudflare's free plan, and work without D1 or KV bound.
- **Configuration over code.** Anything that differs between two people's cards belongs in `card.json`, with a sensible default.
- **Phones first.** Check changes to the page at 320 px and 390 px wide, in light and dark mode, and on a large screen.

## Pull requests

1. One topic per pull request, with a short description of what changes and why.
2. Add or update tests for behaviour changes (`test/`, run with `npm test`). Touching the QR drawing? The tests decode the output; keep them passing.
3. Bump `VERSION` in `src/render.js` when `card.css` or a page script changes, so browsers and the offline QR view fetch the new files.
4. Update the README when configuration or behaviour changes, and add a line to `CHANGELOG.md` under "Unreleased".
5. Never commit a real person's contact details, photos, Cloudflare account or resource ids, or API tokens. The example persona and `example.com` addresses are there for tests and screenshots.

## Reporting bugs

Open an issue with the steps to reproduce, what you expected, what happened, and the device and browser (Save Contact behaves differently across iOS, Android and in-app browsers). For security problems, see [SECURITY.md](SECURITY.md) instead.
