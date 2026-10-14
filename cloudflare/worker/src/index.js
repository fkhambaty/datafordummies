import { COURSE_CATALOG } from "./course-catalog.js";

const ALLOWED_ORIGINS = new Set([
  "https://datafordummies.in",
  "https://www.datafordummies.in",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

const OWNER_EMAILS = new Set([
  "fakhruddinkhambaty@gmail.com",
  "fktiindia@gmail.com",
]);

const RAZORPAY_API = "https://api.razorpay.com/v1";
const PAID_SUBSCRIPTION_STATUSES = new Set(["active", "authenticated"]);
const TERMINAL_SUBSCRIPTION_STATUSES = new Set(["cancelled", "halted", "completed", "expired"]);

function json(body, status, origin) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "authorization, content-type";
    headers["access-control-allow-methods"] = "GET, POST, PUT, OPTIONS";
    headers.vary = "Origin";
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function bytesToHex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.full_name,
    phone: row.phone,
    country_code: row.country_code,
    role: row.role,
    subscription_status: row.subscription_status,
    subscription_plan: row.subscription_plan,
    subscription_end_date: row.subscription_end_date,
    razorpay_subscription_id: row.razorpay_subscription_id,
    subscription_cancel_at_cycle_end: Boolean(row.subscription_cancel_at_cycle_end),
    updated_at: row.updated_at,
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const CODE_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;
const RESEND_GAP_MS = 60 * 1000;

function newCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(value).padStart(6, "0");
}

async function sendFrom(env, from, to, subject, text) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, reply_to: env.MAIL_REPLY_TO || undefined }),
  });
  if (!response.ok) console.log(`resend ${response.status} from ${senderDomain(from)}`);
  return response.ok;
}

// MAIL_FROM_FALLBACK must be on a Resend-verified domain; it is used only when MAIL_FROM is refused.
async function sendEmail(env, to, subject, text) {
  if (await sendFrom(env, env.MAIL_FROM, to, subject, text)) return true;
  if (!env.MAIL_FROM_FALLBACK || env.MAIL_FROM_FALLBACK === env.MAIL_FROM) return false;
  return sendFrom(env, env.MAIL_FROM_FALLBACK, to, subject, text);
}

function senderDomain(from) {
  const match = String(from || "").match(/@([^>\s]+)/);
  return match ? match[1].toLowerCase() : "";
}

async function senderStatus(env) {
  if (!emailReady(env)) return { email_domain_verified: false, email_sender: "none" };
  const response = await fetch("https://api.resend.com/domains", {
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
  }).catch(() => null);
  if (!response || !response.ok) return { email_domain_verified: null, email_sender: "unknown" };
  const verified = new Set(
    ((await response.json()).data || []).filter((d) => d.status === "verified").map((d) => d.name),
  );
  if (verified.has(senderDomain(env.MAIL_FROM))) return { email_domain_verified: true, email_sender: "primary" };
  if (verified.has(senderDomain(env.MAIL_FROM_FALLBACK))) {
    return { email_domain_verified: false, email_sender: "fallback" };
  }
  return { email_domain_verified: false, email_sender: "none" };
}

async function issueCode(db, env, email, purpose) {
  const recent = await db
    .prepare("SELECT created_at FROM email_codes WHERE email = ? AND purpose = ?")
    .bind(email, purpose)
    .first();
  if (recent && Date.now() - Date.parse(recent.created_at) < RESEND_GAP_MS) return true;
  const code = newCode();
  const now = new Date();
  const expires = new Date(now.getTime() + CODE_MINUTES * 60 * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO email_codes (email, purpose, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(email, purpose) DO UPDATE SET
         code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         attempts = 0, created_at = excluded.created_at`,
    )
    .bind(email, purpose, await sha256(`${email}:${purpose}:${code}`), expires, now.toISOString())
    .run();
  const subject =
    purpose === "verify" ? "Your Data For Dummies confirmation code" : "Your Data For Dummies password reset code";
  const line =
    purpose === "verify"
      ? "Enter this code to confirm your email"
      : "Enter this code to choose a new password";
  return sendEmail(
    env,
    email,
    subject,
    `${line}: ${code}\n\nIt expires in ${CODE_MINUTES} minutes. If you did not ask for this, ignore this email.\n\nData For Dummies\nhttps://datafordummies.in`,
  );
}

async function checkCode(db, email, purpose, code) {
  const row = await db
    .prepare("SELECT * FROM email_codes WHERE email = ? AND purpose = ?")
    .bind(email, purpose)
    .first();
  if (!row) return false;
  if (row.attempts >= MAX_CODE_ATTEMPTS || Date.parse(row.expires_at) < Date.now()) {
    await db.prepare("DELETE FROM email_codes WHERE email = ? AND purpose = ?").bind(email, purpose).run();
    return false;
  }
  const matches = row.code_hash === (await sha256(`${email}:${purpose}:${String(code).trim()}`));
  if (!matches) {
    await db
      .prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE email = ? AND purpose = ?")
      .bind(email, purpose)
      .run();
    return false;
  }
  await db.prepare("DELETE FROM email_codes WHERE email = ? AND purpose = ?").bind(email, purpose).run();
  return true;
}

function emailReady(env) {
  return Boolean(env.RESEND_API_KEY && env.MAIL_FROM);
}

function d1DailyLimitReached(error) {
  return /exceeded D1's free tier daily row (?:write|read) limit/i.test(String(error?.message || ""));
}

async function createSession(db, userId) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, expires)
    .run();
  return token;
}

