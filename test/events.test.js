import { test } from "node:test";
import assert from "node:assert/strict";
import { dayIn, isOpen, eventFor, namedEvent } from "../src/events.js";

const event = { note: "Met at the summit.", from: "2027-03-08", until: "2027-03-21", timeZone: "America/New_York" };
const at = (iso) => new Date(iso);

test("window is inclusive on both ends, in the event's time zone", () => {
  // 8 Mar 00:30 in New York is 05:30 UTC.
  assert.equal(isOpen(event, at("2027-03-08T05:30:00Z")), true);
  // 8 Mar 03:00 UTC is still 7 Mar in New York.
  assert.equal(isOpen(event, at("2027-03-08T03:00:00Z")), false);
  // 21 Mar 23:30 in New York (EDT) is 22 Mar 03:30 UTC: still open.
  assert.equal(isOpen(event, at("2027-03-22T03:30:00Z")), true);
  assert.equal(isOpen(event, at("2027-03-22T05:00:00Z")), false);
});

test("open-ended windows and a missing time zone (UTC)", () => {
  assert.equal(isOpen({ from: "2027-01-01" }, at("2030-01-01T00:00:00Z")), true);
  assert.equal(isOpen({ until: "2027-01-01" }, at("2026-01-01T00:00:00Z")), true);
  assert.equal(isOpen({}, at("2026-01-01T00:00:00Z")), true);
  assert.equal(isOpen({ from: "2027-03-08" }, at("2027-03-07T23:59:59Z")), false);
});

test("an invalid time zone falls back to UTC", () => {
  assert.equal(dayIn("Not/AZone", at("2027-03-08T01:00:00Z")), "2027-03-08");
});

test("an explicit open code wins and says via code", () => {
  const card = { events: { summit: event, fair: { ...event, default: true } } };
  const e = eventFor(card, "summit", at("2027-03-10T12:00:00Z"));
  assert.equal(e.code, "summit");
  assert.equal(e.via, "code");
});

test("a default event applies to the plain card inside its window", () => {
  const card = { events: { fair: { ...event, default: true } } };
  const now = at("2027-03-10T12:00:00Z");
  assert.deepEqual([eventFor(card, null, now).code, eventFor(card, null, now).via], ["fair", "window"]);
  // An unknown or expired code falls back to the default event.
  assert.equal(eventFor(card, "nope", now).via, "window");
  assert.equal(eventFor(card, null, at("2027-04-01T12:00:00Z")), null);
});

test("unknown, expired and prototype codes are ignored", () => {
  const card = { events: { summit: event } };
  const now = at("2027-03-10T12:00:00Z");
  assert.equal(eventFor(card, "nope", now), null);
  assert.equal(eventFor(card, "__proto__", now), null);
  assert.equal(eventFor(card, "constructor", now), null);
  assert.equal(eventFor(card, "summit", at("2027-05-01T12:00:00Z")), null);
  assert.equal(eventFor({}, "summit", now), null);
});

test("namedEvent keeps the via the page was shown with", () => {
  const card = { events: { summit: event } };
  const now = at("2027-03-10T12:00:00Z");
  assert.equal(namedEvent(card, "summit", "window", now).via, "window");
  assert.equal(namedEvent(card, "summit", "anything", now).via, "code");
  assert.equal(namedEvent(card, "summit", "code", at("2027-06-01T00:00:00Z")), null);
  assert.equal(namedEvent(card, 42, "code", now), null);
});
