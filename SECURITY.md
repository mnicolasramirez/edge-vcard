# Security

## Reporting a vulnerability

Please report security problems privately, through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for them.

Say what you found, how to reproduce it and what it affects. You should get a first answer within a week. Once a fix is out, the report is credited to you unless you prefer otherwise.

## Supported versions

Fixes go into the latest release on `main`. There are no long-term branches.

## Scope

In scope: the Worker (`src/`), the page scripts (`public/assets/*.js`), the QR generator (`tools/qr/`) and the default configuration. For example: a way to run script on the card page, to make the Worker draw or serve content it should not, to get around the Swap form's spam guards at scale, or to read stored contacts or counts.

Out of scope: your own Cloudflare account settings and tokens, content you put in your own `card.json`, and denial of service against Cloudflare's network.

## What the project does to stay safe

- A strict Content Security Policy on every page (no inline scripts, same-origin scripts and requests only, no framing, `form-action 'none'`).
- All card data is HTML-escaped; theme values are validated against strict patterns before they are written into CSS; event codes are only looked up in the card data.
- SVG and other files that are not pages are served with a sandboxing policy.
- The Swap endpoint accepts same-origin JSON only, at most 4 KB, with a honeypot field, a minimum fill time and an hourly cap.
- No cookies; no IP addresses or user agents are stored.

If you deploy this, keep your Cloudflare API token out of the repository (wrangler reads it from `wrangler login` or the `CLOUDFLARE_API_TOKEN` environment variable), and keep `card.json` and `wrangler.jsonc` out of public forks: both are in `.gitignore` for that reason.