async function userFromRequest(request, db) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  return db
    .prepare(
      `SELECT profiles.* FROM sessions
       JOIN profiles ON profiles.id = sessions.user_id
       WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .bind(tokenHash, now)
    .first();
}

function isDummyProfile(profile) {
  return profile?.id === "dummy-test-account" || profile?.username === "dummy";
}

function isActiveProfile(profile) {
  if (!profile || !["active", "pro"].includes(profile.subscription_status)) return false;
  return !profile.subscription_end_date || Date.parse(profile.subscription_end_date) > Date.now();
}

function planDetails(env, plan) {
  if (plan === "weekly") {
    return { plan: "weekly", planId: env.RAZORPAY_PLAN_WEEKLY, totalCount: 52 };
  }
  if (plan === "monthly") {
    return { plan: "monthly", planId: env.RAZORPAY_PLAN_MONTHLY, totalCount: 12 };
  }
  return null;
}

function planFromSubscription(env, subscription) {
  if (subscription?.plan_id === env.RAZORPAY_PLAN_MONTHLY) return "monthly";
  if (subscription?.plan_id === env.RAZORPAY_PLAN_WEEKLY) return "weekly";
  return null;
}

function dateFromUnix(seconds) {
  return Number(seconds) > 0 ? new Date(Number(seconds) * 1000).toISOString() : null;
}

async function razorpayRequest(env, path, options = {}) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay is not configured.");
  }
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...options,
    headers: {
      authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.description || data?.error || `Razorpay returned ${response.status}.`;
    throw new Error(String(message));
  }
  return data;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

function hexToBytes(value) {
  if (!/^[a-f0-9]{64}$/i.test(value || "")) return null;
  return new Uint8Array(value.match(/.{2}/g).map((byte) => parseInt(byte, 16)));
}

async function verifyHmac(message, signature, secret) {
  const bytes = hexToBytes(signature);
  if (!bytes || !secret) return false;
  return crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    bytes,
    new TextEncoder().encode(message),
  );
}

async function saveSubscription(db, subscription, userId, plan) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO razorpay_subscriptions
       (razorpay_subscription_id, user_id, plan, status, short_url, current_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(razorpay_subscription_id) DO UPDATE SET
         status = excluded.status, short_url = COALESCE(excluded.short_url, razorpay_subscriptions.short_url),
         current_end = excluded.current_end, updated_at = excluded.updated_at`,
    )
    .bind(
      subscription.id,
      userId,
      plan,
      subscription.status || "created",
      subscription.short_url || null,
      dateFromUnix(subscription.current_end),
      now,
      now,
    )
    .run();
}

async function applySubscription(db, env, profile, subscription) {
  const userId = subscription?.notes?.user_id;
  const plan = planFromSubscription(env, subscription);
  if (
    !userId ||
    userId !== profile.id ||
    subscription?.notes?.product !== "datafordummies" ||
    !plan
  ) return false;

  await saveSubscription(db, subscription, profile.id, plan);
  const now = new Date().toISOString();
  if (PAID_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    await db
      .prepare(
        `UPDATE profiles SET subscription_status = 'active', subscription_plan = ?,
         subscription_end_date = ?, razorpay_subscription_id = ?,
         subscription_cancel_at_cycle_end = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(
        plan,
        dateFromUnix(subscription.current_end),
        subscription.id,
        subscription.cancel_at_cycle_end ? 1 : 0,
        now,
        profile.id,
      )
      .run();
    await recordActiveSubscription(db, profile, subscription);
    return true;
  }
  if (TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    await db
      .prepare(
        `UPDATE profiles SET subscription_status = 'free', subscription_plan = 'free',
         subscription_end_date = NULL, subscription_cancel_at_cycle_end = 0, updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, profile.id)
      .run();
  }
  return false;
}

async function syncProfileSubscription(db, env, profile) {
  if (!profile?.razorpay_subscription_id || isDummyProfile(profile)) return profile;
  const expired = profile.subscription_end_date && Date.parse(profile.subscription_end_date) <= Date.now();
  if (isActiveProfile(profile) && profile.subscription_end_date && !expired) return profile;
  try {
    const subscription = await razorpayRequest(
      env,
      `/subscriptions/${encodeURIComponent(profile.razorpay_subscription_id)}`,
    );
    await applySubscription(db, env, profile, subscription);
    return db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profile.id).first();
  } catch {
    return profile;
  }
}

const FUNNEL_EVENTS = new Set([
  "course_view",
  "signup",
  "first_lesson",
  "pro_page",
  "checkout",
  "active_subscription",
]);

function catalogCourse(courseId) {
  return COURSE_CATALOG.courses?.[courseId] || null;
}

function catalogLessonIds(courseId) {
  return (catalogCourse(courseId)?.lessons || []).map((lesson) => lesson.id);
}

