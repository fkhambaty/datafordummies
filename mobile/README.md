# Data For Dummies for iOS and Android

Phone and tablet app for the lessons on [datafordummies.in](https://datafordummies.in). It uses the same account and the same saved progress as the website. It does not sell Pro.

Package id: `in.datafordummies.app`

The website in the parent folder is unchanged. How the app fits the site is in [`../docs/MOBILE_ARCHITECTURE.md`](../docs/MOBILE_ARCHITECTURE.md). Building and store limits are in [`../docs/MOBILE_RELEASE.md`](../docs/MOBILE_RELEASE.md).

## Run it

```bash
npm install
npx expo start
```

Expo Go can open the JavaScript, but the keychain session and the lesson WebView need a development build (`npx expo run:ios` or `npx expo run:android`) because those modules are not all inside Expo Go.

## Checks

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run doctor
```

`npm run check` runs all four.

## Regenerated files

```bash
npm run sync:catalog   # src/data/catalog.json from ../data/course-catalog.json
npm run assets         # icon and splash from ../logo.png
```

Run `sync:catalog` after `python3 ../scripts/build_learning_platform.py`. The catalog test fails if the two files drift.
