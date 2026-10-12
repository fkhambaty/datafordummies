const ALLOWED_ORIGINS = new Set([
  "https://datafordummies.in",
  "https://www.datafordummies.in",
  "http://127.0.0.1:8080",
  "http://localhost:8080",
]);

const OWNER_EMAILS = new Set([
  "fakhruddinkhambaty@gmail.com",
  "fktiindia@gmail.com",
]);

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
    full_name: row.full_name,
    phone: row.phone,
    country_code: row.country_code,
    role: row.role,
    subscription_status: row.subscription_status,
    subscription_plan: row.subscription_plan,
    subscription_end_date: row.subscription_end_date,
    razorpay_subscription_id: row.razorpay_subscription_id,
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

async function sendEmail(env, to, subject, text) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text }),
  });
  return response.ok;
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
    if (request.method === "OPTIONS") {
      return json({ ok: true }, 204, allowedOrigin);
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const db = env.DB;

    try {
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
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ user: null }, 200, allowedOrigin);
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
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        return json({ profile: publicProfile(profile) }, 200, allowedOrigin);
      }

      if (request.method === "PUT" && path === "/v1/progress") {
        const profile = await userFromRequest(request, db);
        if (!profile) return json({ error: "Log in again." }, 401, allowedOrigin);
        const body = await readJson(request);
        const courseId = String(body?.course_id || "").slice(0, 80);
        if (!courseId) return json({ error: "Missing course." }, 400, allowedOrigin);
        const existing = await db
          .prepare("SELECT completed_lesson_ids, progress_pct FROM user_progress WHERE user_id = ? AND course_id = ?")
          .bind(profile.id, courseId)
          .first();
        let completed = [];
        try {
          completed = JSON.parse(existing?.completed_lesson_ids || "[]");
        } catch {
          completed = [];
        }
        if (Array.isArray(body?.completed_lesson_ids)) {
          completed = body.completed_lesson_ids.map((item) => String(item)).slice(0, 500);
        }
        let progressPct = Number(existing?.progress_pct || 0);
        if (body && body.progress_pct !== undefined && body.progress_pct !== null && body.progress_pct !== "") {
          const parsed = Number(body.progress_pct);
          if (!Number.isNaN(parsed)) progressPct = parsed;
        }
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
            body?.last_lesson_id ? String(body.last_lesson_id).slice(0, 120) : null,
            body?.last_lesson_label ? String(body.last_lesson_label).slice(0, 200) : null,
            JSON.stringify(completed),
            progressPct,
            body?.last_visited_at || now,
            now,
          )
          .run();
        return json({ ok: true }, 200, allowedOrigin);
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
            body?.country ? String(body.country).slice(0, 80) : null,
            body?.city ? String(body.city).slice(0, 80) : null,
            body?.device_type ? String(body.device_type).slice(0, 40) : null,
            body?.browser ? String(body.browser).slice(0, 40) : null,
            body?.os ? String(body.os).slice(0, 40) : null,
            body?.screen_size ? String(body.screen_size).slice(0, 40) : null,
            profile?.id || null,
          )
          .run();
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
            body?.country ? String(body.country).slice(0, 80) : null,
            body?.city ? String(body.city).slice(0, 80) : null,
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
            body?.country ? String(body.country).slice(0, 80) : null,
            profile?.id || null,
          )
          .run();
        return json({ ok: true }, 201, allowedOrigin);
      }

      return json({ error: "Not found" }, 404, allowedOrigin);
    } catch (error) {
      return json({ error: "The database did not accept that request." }, 500, allowedOrigin);
    }
  },
};
