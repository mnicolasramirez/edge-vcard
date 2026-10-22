# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-22

First public release.

- Card page with a flipping card and its QR, Save Contact, quick actions and link rows; light and dark mode; large-screen layout.
- vCard 3.0 with embedded photo, escaping and 75-octet line folding.
- Installable QR view that opens offline (service worker).
- Events: per-event notes, pre-filled Text, WhatsApp and Email, date windows in the event's time zone, a default event for codeless links.
- Swap contacts form stored in D1, with honeypot, minimum fill time and hourly cap.
- Privacy-preserving measurement in D1.
- Configurable theme (colours, fonts, logo, backgrounds) and base path; optional card data in KV.
- QR generator for print and phones (code, vertical card, iPhone widgets, Lock Screen wallpaper) with colours as parameters.
- Tests (node:test, QR decoding with ZXing) and GitHub Actions CI.
- Roadmap: the admin panel (v1, v2) and a companion web app.
