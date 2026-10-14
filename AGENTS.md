# Data For Dummies — notes for an AI agent

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) before editing. It is the map of hosting, courses, payments, and the old names that must stay.

## Identity

- Live site: https://datafordummies.in
- Repo: https://github.com/fkhambaty/datafordummies
- Brand on the site: Data For Dummies
- Older name still inside the code: FKTI. Leave `localStorage` keys, including `fkti_analytics`, alone. The homepage does not load Firebase. Do not put that SDK back.

## What this product is

A static HTML learning site. GitHub Pages serves the files in this repository. Accounts, progress, analytics, admin data, and Pro subscription state live in the Cloudflare Worker + D1 backend. The old Supabase project and edge functions are retired.

`mobile/` is a separate Expo app for the same account and the same lessons. It is not the website and it is not a second backend. Read `docs/MOBILE_ARCHITECTURE.md` before editing it. The app does not sell Pro and does not embed Razorpay. Account deletion is `DELETE /v1/account`: the current password and the confirmation phrase `DELETE`, then one database batch. The demo account cannot be deleted.

## Payments

- Data For Dummies uses the FKTech EdTech Razorpay account shared only with FunBerry Kids, with product-specific plan ids and webhook secret. Okavo requires a separate marketplace merchant account.
- Production uses `CHECKOUT_MODE = "hosted"` until Razorpay approves `datafordummies.in`. Flip it to `modal` and redeploy only after approval.
- The Worker creates subscriptions, verifies signatures, checks ownership through Razorpay notes, reconciles `/v1/profile`, records charges, and handles cancellation at cycle end.
- Never use the retired ₹499 plan or the generic `razorpay.me` link. Never call the retired Supabase payment functions.

## What this product is not

- Not a Next.js or Vite website. The site has no build. `mobile/` is an Expo app with its own `package.json`; do not add that build to the website.
- Not hosted on Vercel. `CNAME` plus GitHub Pages DNS is the production path.
- Not FunBerry Kids and not Okavo.
- Not a Discord community. Do not link `href="#"` and call it a forum.

## Editing rules

- Course links need a real `href` to a file that exists. `enterCourse` in `js/hub-script.js` is an extra, not the only path.
- Student Python practice is `python_course/student-assignments.html`. Solution pages are separate. Do not mix them.
- Do not put a Razorpay secret, webhook secret, Resend key, or Cloudflare credential in HTML or JavaScript. Public Razorpay plan ids and key id belong in Worker vars.
- Do not invent learner counts or employer claims.
- Pushing `main` publishes the site. Check the changed page in a browser before you call the work done.

## Local check

```bash
python3 -m http.server 8877
```

Open http://127.0.0.1:8877 and click through the page you edited, including one course link from the footer. Port 8080 is often already taken on this machine.

The nav breakpoint is 768px in CSS and in `js/hub-script.js`. Check a phone width (390), the menu boundary (768 and 820), and desktop (1440).

Before a layout or lesson-shell change, also run:

```bash
python3 scripts/verify_site.py --self-test
python3 scripts/verify_site.py
scripts/check_viewports.sh sweep
```

`verify_site.py` must exit 0 with no warnings. A broken internal link, a bad `dfd-system.css` link, or a new Pro page missing `paywall.js` is a failure. `scripts/check_viewports.sh all` is the full matrix: every page at 390, 768, and 1440, representative routes at the other three target viewports, then the click path. The audit uses Playwright from `PLAYWRIGHT_MODULE` or the Okavo `node_modules` checkout. There is no site package install. It stubs local `/v1/page-view` and `/v1/event` so a CORS line is not treated as a page failure. The crawler skips `mobile/`.

After a change inside `mobile/`:

```bash
cd mobile
npm run typecheck
npm run lint
npm run test:ci
npm run doctor
```
