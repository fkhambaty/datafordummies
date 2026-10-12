# Data For Dummies — architecture guide

Written 12 October 2026 so a different AI on a different computer can work without this chat.

Read this file, then `AGENTS.md`. The README still contains older FKTI notes underneath a corrected header. Trust this file when they disagree.

## What it is

Data For Dummies is a static learning site for data analytics and data engineering. A visitor can open course pages, practice, and (when the database is awake) sign in and pay for Pro. The pages are hand-written HTML, CSS, and JavaScript. There is no React app and no build step.

Live brand: **Data For Dummies**. The code still contains the older name FKTI in storage keys, a Firebase project id, and email copy. Do not rename `fkti_analytics` in `localStorage` or the Firebase project `fkti-analytics` as a cosmetic cleanup. Existing browsers would lose progress and the old analytics path would break.

It is not FunBerry Kids and it is not Okavo.

## Live addresses

| Surface | Address | Status on 12 Oct 2026 |
|---------|---------|------------------------|
| Website | https://datafordummies.in | HTTP 200. |
| www | https://www.datafordummies.in | Redirects to the apex. CNAME is `fkhambaty.github.io`. |
| GitHub | https://github.com/fkhambaty/datafordummies | This repository is the website. |
| Old repo name | `fkhambaty/fkti_data` | Mentioned in old docs. The footer used to link there. The live repository is `datafordummies`. |

Hosting is **GitHub Pages**, not Vercel. The DNS `A` records are GitHub Pages (`185.199.108.153` through `185.199.111.153`). The file `CNAME` contains `datafordummies.in`. Pushing `main` publishes the site. There is no Vercel project to configure for this domain unless the owner deliberately moves it.

The domain itself is registered at GoDaddy. API keys for DNS changes are created at https://developer.godaddy.com/keys.

## How a page works

```
Browser
  → GitHub Pages (the HTML in this repo)
      → course pages stay in these files
      → new accounts, lesson progress, and visit counts call
        https://datafordummies-api.fkhambaty.workers.dev
  → Cloudflare D1 database datafordummies
      → schema cloudflare/d1/schema.sql
      → worker cloudflare/worker
  → Razorpay checkout still uses the old Supabase function
```

New accounts do not use Supabase. Signup emails a 6-digit code. The account cannot log in until `auth/verify.html` accepts that code. `auth/reset-password.html` emails a reset code and sets a new password. Codes expire after 15 minutes and allow 5 tries. Email goes through Resend: the worker secret is `RESEND_API_KEY` and the sender is `MAIL_FROM` in `wrangler.toml`. Without the secret, signup and reset return 503 on purpose.

Test login: username `dummy`, password `dummy`. It is an already-confirmed student account, never an admin. Delete it with `DELETE FROM profiles WHERE id = 'dummy-test-account'` if the site should not have it. The public config is `window.DFD_API` in `js/supabase-config.js`. Do not put the Cloudflare API token in that file.

## Repository map

Root `*.html` files are the hub: home, pricing, learning path, projects, founder, and the standalone tools (pipeline designer, data adventure, data modelling, distributed computing).

Course folders, each with its own `index.html` and usually a `hub.html`:

| Folder | Subject |
|--------|---------|
| `python_course/` | Python for data science |
| `data_science_course/` | Data science and ML |
| `postgres_course/` | PostgreSQL |
| `mssql_course/` | Microsoft SQL Server |
| `airflow_course/` | Apache Airflow |
| `dbt_course/` | dbt |
| `clickhouse_course/` | ClickHouse |
| `redshift_course/` | Amazon Redshift |
| `metabase_course/` | Metabase |
| `kubernetes_course/` | Kubernetes |
| `terraform_course/` | Terraform |
| `llm_course/` | Large language models |
| `dms_course/` | AWS DMS |
| `interviews/` | Interview practice |

`js/hub-script.js` function `enterCourse` is the old router from the home page into a course `hub.html`. Footer links should also have a real `href`, so the course opens when JavaScript does not.

`supabase/migrations` is the database. `supabase/functions` is the payment and email edge code. `admin/` is the private analytics view.

`python_course/student-assignments.html` is the student practice (anchors `assignment1` through `assignment5`). `a1-strings.html` and its siblings are solution pages, not the student links. Do not point the student cards at the solution files.

## Payments and accounts

Pro is Razorpay, wired through the Supabase edge functions above. Setup notes that are still useful: `PAYMENTS_SETUP.md`, `PAYWALL_SETUP.md`, `AUTH_SETUP.md`. Several of those files contain placeholder hosts (`abcdefgh.supabase.co`). The real host is `gfskxboxvzuwozknfulo.supabase.co`.

Contact addresses published on the site: `fktiindia@gmail.com` and `fakhruddinkhambaty@gmail.com`. There is no Discord server and no discussion forum. Do not add those links back as `href="#"`.

## Local run

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

No install step. A change is live only after it is pushed to `main` and GitHub Pages finishes.

## What not to get wrong

- Do not move the site to Vercel as a drive-by. The domain points at GitHub Pages on purpose.
- Do not invent learner counts, employer logos, or a community that does not exist. The home page already jokes about bragging. Adding more claims makes that worse.
- The homepage footer used to link GitHub at `fkhambaty/fkti_data` and the five Python assignment cards linked `student-a1.html` through `student-a5.html`, which were 404s. Those now point at this repository and at `student-assignments.html#assignmentN`.
- Course pages and the marketing home do not share one design system. A visual rewrite has to be done page by page and checked in a browser. Do not run a blind find-and-replace across the course HTML.
