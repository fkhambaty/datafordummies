# Data For Dummies — notes for an AI agent

Read [`ARCHITECTURE.md`](ARCHITECTURE.md) before editing. It is the map of hosting, courses, payments, and the old names that must stay.

## Identity

- Live site: https://datafordummies.in
- Repo: https://github.com/fkhambaty/datafordummies
- Brand on the site: Data For Dummies
- Older name still inside the code: FKTI. Leave `localStorage` keys and the Firebase project id `fkti-analytics` alone unless you are deliberately migrating stored progress.

## What this product is

A static HTML learning site. GitHub Pages serves the files in this repository. Supabase (`gfskxboxvzuwozknfulo`) is only for accounts, Pro, and analytics. Razorpay takes payment through Supabase edge functions.

## What this product is not

- Not a Next.js or Vite app. There is no build.
- Not hosted on Vercel. `CNAME` plus GitHub Pages DNS is the production path.
- Not FunBerry Kids and not Okavo.
- Not a Discord community. Do not link `href="#"` and call it a forum.

## Editing rules

- Course links need a real `href` to a file that exists. `enterCourse` in `js/hub-script.js` is an extra, not the only path.
- Student Python practice is `python_course/student-assignments.html`. Solution pages are separate. Do not mix them.
- Do not put a Supabase service-role key, a Razorpay secret, or a webhook secret in HTML or in `js/supabase-config.js`.
- Do not invent learner counts or employer claims.
- Pushing `main` publishes the site. Check the changed page in a browser before you call the work done.

## Local check

```bash
python3 -m http.server 8080
```

Open http://127.0.0.1:8080 and click through the page you edited, including one course link from the footer.
