-- Measurement: one row per card view, contact save and button tap (README, Measurement).
-- No cookies, no IP, no user agent. Rows older than 13 months are deleted by the Worker.
CREATE TABLE IF NOT EXISTS hits (
  id      INTEGER PRIMARY KEY,
  day     TEXT NOT NULL,  -- YYYY-MM-DD, in the event's time zone when an event applies, else UTC
  kind    TEXT NOT NULL,  -- view | save | tap | preview (link-preview bots and scripts)
  target  TEXT,           -- tap: the button (slug of its label, or share, qr, flip, photo, swap); preview: view | save
  event   TEXT,           -- event code from the card, or NULL
  via     TEXT,           -- code (?e= in the link) | window (plain card inside a default event's dates)
  src     TEXT,           -- ?s= source tag (nfc, sig…), 'other' if malformed
  country TEXT,           -- two-letter country from Cloudflare
  device  TEXT,           -- phone | desktop
  inapp   TEXT            -- in-app browser: linkedin, instagram, facebook, x, tiktok, google, line, wechat; NULL = normal browser
);
CREATE INDEX IF NOT EXISTS hits_day ON hits (day);
CREATE INDEX IF NOT EXISTS hits_event ON hits (event, kind);
