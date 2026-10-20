# PARTFLOW live customer Android

One APK, customer panel only. MainActivity opens exactly https://teslamap.github.io/PARTFLOW/mobile-customer.html in an Android WebView. It does not load bundled HTML or instantiate a Capacitor bridge. Shop/admin/superadmin URLs and other origins are blocked inside the app. No native JavaScript interface is exposed.

Website changes reach this APK when the page is loaded again, without reinstalling it. Initial loading bypasses the WebView cache; reopening after more than one minute in the background also reloads the page unless a modal or focused form is active. Firestore snapshot listeners update requests, offers, acceptance and moderation while the page is open, without reloading or losing forms. This is not background push notification support. Internet is required; failed page loads show a retry screen.

The customer has its own persistent Firebase Auth session. Web panels keep their independent sessions and have no cross-panel navigation links. Existing accounts and backend security roles remain shared in Firebase. Native WebView email/password sign-in is supported; Google popup sign-in is not used in the app.

## Build

The GitHub Actions Android workflow uses the runner's existing SDK, Node 24 and Java 21. It generates the scaffold, applies android-overrides/ via build-tools/prepare-live-android.mjs, compiles and verifies PARTFLOW-customer-live.apk, then uploads PARTFLOW-customer-live-APK with checksums. No Firebase admin secrets are needed. Application ID: com.partflow.customer. Version: 2.0. Minimum Android: 7.0 (API 24).

For local setup use Node 24.12+, npm 11.6.2, JDK 21 and Android SDK 36:

    npm ci
    npm run android:setup
    node build-tools/prepare-live-android.mjs
    cd android
    ./gradlew assembleDebug

On Windows use gradlew.bat. If android/ already exists, use npm run android:sync before preparing the live wrapper instead of android:setup.

The artifact is a debug/testing APK. Fresh GitHub runners generate different debug signing keys; replacing an older test build may require uninstalling it once. Subsequent website-only updates do not require installing another APK. Native permission/feature changes still require a new signed native build. Store publication requires persistent release signing keys and device testing.

Photo file selection, TLS error cancellation, HTTPS-only navigation, safe insets, back-to-close-modal behavior, and retry after offline launch are implemented. Before public release, verify sign-in persistence, gallery upload, keyboard, offline recovery and back navigation on real Android devices.
`nWebsite-only pushes publish GitHub Pages without rebuilding this APK. The Android workflow runs for native wrapper/dependency/config changes or a manual run.
