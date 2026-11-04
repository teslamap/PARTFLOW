# PARTFLOW Customer — Native Android (WIP)

Kotlin + Jetpack Compose; **no WebView**. Customer mobile web reference: `src/mobile-customer.tsx` and `src/mobile-customer.css`.

## Single master task
[GitHub Issue #4 — Complete customer APK, including chat, towing, map and remaining features](https://github.com/teslamap/PARTFLOW/issues/4).

All customer functionality is **in scope** of this same task. Do not mark complete until APK builds, installs, runs, passes feature tests, and visual parity is verified against the original mobile customer web UI. Target 100% parity; minimum visual similarity 90% only after actual comparison.

## Current implementation
- Native Compose navigation, auth UI, request/offer lists, garage list, profile shell.
- Firebase Auth service and Firestore owner-scoped listeners.
- Native request and garage vehicle create forms and Firestore writes.
- **Not yet confirmed:** successful APK build, Firebase integration tests, Android device run.
- **Not yet completed:** native chat, SOS/intercity towing, map, archive, offer confirmation, complete vehicle catalog, media uploads, profile editing, feature flag handling and visual 1:1 verification.

## Build
GitHub Actions workflow `.github/workflows/native-customer-debug.yml` or JDK 17 + Android SDK 35 + Gradle 8.9: `cd native-customer && gradle assembleDebug`.

Keep the existing live web app and other roles untouched. Never expose customer requests publicly.
