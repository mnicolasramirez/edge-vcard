-- Swap contacts (README, Swap contacts): one row per form sent from the card.
-- Only what the visitor typed, plus the event and country. No IP, no user agent.
-- Rows older than 12 months are deleted by the Worker.
CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,  -- UTC, YYYY-MM-DD HH:MM:SS
  event      TEXT,           -- event code from the card, or NULL
  via        TEXT,           -- code | window, as in hits
  src        TEXT,           -- ?s= source tag
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  role       TEXT,
  country    TEXT
);
CREATE INDEX IF NOT EXISTS leads_created ON leads (created_at);
