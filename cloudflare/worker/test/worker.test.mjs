import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { COURSE_CATALOG } from "../src/course-catalog.js";

const schema = readFileSync(new URL("../../d1/schema.sql", import.meta.url), "utf8");
const origin = "http://127.0.0.1:8877";

function wrap(sqlite) {
  return {
    prepare(sql) {
      return {
        bind(...params) {
          const statement = sqlite.prepare(sql);
          return {
            sql,
            params,
            async first() {
              const row = statement.get(...params);
              return row ?? null;
            },
            async all() {
              return { results: statement.all(...params) };
            },
            async run() {
              statement.run(...params);
              return { success: true };
            },
          };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        for (const statement of statements) {
          sqlite.prepare(statement.sql).run(...statement.params);
        }
        sqlite.exec("COMMIT");
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

function fresh() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schema);
  return {
    sqlite,
    env: { DB: wrap(sqlite), CHECKOUT_MODE: "hosted" },
  };
}

async function call(env, path, { method = "GET", body, token } = {}) {
  const headers = { origin, "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await worker.fetch(
    new Request(`https://datafordummies-api.fkhambaty.workers.dev${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, text };
}

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function smallestCourse() {
  return Object.values(COURSE_CATALOG.courses).sort((a, b) => a.lessons.length - b.lessons.length)[0];
}

test("health reports email readiness without secrets or a new account", async () => {
  const { env, sqlite } = fresh();
  const health = await call(env, "/v1/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(typeof health.body.email_ready, "boolean");
  assert.equal(health.body.email_ready, false);
  assert.equal(health.text.includes("RESEND_API_KEY"), false);
  assert.equal(health.text.includes("KEY_SECRET"), false);
  const signup = await call(env, "/v1/signup", {
    method: "POST",
    body: { email: "not-created@example.com", password: "password12", full_name: "Not Created" },
  });
  assert.equal(signup.status, 503);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles").get().n, 0);
});

test("D1 daily quota exhaustion returns a clear retryable response", async () => {
  const env = {
    DB: {
      prepare() {
        throw new Error("D1_ERROR: Your account has exceeded D1's free tier daily row write limit.");
      },
    },
    RESEND_API_KEY: "test-key",
    MAIL_FROM: "Data For Dummies <no-reply@datafordummies.in>",
  };
  const signup = await call(env, "/v1/signup", {
    method: "POST",
    body: { email: "quota@example.com", password: "password12", full_name: "Quota Test" },
  });
  assert.equal(signup.status, 503);
  assert.match(signup.body.error, /storage allowance/i);
  assert.match(signup.body.error, /Nothing was charged/i);
});

test("signup falls back to the verified sender when the primary domain is refused", async () => {
  const { env, sqlite } = fresh();
  Object.assign(env, {
    RESEND_API_KEY: "test-key",
    MAIL_FROM: "Data For Dummies <no-reply@datafordummies.in>",
    MAIL_FROM_FALLBACK: "Data For Dummies <no-reply@funberrykids.in>",
  });
  const senders = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/domains")) {
      return Response.json({ data: [{ name: "funberrykids.in", status: "verified" }] });
    }
    const from = JSON.parse(init.body).from;
    senders.push(from);
    return new Response("{}", { status: from.includes("datafordummies.in") ? 403 : 200 });
  };
  try {
    const signup = await call(env, "/v1/signup", {
      method: "POST",
      body: { email: "new-reader@example.com", password: "password12", full_name: "New Reader" },
    });
    assert.equal(signup.status, 201);
    assert.deepEqual(senders, [env.MAIL_FROM, env.MAIL_FROM_FALLBACK]);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM email_codes").get().n, 1);
    const health = await call(env, "/v1/health");
    assert.equal(health.body.email_sender, "fallback");
    assert.equal(health.body.email_domain_verified, false);
  } finally {
    globalThis.fetch = original;
  }
});

test("dummy login does not create a payment", async () => {
  const { env, sqlite } = fresh();
  const salt = "0123456789abcdef0123456789abcdef";
  const passwordHash = await hashPassword("dummy", salt);
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role, subscription_status)
     VALUES ('dummy-test-account', 'dummy@example.com', 'dummy', ?, ?, '2026-10-13T00:00:00Z', 'student', 'pro')`,
  ).run(passwordHash, salt);
  let remoteCalls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    remoteCalls += 1;
    return new Response("{}", { status: 500 });
  };
  try {
    const login = await call(env, "/v1/login", { method: "POST", body: { email: "dummy", password: "dummy" } });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.username, "dummy");
    const payment = await call(env, "/v1/payments/razorpay/subscriptions", {
      method: "POST",
      token: login.body.token,
      body: { plan: "weekly" },
    });
    assert.equal(payment.status, 403);
    assert.equal(payment.body.demo, true);
    assert.equal(remoteCalls, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM razorpay_subscriptions").get().n, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("completion and certificate requests follow saved catalog lessons only", async () => {
  const course = smallestCourse();
  const { env, sqlite } = fresh();
  const salt = "abcdef0123456789abcdef0123456789";
  const passwordHash = await hashPassword("password12", salt);
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role)
     VALUES ('learner-1', 'learner@example.com', 'learner', ?, ?, '2026-10-13T00:00:00Z', 'student')`,
  ).run(passwordHash, salt);
  const login = await call(env, "/v1/login", {
    method: "POST",
    body: { email: "learner@example.com", password: "password12" },
  });
  assert.equal(login.status, 200);
  const token = login.body.token;

  const unknown = await call(env, "/v1/progress/complete", {
    method: "POST",
    token,
    body: { course_id: course.id, lesson_id: "not-a-real-lesson" },
  });
  assert.equal(unknown.status, 400);

  const forged = await call(env, "/v1/progress", {
    method: "PUT",
    token,
    body: {
      course_id: course.id,
      completed_lesson_ids: course.lessons.map((lesson) => lesson.id),
      progress_pct: 100,
    },
  });
  assert.equal(forged.status, 200);
  assert.deepEqual(forged.body.completed_lesson_ids, []);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM lesson_completions").get().n, 0);
  const early = await call(env, "/v1/certificates", { method: "POST", token, body: { course_id: course.id } });
  assert.equal(early.status, 409);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM certificate_requests").get().n, 0);

  for (const lesson of course.lessons) {
    const saved = await call(env, "/v1/progress/complete", {
      method: "POST",
      token,
      body: { course_id: course.id, lesson_id: lesson.id },
    });
    assert.equal(saved.status, 200);
  }
  const progress = await call(env, `/v1/progress?course_id=${encodeURIComponent(course.id)}`, { token });
  assert.equal(progress.body.progress[0].progress_pct, 100);
  assert.equal(progress.body.progress[0].completed_lesson_ids.length, course.lessons.length);

  const created = await call(env, "/v1/certificates", { method: "POST", token, body: { course_id: course.id } });
  assert.equal(created.status, 201);
  assert.equal(created.body.certificate.status, "requested");
  assert.equal(created.body.certificate.issued_at, null);
  assert.equal(created.body.certificate.evidence.length, course.lessons.length);

  const again = await call(env, "/v1/certificates", { method: "POST", token, body: { course_id: course.id } });
  assert.equal(again.status, 200);
  assert.equal(again.body.certificate.status, "requested");
  assert.equal(again.body.certificate.issued_at, null);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM certificate_requests").get().n, 1);

  const listed = await call(env, "/v1/certificates", { token });
  assert.equal(listed.body.certificates.length, 1);
  assert.equal(listed.body.certificates[0].issued_at, null);

  const firstLessons = sqlite.prepare(
    "SELECT COUNT(*) AS n FROM analytics_events WHERE event_type = 'first_lesson'",
  ).get().n;
  assert.equal(Number(firstLessons), 1);
});

test("page views record course and pro steps without storing an email", async () => {
  const { env, sqlite } = fresh();
  const course = await call(env, "/v1/page-view", {
    method: "POST",
    body: { visitor_id: "visitor-1", page_path: "/snowflake_course/hub.html" },
  });
  const pricing = await call(env, "/v1/page-view", {
    method: "POST",
    body: { visitor_id: "visitor-1", page_path: "/pricing.html" },
  });
  assert.equal(course.status, 201);
  assert.equal(pricing.status, 201);
  const rows = sqlite.prepare(
    "SELECT event_type, event_data FROM analytics_events ORDER BY event_type",
  ).all();
  assert.deepEqual(rows.map((row) => row.event_type), ["course_view", "pro_page"]);
  assert.equal(JSON.stringify(rows).includes("@"), false);
});

test("account deletion requires the password and the confirmation phrase, then removes that account only", async () => {
  const { env, sqlite } = fresh();
  const salt = "abcdef0123456789abcdef0123456789";
  const passwordHash = await hashPassword("password12", salt);
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role, razorpay_subscription_id, subscription_status)
     VALUES ('learner-1', 'learner@example.com', 'learner', ?, ?, '2026-10-13T00:00:00Z', 'student', NULL, 'free')`,
  ).run(passwordHash, salt);
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role)
     VALUES ('learner-2', 'other@example.com', 'other', ?, ?, '2026-10-13T00:00:00Z', 'student')`,
  ).run(passwordHash, salt);
  const login = await call(env, "/v1/login", {
    method: "POST",
    body: { email: "learner@example.com", password: "password12" },
  });
  assert.equal(login.status, 200);
  const token = login.body.token;
  sqlite.prepare(
    "INSERT INTO user_progress (user_id, course_id, completed_lesson_ids, progress_pct) VALUES ('learner-1', 'snowflake', '[]', 0)",
  ).run();
  sqlite.prepare(
    "INSERT INTO lesson_completions (user_id, course_id, lesson_id, completed_at) VALUES ('learner-1', 'snowflake', 'meet-snowflake', '2026-10-14T00:00:00Z')",
  ).run();
  sqlite.prepare(
    `INSERT INTO certificate_requests (id, user_id, course_id, status, evidence_json, requested_at)
     VALUES ('cert-1', 'learner-1', 'snowflake', 'requested', '[]', '2026-10-14T00:00:00Z')`,
  ).run();
  sqlite.prepare(
    `INSERT INTO email_codes (email, purpose, code_hash, expires_at, attempts, created_at)
     VALUES ('learner@example.com', 'reset', 'hash', '2026-10-14T00:15:00Z', 0, '2026-10-14T00:00:00Z')`,
  ).run();
  sqlite.prepare(
    `INSERT INTO razorpay_subscriptions
     (razorpay_subscription_id, user_id, plan, status, created_at, updated_at)
     VALUES ('sub_old', 'learner-1', 'monthly', 'cancelled', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')`,
  ).run();
  sqlite.prepare(
    `INSERT INTO razorpay_payments
     (razorpay_payment_id, razorpay_subscription_id, user_id, amount, currency, status, paid_at)
     VALUES ('pay_old', 'sub_old', 'learner-1', 1000, 'INR', 'captured', '2026-10-01T00:00:00Z')`,
  ).run();
  sqlite.prepare(
    "INSERT INTO razorpay_webhook_events (event_id, event_type) VALUES ('evt_1', 'subscription.charged')",
  ).run();
  sqlite.prepare(
    "INSERT INTO page_views (visitor_id, page_path, user_id) VALUES ('visitor-1', '/index.html', 'learner-1'), ('visitor-2', '/index.html', 'learner-2')",
  ).run();
  sqlite.prepare(
    "INSERT INTO analytics_events (visitor_id, event_type, user_id) VALUES ('visitor-1', 'signup', 'learner-1')",
  ).run();
  sqlite.prepare(
    "INSERT INTO site_visitors (visitor_id, is_registered, user_id) VALUES ('visitor-1', 1, 'learner-1')",
  ).run();

  const missing = await call(env, "/v1/account", { method: "DELETE", body: { password: "password12", confirmation: "DELETE" } });
  assert.equal(missing.status, 401);
  const phrase = await call(env, "/v1/account", {
    method: "DELETE",
    token,
    body: { password: "password12", confirmation: "delete" },
  });
  assert.equal(phrase.status, 400);
  const wrong = await call(env, "/v1/account", {
    method: "DELETE",
    token,
    body: { password: "not-the-password", confirmation: "DELETE" },
  });
  assert.equal(wrong.status, 401);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles WHERE id = 'learner-1'").get().n, 1);

  const deleted = await call(env, "/v1/account", {
    method: "DELETE",
    token,
    body: { password: "password12", confirmation: "DELETE" },
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.ok, true);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles WHERE id = 'learner-1'").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles WHERE id = 'learner-2'").get().n, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'learner-1'").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM user_progress").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM lesson_completions").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM certificate_requests").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM email_codes").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM razorpay_subscriptions").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM razorpay_payments").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM razorpay_webhook_events").get().n, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM page_views WHERE user_id = 'learner-1'").get().n, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM page_views WHERE user_id = 'learner-2'").get().n, 1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM analytics_events").get().n, 0);
  const visitor = sqlite.prepare("SELECT user_id, is_registered FROM site_visitors WHERE visitor_id = 'visitor-1'").get();
  assert.equal(visitor.user_id, null);
  assert.equal(visitor.is_registered, 0);
  const session = await call(env, "/v1/session", { token });
  assert.equal(session.status, 200);
  assert.equal(session.body.user, null);
});

