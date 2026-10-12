# Lesson shell

`templates/lesson-shell.html` is the copy-from pattern for a new lesson. It is not a course page and it is not linked from a hub. Existing lessons stay as they are until a later pass migrates them.

## Head order

Family CSS first. Page accent next, in a small `<style>` or the course stylesheet. `dfd-system.css` last.

```html
<link rel="stylesheet" href="../css/course-light-theme.css">
<style>:root { --course-primary: #0f766e; --course-accent: #14b8a6; }</style>
<link rel="stylesheet" href="../css/dfd-system.css">
```

One folder deeper uses `../../css/dfd-system.css`. Do not copy the token list into the page. Do not load `js/hub-script.js` on a lesson: that file already owns home-page nav clicks, scroll, and its own intersection observer.

## Script order

Keep accounts and the paywall. `lesson-common.js` comes after `progress.js` so `FKTI_Progress` exists. `quiz.js` is only required when the page has `[data-dfd-quiz]`.

```html
<script src="../js/code-copy.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase-config.js"></script>
<script src="../js/supabase-auth.js"></script>
<script src="../js/paywall.js"></script>
<script src="../js/progress.js"></script>
<script src="../js/lesson-common.js"></script>
<script src="../js/quiz.js"></script>
<script src="../js/analytics-tracker.js"></script>
```

A Pro lesson adds `data-access="pro"` on `<body>`. `paywall.js` stays in this order either way. It does nothing unless that attribute is `pro`. Do not drop `paywall.js` or `supabase-auth.js` from a Pro page.

## What the shared scripts opt into

| Need | Markup |
|------|--------|
| Reveal on scroll | `data-dfd-reveal` |
| Save the visit | `data-course-id` and `data-lesson-id` on `<body>`, optional `data-lesson-label` and `data-total-lessons` |
| Mark complete | `<button type="button" data-dfd-complete>` |
| Progress bar | `data-dfd-progress-bar`, `data-dfd-progress-fill`, `data-dfd-progress-label` |
| Knowledge check | `data-dfd-quiz` with `[data-correct="true|false"]`. Optional `data-explanation` and `[data-dfd-explain]` |
| Diagram steps | `data-dfd-diagram`, `[data-dfd-diagram-step]`, `[data-dfd-diagram-panel]` |
| Wide table | `class="dfd-scroll"` |
| Safe area | `class="dfd-safe"` on `<body>` |

Viewport meta keeps the page's existing content and adds `viewport-fit=cover`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Old `.quiz-opt`, `.quiz-option`, `[data-quiz]`, `.back-to-top`, and `checkQuiz` / `checkQ` handlers are unchanged. `lesson-common.js` does not add a second back-to-top handler when those controls already exist.

## Checks

```bash
python3 scripts/verify_site.py --self-test
python3 scripts/verify_site.py
node scripts/viewport_audit.mjs --base http://127.0.0.1:8080
```

`verify_site.py` exits 0 when the only issues are the known unfinished lessons. A new broken internal link, a second or missing `dfd-system.css`, or a new Pro page without the paywall scripts exits non-zero.