function funnelEventForPath(pagePath) {
  const path = String(pagePath || "");
  if (path.includes("pricing")) return "pro_page";
  if (/_course\/(?:hub|index)\.html$/.test(path) || /_course\/?$/.test(path)) return "course_view";
  return null;
}

async function recordFunnel(db, eventType, details = {}) {
  if (!FUNNEL_EVENTS.has(eventType)) return;
  await db
    .prepare(
      `INSERT INTO analytics_events
       (visitor_id, session_id, event_type, event_data, page_path, country, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      String(details.visitorId || "server").slice(0, 80),
      null,
      eventType,
      JSON.stringify(details.eventData || {}).slice(0, 500),
      details.pagePath ? String(details.pagePath).slice(0, 300) : null,
      details.country || null,
      details.userId || null,
    )
    .run();
}

async function recordActiveSubscription(db, profile, subscription) {
  if (!subscription?.id) return;
  const existing = await db
    .prepare(
      `SELECT id FROM analytics_events
       WHERE event_type = 'active_subscription' AND user_id = ?
       AND json_extract(event_data, '$.subscription_id') = ?`,
    )
    .bind(profile.id, subscription.id)
    .first();
  if (existing) return;
  await recordFunnel(db, "active_subscription", {
    visitorId: "server",
    userId: profile.id,
    eventData: { subscription_id: subscription.id },
  });
}

async function storedCompletions(db, userId, courseId) {
  const result = await db
    .prepare(
      "SELECT lesson_id, completed_at FROM lesson_completions WHERE user_id = ? AND course_id = ? ORDER BY completed_at",
    )
    .bind(userId, courseId)
    .all();
  const allowed = new Set(catalogLessonIds(courseId));
  return (result.results || []).filter((row) => allowed.has(row.lesson_id));
}

function completionSummary(courseId, rows) {
  const required = catalogLessonIds(courseId);
  const done = new Set(rows.map((row) => row.lesson_id));
  const completed = required.filter((lessonId) => done.has(lessonId));
  const missing = required.filter((lessonId) => !done.has(lessonId));
  const progressPct = required.length ? Math.round((completed.length / required.length) * 100) : 0;
  return { required, completed, missing, progressPct };
}

async function writeProgress(db, profile, courseId, fields) {
  const rows = await storedCompletions(db, profile.id, courseId);
  const summary = completionSummary(courseId, rows);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO user_progress
       (user_id, course_id, last_lesson_id, last_lesson_label, completed_lesson_ids, progress_pct, last_visited_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, course_id) DO UPDATE SET
         last_lesson_id = COALESCE(excluded.last_lesson_id, user_progress.last_lesson_id),
         last_lesson_label = COALESCE(excluded.last_lesson_label, user_progress.last_lesson_label),
         completed_lesson_ids = excluded.completed_lesson_ids,
         progress_pct = excluded.progress_pct,
         last_visited_at = COALESCE(excluded.last_visited_at, user_progress.last_visited_at),
         updated_at = excluded.updated_at`,
    )
    .bind(
      profile.id,
      courseId,
      fields.lastLessonId || null,
      fields.lastLessonLabel || null,
      JSON.stringify(summary.completed),
      summary.progressPct,
      fields.lastVisitedAt || now,
      now,
    )
    .run();
  return summary;
}