test("the demo account cannot be deleted", async () => {
  const { env, sqlite } = fresh();
  const salt = "0123456789abcdef0123456789abcdef";
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role)
     VALUES ('dummy-test-account', 'dummy@example.com', 'dummy', ?, ?, '2026-10-13T00:00:00Z', 'student')`,
  ).run(await hashPassword("dummy", salt), salt);
  const login = await call(env, "/v1/login", { method: "POST", body: { email: "dummy", password: "dummy" } });
  const deleted = await call(env, "/v1/account", {
    method: "DELETE",
    token: login.body.token,
    body: { password: "dummy", confirmation: "DELETE" },
  });
  assert.equal(deleted.status, 403);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles").get().n, 1);
});

test("an active subscription is cancelled before the account is deleted, or the account stays", async () => {
  const { env, sqlite } = fresh();
  env.RAZORPAY_KEY_ID = "rzp_test_example";
  env.RAZORPAY_KEY_SECRET = "test-secret";
  const salt = "fedcba9876543210fedcba9876543210";
  sqlite.prepare(
    `INSERT INTO profiles
     (id, email, username, password_hash, password_salt, email_verified_at, role, subscription_status, razorpay_subscription_id)
     VALUES ('learner-1', 'learner@example.com', 'learner', ?, ?, '2026-10-13T00:00:00Z', 'student', 'active', 'sub_live')`,
  ).run(await hashPassword("password12", salt), salt);
  const login = await call(env, "/v1/login", {
    method: "POST",
    body: { email: "learner@example.com", password: "password12" },
  });
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return new Response("{}", { status: 500 });
  };
  try {
    const refused = await call(env, "/v1/account", {
      method: "DELETE",
      token: login.body.token,
      body: { password: "password12", confirmation: "DELETE" },
    });
    assert.equal(refused.status, 502);
    assert.match(refused.body.error, /not deleted/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles").get().n, 1);
    assert.equal(calls.some((url) => url.endsWith("/subscriptions/sub_live/cancel")), true);

    globalThis.fetch = async (url, init) => {
      calls.push(`${init?.method || "GET"} ${url}`);
      return Response.json({ id: "sub_live", status: "cancelled" });
    };
    const deleted = await call(env, "/v1/account", {
      method: "DELETE",
      token: login.body.token,
      body: { password: "password12", confirmation: "DELETE" },
    });
    assert.equal(deleted.status, 200);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM profiles").get().n, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
  } finally {
    globalThis.fetch = original;
  }
});
