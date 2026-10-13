-- Saved lessons and completion requests. A request is not an issued certificate.
CREATE TABLE IF NOT EXISTS lesson_completions (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS certificate_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  evidence_json TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  issued_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificate_requests_user_course
  ON certificate_requests (user_id, course_id);
