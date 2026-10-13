# What to Do Next — retired

Supabase is not the account system. Accounts, progress, and Pro live on the Cloudflare Worker. Follow `ARCHITECTURE.md`. The steps below are historical and must not be repeated.

---


You’ve already set the **Site URL** and **Redirect URLs** in Supabase. Here’s what’s left.

---

## Step 1: Get two “keys” from Supabase

1. In Supabase, click the **gear icon** (⚙️) in the left sidebar → **Project Settings**.
2. Click **API** in the left menu.
3. You’ll see:
   - **Project URL** — something like `https://abcdefgh.supabase.co`
   - **Project API keys** — find the key named **anon** **public** (a long string starting with `eyJ...`).
4. **Copy** the Project URL and the anon key. Keep them somewhere handy (e.g. Notepad).

---

## Step 2: Turn on “Email” login in Supabase

1. In Supabase, go to **Authentication** (left sidebar) → **Providers**.
2. Find **Email** and turn it **ON** (toggle to the right).
3. If your signup uses a **6-digit code** sent by email, also turn **ON** the option that says something like **“Confirm email”** or **“Email OTP”** (whatever your signup flow uses).
4. Click **Save** if there’s a Save button.

---

## Step 3: Put the keys into your website files

Your site has empty placeholders for the Supabase URL and key. You need to paste your real values into these files.

**What to paste (use your own values):**

- **Project URL** → replace the empty `''` in `window.SUPABASE_URL = ''`
- **Anon key** → replace the empty `''` in `window.SUPABASE_ANON_KEY = ''`

**Example (yours will be different):**

```js
window.SUPABASE_URL = 'https://abcdefghijk.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxx...';
```

**Files to edit (open each file, find the two lines, paste your URL and key):**

| # | File | What you’ll see |
|---|------|------------------|
| 1 | `auth/login.html` | Two lines: `window.SUPABASE_URL = '';` and `window.SUPABASE_ANON_KEY = '';` |
| 2 | `auth/signup.html` | Same two lines |
| 3 | `auth/verify.html` | Same two lines |
| 4 | `auth/reset-password.html` | Same two lines |
| 5 | `auth/profile.html` | Same two lines |
| 6 | `index.html` | One line: `window.SUPABASE_URL='';window.SUPABASE_ANON_KEY='';` — put your URL and key between the quotes |
| 7 | `learning-path.html` | Same as index |
| 8 | `pricing.html` | Two lines (same as auth pages) |
| 9 | `projects.html` | One line (same as index) |
| 10 | `founder.html` | One line (same as index) |
| 11 | `data-adventure.html` | One line (same as index) |
| 12 | `pipeline-designer.html` | One line (same as index) |

**Why so many files?**  
The auth pages (1–5) need the keys so Login and Sign up work. The other pages (6–12) need them so the “Login” and “Sign up” buttons in the top bar work when someone is on the main site.

**Tip:** Use **Find** (Ctrl+F or Cmd+F) in each file and search for `SUPABASE_URL` to jump to the right place.

---

## Step 4: Save and upload

1. Save every file you edited.
2. Upload the updated files to your server (or push to Git if your site deploys from there) so **https://datafordummies.in** serves the new version.

---

## Step 5: Test

1. Open **https://datafordummies.in/auth/signup.html**.
2. Enter a name, email, and password and try to sign up.
3. If you use email OTP, check your email for the code and enter it on the verify page.
4. Then try **https://datafordummies.in/auth/login.html** with the same email and password.

If the forms load and you can sign up or log in without errors, you’re done.

---

## If something doesn’t work

- **“Redirect URL not allowed”**  
  Double-check in Supabase → Authentication → URL Configuration that **Redirect URLs** include exactly:  
  `https://datafordummies.in/auth/verify.html`, `https://datafordummies.in/auth/profile.html`, and `https://datafordummies.in/**`.  
  Click Save.

- **Login/Sign up page is blank**  
  Make sure you’re opening the site at **https://datafordummies.in** (not `file://`).  
  Check the browser console (F12 → Console) for errors.

- **No verification email / code**  
  In Supabase go to **Authentication → SMTP** and set up an SMTP provider (e.g. Resend) so Supabase can send emails. Otherwise the free tier has strict limits.

---

## Quick checklist

- [ ] Copied **Project URL** and **anon** key from Supabase → Project Settings → API  
- [ ] Turned **ON** Email (and Email OTP if needed) under Authentication → Providers  
- [ ] Pasted URL and key into **auth/login.html**, **auth/signup.html**, **auth/verify.html**, **auth/reset-password.html**, **auth/profile.html**  
- [ ] Pasted URL and key into **index.html**, **learning-path.html**, **pricing.html**, **projects.html**, **founder.html**, **data-adventure.html**, **pipeline-designer.html**  
- [ ] Saved all files and updated the live site at https://datafordummies.in  
- [ ] Tested signup and login on https://datafordummies.in  

That’s it. Your Supabase URL config is already correct; the rest is adding the two keys everywhere they’re needed and turning on Email login.
