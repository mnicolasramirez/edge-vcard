// Events: a code in the link (?e=<code>) or a date window adds a note to the saved contact and
// pre-fills the Text, WhatsApp and Email buttons. Codes come only from the card data, so the
// query string never reaches the vCard or the page as text.

// Today's date as YYYY-MM-DD in the given time zone.
export function dayIn(timeZone = "UTC", now = new Date()) {
  try {
    return now.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return now.toLocaleDateString("en-CA", { timeZone: "UTC" });
  }
}

// Open between "from" and "until", both inclusive, in the event's time zone. Either end may be
// left out. Outside the window a code is ignored and the link behaves like the plain card:
// printed QR codes keep working, the note just stops.
export function isOpen(event, now = new Date()) {
  const today = dayIn(event.timeZone || "UTC", now);
  if (event.from && today < event.from) return false;
  if (event.until && today > event.until) return false;
  return true;
}

// The event for a visit, or null. An explicit, open ?e= code wins. Otherwise an event with
// "default": true applies inside its window to the plain card (no code, or an unknown or
// expired one). "via" says which: "code" or "window".
export function eventFor(card, code, now = new Date()) {
  const events = card.events || {};
  if (code && Object.hasOwn(events, code) && isOpen(events[code], now)) {
    return { ...events[code], code, via: "code" };
  }
  for (const [key, event] of Object.entries(events)) {
    if (event.default && isOpen(event, now)) return { ...event, code: key, via: "window" };
  }
  return null;
}

// An open event named by a beacon or the swap form (no default-window fallback: those requests
// carry the code and via the page was shown with).
export function namedEvent(card, code, via, now = new Date()) {
  const events = card.events || {};
  if (typeof code !== "string" || !Object.hasOwn(events, code) || !isOpen(events[code], now)) return null;
  return { ...events[code], code, via: via === "window" ? "window" : "code" };
}