function certificateView(row) {
  let evidence = [];
  try {
    evidence = JSON.parse(row.evidence_json || "[]");
  } catch {
    evidence = [];
  }
  const issued = Boolean(row.issued_at);
  return {
    id: row.id,
    course_id: row.course_id,
    course_title: catalogCourse(row.course_id)?.title || row.course_id,
    status: issued ? "issued" : "requested",
    requested_at: row.requested_at,
    issued_at: row.issued_at || null,
    evidence,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const allowedOrigin = isAllowedOrigin(origin) ? origin : "";
    if (request.method === "OPTIONS") {
      return json({ ok: true }, 204, allowedOrigin);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const db = env.DB;

    try {
      if (request.method === "GET" && path === "/v1/health") {
        return json(
          {
            ok: true,
            service: "datafordummies-api",
            email_ready: emailReady(env),
            ...(await senderStatus(env)),
            checkout_mode: env.CHECKOUT_MODE || "hosted",
            payments_configured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
          },
          200,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/payments/razorpay/webhook") {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature") || "";
        if (!(await verifyHmac(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET))) {
          return json({ error: "Invalid signature." }, 400, "");
        }
        const payload = JSON.parse(rawBody);
        const eventId = request.headers.get("x-razorpay-event-id") || (await sha256(rawBody));
        const existingEvent = await db
          .prepare("SELECT event_id FROM razorpay_webhook_events WHERE event_id = ?")
          .bind(eventId)
          .first();
        if (existingEvent) return json({ ok: true, duplicate: true }, 200, "");

        const subscription = payload?.payload?.subscription?.entity;
        const payment = payload?.payload?.payment?.entity;
        const handled = new Set([
          "subscription.authenticated",
          "subscription.activated",
          "subscription.charged",
          "subscription.cancelled",
          "subscription.halted",
          "subscription.completed",
        ]);
        if (subscription && handled.has(payload.event)) {
          const userId = subscription?.notes?.user_id;
          const profile = userId
            ? await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(userId).first()
            : null;
          if (profile) await applySubscription(db, env, profile, subscription);
          if (payload.event === "subscription.charged" && payment?.id && userId) {
            await db
              .prepare(
                `INSERT OR IGNORE INTO razorpay_payments
                 (razorpay_payment_id, razorpay_subscription_id, user_id, amount, currency, status, paid_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
              )
              .bind(
                payment.id,
                subscription.id,
                userId,
                Number(payment.amount || 0),
                payment.currency || "INR",
                payment.status || "captured",
                dateFromUnix(payment.created_at) || new Date().toISOString(),
              )
              .run();
          }
        }
        await db
          .prepare("INSERT OR IGNORE INTO razorpay_webhook_events (event_id, event_type) VALUES (?, ?)")
          .bind(eventId, String(payload.event || "unknown"))
          .run();
        return json({ ok: true }, 200, "");
      }

      if (request.method === "POST" && path === "/v1/signup") {
        const body = await readJson(request);
        const email = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "");
        const fullName = String(body?.full_name || "").trim();
        const phone = String(body?.phone || "").trim();
        const countryCode = String(body?.country_code || "").trim();
        if (!email.includes("@") || password.length < 8) {
          return json({ error: "Use a valid email and a password of at least 8 characters." }, 400, allowedOrigin);
        }
        if (!emailReady(env)) {
          return json({ error: "Sign-up emails are not switched on yet. Please try again later." }, 503, allowedOrigin);
        }
        const existing = await db.prepare("SELECT id, email_verified_at FROM profiles WHERE email = ?").bind(email).first();
        if (existing?.email_verified_at) {
          return json({ error: "An account with that email already exists. Log in instead." }, 409, allowedOrigin);
        }
        const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword(password, salt);
        const role = OWNER_EMAILS.has(email) ? "admin" : "student";
        const now = new Date().toISOString();
        if (existing) {
          await db
            .prepare(
              `UPDATE profiles SET password_hash = ?, password_salt = ?, full_name = ?, phone = ?, country_code = ?, updated_at = ?
               WHERE id = ?`,
            )
            .bind(passwordHash, salt, fullName || null, phone || null, countryCode || null, now, existing.id)
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO profiles
               (id, email, password_hash, password_salt, full_name, phone, country_code, role, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(crypto.randomUUID(), email, passwordHash, salt, fullName || null, phone || null, countryCode || null, role, now)
            .run();
        }
        await db.prepare("DELETE FROM email_codes WHERE email = ? AND purpose = 'verify'").bind(email).run();
        const sent = await issueCode(db, env, email, "verify");
        if (!sent) {
          return json({ error: "We could not send the confirmation email. Try again in a minute." }, 502, allowedOrigin);
        }
        await recordFunnel(db, "signup", { visitorId: "server", eventData: {} });
        return json({ needs_verification: true, email }, 201, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/verify") {
        const body = await readJson(request);
        const email = String(body?.email || "").trim().toLowerCase();
        const profile = await db.prepare("SELECT * FROM profiles WHERE email = ?").bind(email).first();
        if (!profile || !(await checkCode(db, email, "verify", body?.code || ""))) {
          return json({ error: "That code is wrong or has expired. Ask for a new one." }, 400, allowedOrigin);
        }
        const now = new Date().toISOString();
        await db.prepare("UPDATE profiles SET email_verified_at = ?, updated_at = ? WHERE id = ?").bind(now, now, profile.id).run();
        const token = await createSession(db, profile.id);
        return json({ token, user: publicProfile({ ...profile, email_verified_at: now }) }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/resend-code") {
        const body = await readJson(request);
        const email = String(body?.email || "").trim().toLowerCase();
        const profile = await db.prepare("SELECT email_verified_at FROM profiles WHERE email = ?").bind(email).first();
        if (profile && !profile.email_verified_at && emailReady(env)) await issueCode(db, env, email, "verify");
        return json({ ok: true }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/forgot-password") {
        const body = await readJson(request);
        const email = String(body?.email || "").trim().toLowerCase();
        if (!emailReady(env)) {
          return json({ error: "Password reset emails are not switched on yet. Please try again later." }, 503, allowedOrigin);
        }
        const profile = await db.prepare("SELECT id FROM profiles WHERE email = ?").bind(email).first();
        if (profile) await issueCode(db, env, email, "reset");
        return json({ ok: true }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/reset-password") {
        const body = await readJson(request);
        const email = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "");
        if (password.length < 8) {
          return json({ error: "Use a password of at least 8 characters." }, 400, allowedOrigin);
        }
        const profile = await db.prepare("SELECT id FROM profiles WHERE email = ?").bind(email).first();
        if (!profile || !(await checkCode(db, email, "reset", body?.code || ""))) {
          return json({ error: "That code is wrong or has expired. Ask for a new one." }, 400, allowedOrigin);
        }
        const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const now = new Date().toISOString();
        await db
          .prepare(
            `UPDATE profiles SET password_hash = ?, password_salt = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ?
             WHERE id = ?`,
          )
          .bind(await hashPassword(password, salt), salt, now, now, profile.id)
          .run();
        await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(profile.id).run();
        return json({ ok: true }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/login") {
        const body = await readJson(request);
        const login = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "");
        const profile = login.includes("@")
          ? await db.prepare("SELECT * FROM profiles WHERE email = ?").bind(login).first()
          : await db.prepare("SELECT * FROM profiles WHERE username = ?").bind(login).first();
        if (!profile?.password_hash || !profile.password_salt) {
          return json({ error: "Invalid email or password." }, 401, allowedOrigin);
        }
        const passwordHash = await hashPassword(password, profile.password_salt);
        if (passwordHash !== profile.password_hash) {
          return json({ error: "Invalid email or password." }, 401, allowedOrigin);
        }
        if (!profile.email_verified_at) {
          if (emailReady(env)) await issueCode(db, env, profile.email, "verify");
          return json(
            { error: "Confirm your email first. We sent you a code.", needs_verification: true, email: profile.email },
            403,
            allowedOrigin,
          );
        }
        const token = await createSession(db, profile.id);
        return json({ token, user: publicProfile(profile) }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/logout") {
        const header = request.headers.get("authorization") || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (token) {
          await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
        }
        return json({ ok: true }, 200, allowedOrigin);
      }

      if (request.method === "GET" && path === "/v1/session") {
        let profile = await userFromRequest(request, db);
        if (!profile) return json({ user: null }, 200, allowedOrigin);
        profile = await syncProfileSubscription(db, env, profile);
        return json({ user: publicProfile(profile) }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/password") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const body = await readJson(request);
        const password = String(body?.password || "");
        if (password.length < 8) {
          return json({ error: "Use a password of at least 8 characters." }, 400, allowedOrigin);
        }
        const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
        const passwordHash = await hashPassword(password, salt);
        await db
          .prepare("UPDATE profiles SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?")
          .bind(passwordHash, salt, new Date().toISOString(), profile.id)
          .run();
        return json({ ok: true }, 200, allowedOrigin);
      }

      if (request.method === "GET" && path === "/v1/profile") {
        let profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        profile = await syncProfileSubscription(db, env, profile);
        return json({ profile: publicProfile(profile) }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/payments/razorpay/subscriptions") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        if (isDummyProfile(profile)) {
          return json({ error: "Demo account: no charge.", demo: true }, 403, allowedOrigin);
        }
        if (isActiveProfile(profile)) {
          return json({ error: "Your Pro subscription is already active." }, 409, allowedOrigin);
        }
        const body = await readJson(request);
        const details = planDetails(env, String(body?.plan || "").toLowerCase());
        if (!details || !details.planId) {
          return json({ error: "Choose the weekly or monthly plan." }, 400, allowedOrigin);
        }

        const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const reusable = await db
          .prepare(
            `SELECT * FROM razorpay_subscriptions
             WHERE user_id = ? AND plan = ? AND status = 'created' AND created_at >= ?
             ORDER BY created_at DESC LIMIT 1`,
          )
          .bind(profile.id, details.plan, cutoff)
          .first();
        if (reusable) {
          const remote = await razorpayRequest(
            env,
            `/subscriptions/${encodeURIComponent(reusable.razorpay_subscription_id)}`,
          );
          await saveSubscription(db, remote, profile.id, details.plan);
          if (remote.status === "created" && remote.plan_id === details.planId) {
            await recordFunnel(db, "checkout", {
              visitorId: "server",
              userId: profile.id,
              eventData: { plan: details.plan, subscription_id: remote.id },
            });
            return json(
              {
                subscription_id: remote.id,
                key_id: env.RAZORPAY_KEY_ID,
                plan: details.plan,
                checkout_mode: env.CHECKOUT_MODE || "hosted",
                short_url: remote.short_url,
                return_url: "https://datafordummies.in/auth/profile.html?subscription=return",
              },
              200,
              allowedOrigin,
            );
          }
        }

        const subscription = await razorpayRequest(env, "/subscriptions", {
          method: "POST",
          body: JSON.stringify({
            plan_id: details.planId,
            total_count: details.totalCount,
            customer_notify: 1,
            notes: { product: "datafordummies", user_id: profile.id },
          }),
        });
        await saveSubscription(db, subscription, profile.id, details.plan);
        await db
          .prepare(
            `UPDATE profiles SET razorpay_subscription_id = ?, subscription_plan = ?,
             subscription_status = 'pending', updated_at = ? WHERE id = ?`,
          )
          .bind(subscription.id, details.plan, new Date().toISOString(), profile.id)
          .run();
        await recordFunnel(db, "checkout", {
          visitorId: "server",
          userId: profile.id,
          eventData: { plan: details.plan, subscription_id: subscription.id },
        });
        return json(
          {
            subscription_id: subscription.id,
            key_id: env.RAZORPAY_KEY_ID,
            plan: details.plan,
            checkout_mode: env.CHECKOUT_MODE || "hosted",
            short_url: subscription.short_url,
            return_url: "https://datafordummies.in/auth/profile.html?subscription=return",
          },
          201,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/payments/razorpay/confirm") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        if (isDummyProfile(profile)) {
          return json({ error: "Demo account: no charge.", demo: true }, 403, allowedOrigin);
        }
        const body = await readJson(request);
        const paymentId = String(body?.razorpay_payment_id || "");
        const subscriptionId = String(body?.razorpay_subscription_id || "");
        const signature = String(body?.razorpay_signature || "");
        if (
          !paymentId ||
          !subscriptionId ||
          !(await verifyHmac(`${paymentId}|${subscriptionId}`, signature, env.RAZORPAY_KEY_SECRET))
        ) {
          return json({ error: "Invalid payment signature." }, 400, allowedOrigin);
        }
        const subscription = await razorpayRequest(
          env,
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
        );
        if (
          subscription?.notes?.user_id !== profile.id ||
          subscription?.notes?.product !== "datafordummies" ||
          !PAID_SUBSCRIPTION_STATUSES.has(subscription.status)
        ) {
          return json({ error: "Subscription is not active for this account." }, 403, allowedOrigin);
        }
        await applySubscription(db, env, profile, subscription);
        const updated = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profile.id).first();
        return json({ ok: true, profile: publicProfile(updated) }, 200, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/payments/razorpay/status") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        if (isDummyProfile(profile)) {
          return json({ active: false, message: "Demo account: no charge." }, 200, allowedOrigin);
        }
        const body = await readJson(request);
        const subscriptionId = String(body?.subscription_id || profile.razorpay_subscription_id || "");
        if (!subscriptionId || subscriptionId !== profile.razorpay_subscription_id) {
          return json({ error: "Subscription does not belong to this account." }, 403, allowedOrigin);
        }
        const subscription = await razorpayRequest(
          env,
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
        );
        const active = await applySubscription(db, env, profile, subscription);
        const updated = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(profile.id).first();
        return json(
          { active, status: subscription.status, profile: publicProfile(updated) },
          200,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/payments/razorpay/cancel") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        if (isDummyProfile(profile)) {
          return json({ error: "Demo account: no charge.", demo: true }, 403, allowedOrigin);
        }
        if (!profile.razorpay_subscription_id || !isActiveProfile(profile)) {
          return json({ error: "There is no active subscription to cancel." }, 409, allowedOrigin);
        }
        const subscription = await razorpayRequest(
          env,
          `/subscriptions/${encodeURIComponent(profile.razorpay_subscription_id)}/cancel`,
          { method: "POST", body: JSON.stringify({ cancel_at_cycle_end: 1 }) },
        );
        if (
          subscription?.notes?.user_id !== profile.id ||
          subscription?.notes?.product !== "datafordummies"
        ) {
          return json({ error: "Subscription does not belong to this account." }, 403, allowedOrigin);
        }
        await saveSubscription(
          db,
          subscription,
          profile.id,
          planFromSubscription(env, subscription) || profile.subscription_plan,
        );
        await db
          .prepare("UPDATE profiles SET subscription_cancel_at_cycle_end = 1, updated_at = ? WHERE id = ?")
          .bind(new Date().toISOString(), profile.id)
          .run();
        return json(
          { ok: true, subscription_end_date: dateFromUnix(subscription.current_end) },
          200,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/progress/complete") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const body = await readJson(request);
        const courseId = String(body?.course_id || "").slice(0, 80);
        const lessonId = String(body?.lesson_id || "").slice(0, 120);
        const allowed = catalogLessonIds(courseId);
        if (!courseId || !catalogCourse(courseId)) {
          return json({ error: "That course is not in the catalog." }, 404, allowedOrigin);
        }
        if (!allowed.includes(lessonId)) {
          return json({ error: "That lesson is not in the catalog." }, 400, allowedOrigin);
        }
        const prior = await db
          .prepare("SELECT COUNT(*) AS n FROM lesson_completions WHERE user_id = ?")
          .bind(profile.id)
          .first();
        const now = new Date().toISOString();
        await db
          .prepare(
            `INSERT OR IGNORE INTO lesson_completions (user_id, course_id, lesson_id, completed_at)
             VALUES (?, ?, ?, ?)`,
          )
          .bind(profile.id, courseId, lessonId, now)
          .run();
        const summary = await writeProgress(db, profile, courseId, {
          lastLessonId: lessonId,
          lastLessonLabel: body?.lesson_label ? String(body.lesson_label).slice(0, 200) : lessonId,
          lastVisitedAt: now,
        });
        if (Number(prior?.n || 0) === 0) {
          await recordFunnel(db, "first_lesson", {
            visitorId: "server",
            userId: profile.id,
            eventData: { course_id: courseId, lesson_id: lessonId },
          });
        }
        return json({ ok: true, ...summary }, 200, allowedOrigin);
      }

      if (request.method === "GET" && path === "/v1/certificates") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const result = await db
          .prepare(
            "SELECT id, course_id, status, evidence_json, requested_at, issued_at FROM certificate_requests WHERE user_id = ? ORDER BY requested_at",
          )
          .bind(profile.id)
          .all();
        return json(
          { certificates: (result.results || []).map(certificateView) },
          200,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/certificates") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const body = await readJson(request);
        const courseId = String(body?.course_id || "").slice(0, 80);
        if (!catalogCourse(courseId)) {
          return json({ error: "That course is not in the catalog." }, 404, allowedOrigin);
        }
        const rows = await storedCompletions(db, profile.id, courseId);
        const summary = completionSummary(courseId, rows);
        if (summary.missing.length) {
          return json(
            {
              error: "Every catalog lesson must be saved before a completion record can be requested.",
              missing: summary.missing,
            },
            409,
            allowedOrigin,
          );
        }
        const existing = await db
          .prepare("SELECT * FROM certificate_requests WHERE user_id = ? AND course_id = ?")
          .bind(profile.id, courseId)
          .first();
        if (existing) {
          return json({ certificate: certificateView(existing) }, 200, allowedOrigin);
        }
        const id = crypto.randomUUID();
        const requestedAt = new Date().toISOString();
        const evidence = rows.map((row) => ({ lesson_id: row.lesson_id, completed_at: row.completed_at }));
        await db
          .prepare(
            `INSERT INTO certificate_requests
             (id, user_id, course_id, status, evidence_json, requested_at, issued_at)
             VALUES (?, ?, ?, 'requested', ?, ?, NULL)`,
          )
          .bind(id, profile.id, courseId, JSON.stringify(evidence), requestedAt)
          .run();
        const created = await db.prepare("SELECT * FROM certificate_requests WHERE id = ?").bind(id).first();
        return json({ certificate: certificateView(created) }, 201, allowedOrigin);
      }

      if (request.method === "PUT" && path === "/v1/progress") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const body = await readJson(request);
        const courseId = String(body?.course_id || "").slice(0, 80);
        if (!courseId) return json({ error: "Missing course." }, 400, allowedOrigin);
        const summary = await writeProgress(db, profile, courseId, {
          lastLessonId: body?.last_lesson_id ? String(body.last_lesson_id).slice(0, 120) : null,
          lastLessonLabel: body?.last_lesson_label ? String(body.last_lesson_label).slice(0, 200) : null,
          lastVisitedAt: body?.last_visited_at || new Date().toISOString(),
        });
        return json({ ok: true, progress_pct: summary.progressPct, completed_lesson_ids: summary.completed }, 200, allowedOrigin);
      }

      if (request.method === "GET" && path === "/v1/progress") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ progress: [] }, 200, allowedOrigin);
        const courseId = url.searchParams.get("course_id");
        const query = courseId
          ? db.prepare(
              "SELECT course_id, last_lesson_id, last_lesson_label, completed_lesson_ids, progress_pct, last_visited_at FROM user_progress WHERE user_id = ? AND course_id = ?",
            ).bind(profile.id, courseId)
          : db.prepare(
              "SELECT course_id, last_lesson_id, last_lesson_label, completed_lesson_ids, progress_pct, last_visited_at FROM user_progress WHERE user_id = ? ORDER BY last_visited_at DESC",
            ).bind(profile.id);
        const result = await query.all();
        const progress = (result.results || []).map((row) => {
          let completed = [];
          try {
            completed = JSON.parse(row.completed_lesson_ids || "[]");
          } catch {
            completed = [];
          }
          return { ...row, completed_lesson_ids: completed };
        });
        return json({ progress }, 200, allowedOrigin);
      }

      if (request.method === "GET" && path === "/v1/admin/analytics") {
        const profile = await userFromRequest(request, db);
        if (!profile || profile.role !== "admin" || !OWNER_EMAILS.has(profile.email)) {
          return json({ error: "Admin access required." }, 403, allowedOrigin);
        }
        const since = url.searchParams.get("since") || "2020-01-01T00:00:00Z";
        const [pageViews, events, visitors, users, subscriptions, revenue, funnelRows, certificateRows] = await Promise.all([
          db.prepare("SELECT * FROM page_views WHERE created_at >= ? ORDER BY created_at DESC LIMIT 5000").bind(since).all(),
          db.prepare("SELECT * FROM analytics_events WHERE created_at >= ? ORDER BY created_at DESC LIMIT 3000").bind(since).all(),
          db.prepare("SELECT * FROM site_visitors ORDER BY last_seen DESC LIMIT 1000").all(),
          db.prepare(
            "SELECT id, email, full_name, role, subscription_status, created_at FROM profiles ORDER BY created_at DESC LIMIT 500",
          ).all(),
          db.prepare(
            `SELECT id, email, subscription_status, subscription_plan, subscription_end_date,
             razorpay_subscription_id, created_at, updated_at, subscription_cancel_at_cycle_end
             FROM profiles ORDER BY created_at DESC LIMIT 500`,
          ).all(),
          db.prepare(
            `SELECT COALESCE(SUM(amount), 0) AS amount_paise, COUNT(*) AS payment_count
             FROM razorpay_payments WHERE status IN ('captured', 'authorized')`,
          ).first(),
          db.prepare(
            `SELECT event_type, COUNT(*) AS events,
                    COUNT(DISTINCT COALESCE(user_id, visitor_id)) AS people
             FROM analytics_events
             WHERE created_at >= ? AND event_type IN (
               'course_view', 'signup', 'first_lesson', 'pro_page', 'checkout', 'active_subscription'
             )
             GROUP BY event_type`,
          ).bind(since).all(),
          db.prepare(
            `SELECT id, user_id, course_id, status, requested_at, issued_at
             FROM certificate_requests ORDER BY requested_at DESC LIMIT 200`,
          ).all(),
        ]);
        const parsedEvents = (events.results || []).map((event) => {
          try {
            return { ...event, event_data: JSON.parse(event.event_data || "{}") };
          } catch {
            return { ...event, event_data: {} };
          }
        });
        const funnel = {
          course_view: { events: 0, people: 0 },
          signup: { events: 0, people: 0 },
          first_lesson: { events: 0, people: 0 },
          pro_page: { events: 0, people: 0 },
          checkout: { events: 0, people: 0 },
          active_subscription: { events: 0, people: 0 },
        };
        for (const row of funnelRows.results || []) {
          funnel[row.event_type] = { events: Number(row.events || 0), people: Number(row.people || 0) };
        }
        return json(
          {
            page_views: pageViews.results || [],
            analytics_events: parsedEvents,
            site_visitors: visitors.results || [],
            users: users.results || [],
            subscribers: subscriptions.results || [],
            total_active_subscribers: (subscriptions.results || []).filter(isActiveProfile).length,
            revenue: {
              amount_paise: Number(revenue?.amount_paise || 0),
              payment_count: Number(revenue?.payment_count || 0),
              currency: "INR",
            },
            funnel,
            certificate_requests: certificateRows.results || [],
          },
          200,
          allowedOrigin,
        );
      }

      if (request.method === "POST" && path === "/v1/page-view") {
        const body = await readJson(request);
        const visitorId = String(body?.visitor_id || "").slice(0, 80);
        const pagePath = String(body?.page_path || "").slice(0, 300);
        if (!visitorId || !pagePath) return json({ ok: true }, 202, allowedOrigin);
        const profile = await userFromRequest(request, db);
        await db
          .prepare(
            `INSERT INTO page_views
             (visitor_id, session_id, page_path, page_title, referrer, country, city, device_type, browser, os, screen_size, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            visitorId,
            body?.session_id ? String(body.session_id).slice(0, 80) : null,
            pagePath,
            body?.page_title ? String(body.page_title).slice(0, 200) : null,
            body?.referrer ? String(body.referrer).slice(0, 300) : null,
            request.cf?.country || null,
            request.cf?.city || null,
            body?.device_type ? String(body.device_type).slice(0, 40) : null,
            body?.browser ? String(body.browser).slice(0, 40) : null,
            body?.os ? String(body.os).slice(0, 40) : null,
            body?.screen_size ? String(body.screen_size).slice(0, 40) : null,
            profile?.id || null,
          )
          .run();
        const funnelType = funnelEventForPath(pagePath);
        if (funnelType) {
          await recordFunnel(db, funnelType, {
            visitorId,
            userId: profile?.id || null,
            pagePath,
            country: request.cf?.country || null,
            eventData: {},
          });
        }
        await db
          .prepare(
            `INSERT INTO site_visitors
             (visitor_id, country, city, device_type, browser, os, is_registered, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(visitor_id) DO UPDATE SET
               last_seen = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
               total_visits = site_visitors.total_visits + 1,
               total_page_views = site_visitors.total_page_views + 1,
               country = COALESCE(excluded.country, site_visitors.country),
               city = COALESCE(excluded.city, site_visitors.city),
               is_registered = excluded.is_registered,
               user_id = COALESCE(excluded.user_id, site_visitors.user_id)`,
          )
          .bind(
            visitorId,
            request.cf?.country || null,
            request.cf?.city || null,
            body?.device_type ? String(body.device_type).slice(0, 40) : null,
            body?.browser ? String(body.browser).slice(0, 40) : null,
            body?.os ? String(body.os).slice(0, 40) : null,
            profile ? 1 : 0,
            profile?.id || null,
          )
          .run();
        return json({ ok: true }, 201, allowedOrigin);
      }

      if (request.method === "POST" && path === "/v1/event") {
        const body = await readJson(request);
        const visitorId = String(body?.visitor_id || "").slice(0, 80);
        const eventType = String(body?.event_type || "").slice(0, 80);
        if (!visitorId || !eventType) return json({ ok: true }, 202, allowedOrigin);
        const profile = await userFromRequest(request, db);
        await db
          .prepare(
            `INSERT INTO analytics_events
             (visitor_id, session_id, event_type, event_data, page_path, country, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            visitorId,
            body?.session_id ? String(body.session_id).slice(0, 80) : null,
            eventType,
            JSON.stringify(body?.event_data || {}).slice(0, 2000),
            body?.page_path ? String(body.page_path).slice(0, 300) : null,
            request.cf?.country || null,
            profile?.id || null,
          )
          .run();
        return json({ ok: true }, 201, allowedOrigin);
      }

      return json({ error: "Not found" }, 404, allowedOrigin);
    } catch (error) {
      console.error("request failed", request.method, path, error?.name || "Error", error?.message || "unknown");
      if (d1DailyLimitReached(error)) {
        return json(
          { error: "Accounts and saved progress are temporarily unavailable because today's storage allowance has been reached. Nothing was charged. Please try again after the daily reset." },
          503,
          allowedOrigin,
        );
      }
      return json({ error: "The service could not complete that request." }, 500, allowedOrigin);
    }
  },
};
