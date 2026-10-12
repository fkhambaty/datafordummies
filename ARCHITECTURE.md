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

## Design system

`css/dfd-system.css` owns shared tokens, keyboard focus, reduced motion, and overflow guards. Every static HTML page links it last inside `<head>`, with a relative path (`css/dfd-system.css` at the root, `../css/dfd-system.css` one folder down). Checked 13 October 2026: 214 pages, one link each, every path resolves.

Family styles sit in front of that file. They own color and layout. The system file must not repaint them.

| Family | Stylesheet | Pages |
|--------|------------|--------|
| Marketing | `css/fkti-light-theme.css`, `css/hub-styles.css`, `styles/ui-upgrade.css` | Home, learning path, founder, projects index, and pages that already share that nav |
| Course hubs | `css/hub-light.css` | The nine `hub.html` files that already link it. Each hub sets `--hub-color` and `--hub-color2` |
| Shared lesson shell | `css/course-light-theme.css` | Lessons whose `styles.css` imports it (PostgreSQL, ClickHouse, Metabase, Redshift) |
| Python | `python_course/light-theme.css` | Python lessons |
| Accounts | `styles/design-system.css`, `styles/auth.css` | `auth/` |
| Pricing | `styles/pricing.css` | `pricing.html` |
| Project walkthroughs | `css/project-pages.css` | `projects/*.html` |
| Admin | `css/dfd-admin.css` | `admin/analytics.html` only |
| Tools | `css/dfd-tools.css` | `pipeline-designer.html`, `data-modelling.html`, `bus-matrix.html`, `distributed-computing.html` |

Many data-science, SQL Server, Airflow, dbt, and LLM lessons still carry their own `<style>` block. That is intentional. Those blocks own the course accent. Do not replace them with a blanket theme.

### Safe extension rules

- A new page links `dfd-system.css` with the correct relative path. It does not copy the token list into a new file.
- New rules in `dfd-system.css` use `:where()` or stay limited to focus, reduced motion, and overflow. The file loads after inline `<style>`, so a normal class selector would override lesson colors.
- Course accent colors stay in the course stylesheet or that page's own `:root`.
- Do not restyle `.keyword`, `.string`, `.comment`, `.function`, `.number`, `.type`, or `.operator`. Lessons paint those as inline spans.
- Do not rename `FKTI_Auth`, any `fkti_` storage key, or the Firebase project id `fkti-analytics`. The published address `fktiindia@gmail.com` stays. Visible "FKTI" labels may say Data For Dummies.
- Do not rename classes that course JavaScript or the paywall reads, including hub cards, lesson nav, quiz options, and code-copy buttons.
- Do not set `display` on `[data-access]`, `.paywall`, `.pro-lock-overlay`, `.pro-locked-wrapper`, `.dashboard`, `.auth-gate`, or `.admin-signin-overlay`. Signup verification, progress, code copy, the paywall, and Razorpay stay wired as they are.
- Do not put `overflow` on `html` or `body` in the shared file. That forces the other axis off `visible` and breaks fixed menus and modals.
- The filename `css/fkti-light-theme.css` stays. Renaming it would break every existing link.

## Local run

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

No install step. A change is live only after it is pushed to `main` and GitHub Pages finishes.

## What not to get wrong

- Do not move the site to Vercel as a drive-by. The domain points at GitHub Pages on purpose.
- The homepage must not invent learner counts, employer logos, testimonials, or project totals. Course folders and project pages that exist in this repo can be named. A number that was not counted from the repo does not go on the page.
- The homepage footer used to link GitHub at `fkhambaty/fkti_data` and the five Python assignment cards linked `student-a1.html` through `student-a5.html`, which were 404s. Those now point at this repository and at `student-assignments.html#assignmentN`.
- Visual changes go through the design-system table above. Do not find-and-replace course HTML class names, syntax spans, or payment scripts to chase a new look.
