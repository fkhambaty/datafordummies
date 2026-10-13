# Android APK — not stored in this repository

The live download is the Google Drive folder in `docs/APK_RELEASE.md`. Do not commit `app-debug.apk` or `apk/FK-Learning-Hub.apk`. The steps below are the old copy-into-git instructions and are not the current release path.

---


The "Get Free Android App" link must point to a real APK file. Use **one** of the options below.

---

## After building the APK in Android Studio (do this every time you rebuild)

From the **repo root** (parent of `Website/` and `Android_App/`), run:

```bash
./copy_apk_to_website.sh
```

This copies `Android_App/app/build/outputs/apk/debug/app-debug.apk` to `Website/apk/FK-Learning-Hub.apk` so the website download link works. Then commit and push (or upload to Releases) as in Option 1 or 2 below.

---

## Option 1: Host APK in This Repository (Simplest)

**Steps:**

1. **Build the APK in Android Studio**
   - Open the project: `FKTI/Android_App` (or `FKTI_Android_App` in Downloads).
   - Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   - Wait for "APK(s) generated successfully". Click **locate** in the notification (or find it under `Android_App/app/build/outputs/apk/debug/app-debug.apk`).

2. **Copy APK into the website**
   - Run from repo root: `./copy_apk_to_website.sh`  
   - Or manually copy `app-debug.apk` to:
     ```
     Website/apk/FK-Learning-Hub.apk
     ```
   - So the file on disk is: `.../FKTI/Website/apk/FK-Learning-Hub.apk`.

3. **Link is already set**
   - The homepage link is: `apk/FK-Learning-Hub.apk`.
   - When you deploy the site (e.g. GitHub Pages, Netlify), the APK is served from the same origin and the download works.

4. **Commit and push**
   - `git add Website/apk/FK-Learning-Hub.apk`
   - `git commit -m "Add Android APK for download"`
   - `git push`

**Note:** Some hosts (e.g. GitHub Pages) may not allow large binary files; if the APK is blocked or slow, use Option 2.

---

## Option 2: Host APK on GitHub Releases (Recommended for large files)

**Steps:**

1. **Build the APK** (same as Option 1, step 1).

2. **Create a new release on GitHub**
   - Open your repo on GitHub (e.g. `https://github.com/YOUR_USERNAME/YOUR_REPO`).
   - Click **Releases → Create a new release** (or **Draft a new release**).
   - **Tag:** e.g. `v1.0.0` (choose a version).
   - **Title:** e.g. `FK Learning Hub – Android App v1.0`.
   - **Description:** optional (e.g. "Install the app for offline access to the courses.").

3. **Upload the APK**
   - In the same page, under **Attachments**, drag and drop your `app-debug.apk` (or rename it to `FK-Learning-Hub.apk` and upload).
   - Click **Publish release**.

4. **Get the direct download URL**
   - On the release page, click the uploaded file (e.g. `app-debug.apk` or `FK-Learning-Hub.apk`).
   - The URL will look like:
     ```
     https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/FK-Learning-Hub.apk
     ```
   - Copy this **exact** URL.

5. **Update the website link**
   - Open `Website/index.html`.
   - Find the Android app download link (search for `apkDownloadLink` or `app-download-link`).
   - Replace the `href` value with the URL you copied, for example:
     ```html
     <a href="https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/FK-Learning-Hub.apk" class="app-download-link" id="apkDownloadLink" download>
     ```
   - Save, commit, and push.

6. **Update the Android app’s bundled page (if it has its own copy of the link)**
   - If your Android app ships a copy of `index.html` in `assets/web/`, update the same `href` there to the GitHub Releases URL so in-app "Get Android App" also works when the user has internet.

---

## Why you saw "YOUR_GITHUB_RELEASES_URL_HERE.html – File wasn't available"

The link was still the placeholder `YOUR_GITHUB_RELEASES_URL_HERE`. The browser tried to open that as a path (or URL), got an HTML page instead of the APK, and showed "File wasn't available on site."

**Fix:** Either put the real APK at `Website/apk/FK-Learning-Hub.apk` (Option 1) or set the link to your GitHub Releases URL (Option 2) as above. After that, "Get Free Android App" will download the APK correctly.

---

## Android app (in-app download)

If you ship the same site inside the Android app (e.g. from `assets/web/`), the "Get Free Android App" link uses the same `href` (e.g. `apk/FK-Learning-Hub.apk`). For the download to work **inside the app**:

- Put a copy of the APK at:  
  `Android_App/app/src/main/assets/web/apk/FK-Learning-Hub.apk`  
  so the WebView can resolve `apk/FK-Learning-Hub.apk` to that file.

Alternatively, set the link to your **live website URL** (e.g. `https://yoursite.github.io/apk/FK-Learning-Hub.apk` or your GitHub Releases URL) so when the user taps "Get Free Android App" in the app, the browser opens and downloads from the web.
