-- Applied to the live database on 12 Oct 2026. schema.sql already contains these for a fresh database.
ALTER TABLE profiles ADD COLUMN username TEXT;
ALTER TABLE profiles ADD COLUMN email_verified_at TEXT;

CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (email, purpose)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
