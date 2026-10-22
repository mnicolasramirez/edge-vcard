// vCard 3.0: the version iOS and Android Contacts both import reliably.

// Escape text values (RFC 2426 §4): backslash, newline, comma and semicolon.
export function escapeText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

// Fold a content line at 75 octets without splitting a UTF-8 character (RFC 2425 §5.8.1).
// Continuation lines start with one space, which counts towards their 75 octets.
export function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + n > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

// Builds the vCard text. photo: { base64, type: "JPEG" | "PNG" } or null. event: the visit's
// event (its "note" is added) or null. Contact fields that are missing are left out.
export function buildVcard(card, { photo = null, event = null, now = new Date() } = {}) {
  const c = card.contact || {};
  const labels = { linkedin: "LinkedIn", booking: "Book a meeting", card: "Digital card", whatsapp: "WhatsApp", ...card.vcard?.labels };
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeText(card.familyName)};${escapeText(card.givenName)};;;`,
    `FN:${escapeText(card.name)}`,
  ];
  if (card.company) lines.push(`ORG:${escapeText(card.company)}`);
  if (card.title) lines.push(`TITLE:${escapeText(card.title)}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeText(c.email)}`);
  // The main number first and PREF, so calls and texts default to it.
  if (c.phone) lines.push(`TEL;TYPE=CELL,VOICE,PREF:${escapeText(c.phone)}`);

  // Grouped items (itemN.) carry a custom label that iOS and Android both show.
  let item = 0;
  const labelled = (prop, value, label) => {
    item += 1;
    lines.push(`item${item}.${prop}:${escapeText(value)}`, `item${item}.X-ABLabel:${escapeText(label)}`);
  };
  if (c.whatsapp && card.vcard?.includeWhatsapp && c.whatsapp !== c.phone) labelled("TEL;TYPE=CELL", c.whatsapp, labels.whatsapp);
  if (c.website) lines.push(`URL;TYPE=WORK:${escapeText(c.website)}`);
  // LinkedIn as a labelled URL, not X-SOCIALPROFILE: Android drops that field and iOS showed
  // the profile twice when both were present.
  if (c.linkedin) labelled("URL", c.linkedin, labels.linkedin);
  if (c.booking) labelled("URL", c.booking, labels.booking);
  if (card.canonical) labelled("URL", card.canonical, labels.card);

  if (photo?.base64) lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type === "PNG" ? "PNG" : "JPEG"}:${photo.base64}`);
  if (event?.note) lines.push(`NOTE:${escapeText(event.note)}`);
  lines.push(`REV:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")}`, "END:VCARD");

  return lines.map(fold).join("\r\n") + "\r\n";
}

// ASCII file name from the person's name: "José Núñez" -> "Jose-Nunez.vcf".
export function vcardFilename(card) {
  const base = String(card.name || "contact")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "contact"}.vcf`;
}
