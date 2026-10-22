import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVcard, escapeText, fold, vcardFilename } from "../src/vcard.js";
import { exampleCard, unfold } from "./helpers.js";

const octets = (s) => new TextEncoder().encode(s).length;
const NOW = new Date("2027-03-10T12:00:00Z");

test("escapes backslash, comma, semicolon and newlines", () => {
  assert.equal(escapeText("a\\b"), "a\\\\b");
  assert.equal(escapeText("Smith, Jones; Co"), "Smith\\, Jones\\; Co");
  assert.equal(escapeText("line one\nline two\r\nthree"), "line one\\nline two\\nthree");
});

test("escaped values end up in the card", () => {
  const card = { ...exampleCard(), company: "Rivera, Lee; Partners", title: "Ops\nLead" };
  const text = unfold(buildVcard(card, { now: NOW }));
  assert.ok(text.includes("\r\nORG:Rivera\\, Lee\\; Partners\r\n"));
  assert.match(text, /\r\nTITLE:Ops\\nLead\r\n/);
});

test("short lines are not folded", () => {
  assert.equal(fold("FN:Riley Morgan"), "FN:Riley Morgan");
  const line = "X".repeat(75);
  assert.equal(fold(line), line);
});

test("long lines fold at 75 octets and unfold to the original", () => {
  const line = "NOTE:" + "abcdefghij".repeat(30);
  const folded = fold(line);
  for (const part of folded.split("\r\n")) assert.ok(octets(part) <= 75, `${octets(part)} octets`);
  assert.ok(folded.split("\r\n").slice(1).every((p) => p.startsWith(" ")));
  assert.equal(unfold(folded), line);
});

test("folding never splits a multi-byte character", () => {
  const line = "NOTE:" + "é漢😀".repeat(40);
  const folded = fold(line);
  for (const part of folded.split("\r\n")) {
    assert.ok(octets(part) <= 75);
    // A split UTF-8 sequence would come back as U+FFFD.
    assert.ok(!new TextDecoder().decode(new TextEncoder().encode(part)).includes("�"));
  }
  assert.equal(unfold(folded), line);
});

test("embeds the photo as base64, folded", () => {
  const base64 = Buffer.from("x".repeat(3000)).toString("base64");
  const text = buildVcard(exampleCard(), { photo: { base64, type: "JPEG" }, now: NOW });
  for (const line of text.split("\r\n")) assert.ok(octets(line) <= 75);
  assert.match(unfold(text), new RegExp(`\\r\\nPHOTO;ENCODING=b;TYPE=JPEG:${base64}\\r\\n`));
  const png = buildVcard(exampleCard(), { photo: { base64, type: "PNG" }, now: NOW });
  assert.match(unfold(png), /PHOTO;ENCODING=b;TYPE=PNG:/);
});

test("no photo line without a photo", () => {
  assert.doesNotMatch(buildVcard(exampleCard(), { now: NOW }), /PHOTO/);
});

test("structure: CRLF, version 3.0, labelled URLs, event note", () => {
  const card = exampleCard();
  const text = buildVcard(card, { event: card.events.summit, now: NOW });
  assert.ok(text.startsWith("BEGIN:VCARD\r\nVERSION:3.0\r\n"));
  assert.ok(text.endsWith("END:VCARD\r\n"));
  assert.doesNotMatch(text.replace(/\r\n/g, ""), /\n/);
  const flat = unfold(text);
  assert.match(flat, /N:Morgan;Riley;;;/);
  assert.match(flat, /TEL;TYPE=CELL,VOICE,PREF:\+12025550143/);
  assert.match(flat, /item\d\.URL:https:\/\/example\.com\/linkedin\r\nitem\d\.X-ABLabel:LinkedIn/);
  assert.match(flat, /NOTE:Met at Example Summit 2027\\, Lisbon \(Mar 2027\)\./);
  assert.match(flat, /REV:20270310T120000Z/);
  assert.doesNotMatch(unfold(buildVcard(card, { now: NOW })), /NOTE/);
});

test("missing contact fields are left out", () => {
  const card = { ...exampleCard(), contact: { email: "riley@example.com" } };
  const text = buildVcard(card, { now: NOW });
  assert.doesNotMatch(text, /TEL|LinkedIn|Book a meeting/);
  assert.match(text, /EMAIL;TYPE=INTERNET,WORK:riley@example\.com/);
});

test("WhatsApp number only when asked for and different from the phone", () => {
  const card = { ...exampleCard(), contact: { phone: "+12025550143", whatsapp: "+12025550199" } };
  assert.doesNotMatch(buildVcard(card, { now: NOW }), /WhatsApp/);
  const on = { ...card, vcard: { includeWhatsapp: true } };
  assert.match(unfold(buildVcard(on, { now: NOW })), /item1\.TEL;TYPE=CELL:\+12025550199\r\nitem1\.X-ABLabel:WhatsApp/);
});

test("file name is plain ASCII", () => {
  assert.equal(vcardFilename({ name: "José Núñez-Ávila" }), "Jose-Nunez-Avila.vcf");
  assert.equal(vcardFilename({ name: "李" }), "contact.vcf");
});
