// Swap contacts: the form a visitor fills in to leave their own details.
// Required: a name plus an email or a phone. Spam guards: a hidden field people never fill
// (bots do), a minimum time with the sheet open and, in the Worker, a cap on sends per hour.
// A caught bot gets the same "ok" as a person, so it learns nothing.

export const SWAP_MIN_MS = 2500;
export const SWAP_MAX_PER_HOUR = 30;
export const SWAP_MAX_BYTES = 4096;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d][\d\s().+-]{4,39}$/;

// Returns { spam: true }, { error: "name" | "email" | "phone" | "reach" } or { lead }.
export function parseLead(data) {
  const text = (key, max) =>
    String(data?.[key] ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .trim()
      .slice(0, max);
  if (text("website", 200) || !(Number(data?.ms) >= SWAP_MIN_MS)) return { spam: true };

  const lead = {
    name: text("name", 100),
    email: text("email", 254).toLowerCase(),
    phone: text("phone", 40),
    company: text("company", 100),
    role: text("role", 100),
  };
  if (!lead.name) return { error: "name" };
  if (lead.email && !EMAIL.test(lead.email)) return { error: "email" };
  if (lead.phone && !PHONE.test(lead.phone)) return { error: "phone" };
  if (!lead.email && !lead.phone) return { error: "reach" };
  return { lead };
}
