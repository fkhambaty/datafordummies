# Data For Dummies — notes for an AI agent

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) before editing. It is the map of hosting, courses, payments, and the old names that must stay.

## Identity

- Live site: https://datafordummies.in
- Repo: https://github.com/fkhambaty/datafordummies
- Brand on the site: Data For Dummies
- Older name still inside the code: FKTI. Leave `localStorage` keys and the Firebase project id `fkti-analytics` alone unless you are deliberately migrating stored progress.

## What this product is

A static HTML learning site. GitHub Pages serves the files in this repository. Accounts, progress, analytics, admin data, and Pro subscription state live in the Cloudflare Worker + D1 backend. The old Supabase project and edge functions are retired.

## Payments

- Data For Dummies uses the single FKTech live Razorpay account shared with FunBerry and Okavo, with product-specific plan ids and webhook secret.
- Production uses `CHECKOUT_MODE = "hosted"` until Razorpay approves `datafordummies.in`. Flip it to `modal` and redeploy only after approval.
- The Worker creates subscriptions, verifies signatures, checks ownership through Razorpay notes, reconciles `/v1/profile`, records charges, and handles cancellation at cycle end.
- Never use the retired ₹499 plan or the generic `razorpay.me` link. Never call the retired Supabase payment functions.

## What this product is not

- Not a Next.js or Vite app. There is no build.
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
python3 -m http.server 8080
```

Open http://127.0.0.1:8080 and click through the page you edited, including one course link from the footer.
