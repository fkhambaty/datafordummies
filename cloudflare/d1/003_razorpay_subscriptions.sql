-- Razorpay subscriptions, payment revenue, and webhook idempotency.
ALTER TABLE profiles ADD COLUMN subscription_cancel_at_cycle_end INTEGER NOT NULL DEFAULT 0;

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
