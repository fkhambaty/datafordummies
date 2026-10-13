/**
 * Production smoke for Data For Dummies.
 * It does not create an account and it does not complete a payment.
 * Set REQUIRE_BROWSER=1 and PLAYWRIGHT_MODULE to check the homepage width.
 */
const site = process.env.SITE_URL || "https://datafordummies.in";
const api = process.env.API_URL || "https://datafordummies-api.fkhambaty.workers.dev";
const failures = [];

function note(label, detail) {
  console.log(`${label}: ${detail}`);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function homepage() {
  const response = await fetch(site + "/");
  const text = await response.text();
  if (response.status !== 200 || !text.includes("Data For Dummies")) {
    failures.push(`homepage status ${response.status}`);
  }
  note("homepage", String(response.status));
}

async function paymentPolicies() {
  const paths = [
    "/pricing.html",
    "/privacy.html",
    "/terms.html",
    "/cancellation.html",
    "/refunds.html",
    "/shipping.html",
    "/contact.html",
  ];
  for (const path of paths) {
    const response = await fetch(site + path);
    note("payment-policy", `${path} ${response.status}`);
    if (response.status !== 200) {
      failures.push(`payment policy ${path} returned ${response.status}`);
    }
  }
}

async function health() {
  const response = await fetch(api + "/v1/health");
  const body = await readJson(response);
  const keys = body ? Object.keys(body).sort().join(",") : "";
  note("health", `${response.status} keys=${keys} email_ready=${body && body.email_ready}`);
  if (response.status !== 200 || !body || body.ok !== true || typeof body.email_ready !== "boolean") {
    failures.push("health endpoint did not report email readiness");
    return;
  }
  if (JSON.stringify(body).includes("RESEND") || JSON.stringify(body).includes("SECRET")) {
    failures.push("health response included a secret name");
  }
  if (body.email_ready !== true) {
    failures.push("signup email is not ready. No account was created. Resend domain verification is still required.");
  }
  if (body.email_sender !== "primary" && body.email_sender !== "fallback") {
    failures.push(`signup email has no verified sender domain (email_sender=${body.email_sender})`);
  } else if (body.email_sender === "fallback") {
    note("health", "warning: datafordummies.in is not verified in Resend; codes are sent from the fallback domain");
  }
  if (body.payments_configured !== true) {
    failures.push("Razorpay is not configured");
  }
  if (body.checkout_mode !== "hosted" && body.checkout_mode !== "modal") {
    failures.push(`unexpected checkout mode ${body.checkout_mode}`);
  }
}

async function dummyLogin() {
  const response = await fetch(api + "/v1/login", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site },
    body: JSON.stringify({ email: "dummy", password: "dummy" }),
  });
  const body = await readJson(response);
  const username = body && body.user && body.user.username;
  note("dummy-login", `${response.status} username=${username || "none"}`);
  if (response.status !== 200 || username !== "dummy" || !body.token) {
    failures.push("dummy login did not return the existing demo account");
    return null;
  }
  const payment = await fetch(api + "/v1/payments/razorpay/subscriptions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: site,
      authorization: `Bearer ${body.token}`,
    },
    body: JSON.stringify({ plan: "weekly" }),
  });
  const paymentBody = await readJson(payment);
  note("dummy-payment", `${payment.status} demo=${paymentBody && paymentBody.demo}`);
  if (payment.status !== 403 || !paymentBody || paymentBody.demo !== true || paymentBody.short_url) {
    failures.push("dummy payment creation was not refused before a charge");
  }
  return null;
}

async function browser() {
  if (process.env.REQUIRE_BROWSER !== "1") {
    note("browser", "skipped");
    return;
  }
  const modulePath = process.env.PLAYWRIGHT_MODULE || "playwright";
  const playwright = await import(modulePath);
  const chromium = playwright.chromium || (playwright.default && playwright.default.chromium);
  if (!chromium) {
    failures.push("Playwright chromium was not available");
    return;
  }
  const browserApp = await chromium.launch();
  try {
    for (const width of [390, 1440]) {
      const page = await browserApp.newPage({ viewport: { width, height: 900 } });
      const response = await page.goto(site + "/", { waitUntil: "domcontentloaded" });
      const status = response ? response.status() : 0;
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      note("viewport", `${width} status=${status} overflow=${overflow}`);
      if (status !== 200 || overflow > 1) {
        failures.push(`homepage at ${width}px overflowed or failed (${status}, ${overflow})`);
      }
      await page.close();
    }
  } finally {
    await browserApp.close();
  }
}

await homepage();
await paymentPolicies();
await health();
await dummyLogin();
await browser();

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log("smoke ok");
