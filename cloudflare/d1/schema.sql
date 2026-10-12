-- Data For Dummies fresh database on Cloudflare D1.
-- Database name: datafordummies
-- Database id: 0834a345-4330-4c77-8515-18efede4b5a3
-- Course pages are files in this repo. These tables hold new accounts only.

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  full_name TEXT,
  phone TEXT,
  country_code TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  subscription_status TEXT NOT NULL DEFAULT 'free',
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  subscription_end_date TEXT,
  razorpay_subscription_id TEXT,
  subscription_cancel_at_cycle_end INTEGER NOT NULL DEFAULT 0,
  username TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  last_lesson_id TEXT,
  last_lesson_label TEXT,
  completed_lesson_ids TEXT NOT NULL DEFAULT '[]',
  progress_pct INTEGER NOT NULL DEFAULT 0,
  last_visited_at TEXT,
  updated_at TEXT,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_size TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT NOT NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL DEFAULT '{}',
  page_path TEXT,
  ip_address TEXT,
  country TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS site_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_address TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  total_visits INTEGER NOT NULL DEFAULT 1,
  total_page_views INTEGER NOT NULL DEFAULT 1,
  is_registered INTEGER NOT NULL DEFAULT 0,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views (created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views (page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views (visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON site_visitors (last_seen);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

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

CREATE TABLE IF NOT EXISTS razorpay_subscriptions (
  razorpay_subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  short_url TEXT,
  current_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_razorpay_subscriptions_user
  ON razorpay_subscriptions (user_id, plan, created_at);

CREATE TABLE IF NOT EXISTS razorpay_payments (
  razorpay_payment_id TEXT PRIMARY KEY,
  razorpay_subscription_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  paid_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_razorpay_payments_user
  ON razorpay_payments (user_id, paid_at);

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
