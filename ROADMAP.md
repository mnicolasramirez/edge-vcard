# Roadmap

What exists, what is being prepared for this repository and what may come later. Nothing below is a promise of a date; items move when they are ready and tested.

## Released

**0.1.0, the card.** The card page (light and dark, large-screen layout), Save Contact with a vCard 3.0 and photo, the installable QR view that opens offline, events with notes and date windows, the Swap contacts form, privacy-preserving measurement, the configurable theme, and the QR generator for print and phones. See the [changelog](CHANGELOG.md).

## Next: the admin panel, v1

An admin panel already runs alongside the card in production and will be published here as its own Worker, once its personal settings are taken out and it has the same tests and documentation as the card. It reads the same D1 database and writes the card data to KV, which is why the card already supports a card in KV with `card.json` as the fallback.

What v1 does:

- **Contacts** from the Swap form, newest first, filtered by event, with a CSV download that neutralises spreadsheet formulas and a delete with confirmation.
- **Phone check**: phone autofill on some devices drops the country code, so the panel suggests the likely code (from the visitor's country, the event's country and the email domain) and you confirm it. The number stays stored as typed.
- **Numbers**: views, saved contacts, opened and sent Swap forms per event, buttons tapped, phone or computer, in-app browsers, countries, by day. Link previews are left out.
- **Events**: create and edit events (dates, time zone, the default-event switch), message templates for the note, the pre-filled texts and follow-up emails, and the event's QR files: print SVG and PNG, the print card, phone widgets and Lock Screen wallpaper.
- **Card settings**: the Swap form switch, a download of the live card as JSON, and versions with restore.
- **Quick capture**: a photo of a paper business card or badge with a one-line note, tagged with the event.
- **Sign-in with two locks**: Cloudflare Access in front of the panel, and the Worker itself checking Access's signed token and the allowed email, so a mistaken Access policy alone cannot open it.

## Later: the admin panel, v2

- Edit everything in the card from the panel: links and their order, which fields go into the vCard, images, the theme.
- A live preview of the card while editing, and versions with rollback for every change.
- A guided "new event" flow in three steps (what and when, what people get, your QR), and the events list as cards with their numbers.
- A refreshed look and feel for the panel, with the card's light and dark modes.

## A companion web app

A separate, installable web app for the person who owns the card, used on a phone at events. It is being built on its own and will be published here when it is ready. Planned:

- Installs on the Home Screen next to the QR view, signed in through the same Access setup as the panel.
- Photograph a paper business card and get the contact fields filled in, using Workers AI on Cloudflare's free tier.
- Voice notes per contact or per meeting, transcribed with Workers AI.
- Export of contacts, photos and notes (CSV and Markdown) to wherever you keep your follow-ups.
- Replaces the panel's quick capture.

## Ideas, not scheduled

- Wallet passes: the card in Apple Wallet and Google Wallet, opened from the Lock Screen. Apple's passes need a paid developer membership to sign them, so this would be optional.
- Several personas on one deployment (for example a second language or a second role), each with its own path.
- Cloudflare Turnstile on the Swap form, only if the current spam guards stop being enough.
- An NFC tag guide, using `?s=nfc` source tags for the counts.

Suggestions are welcome: open an issue describing the use case before starting on a pull request, so we can agree on the shape first.
