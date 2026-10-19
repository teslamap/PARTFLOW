# PARTFLOW customer Android

The independent `mobile-customer.html` uses the existing Firebase backend. Its named Firebase app has its own persistent login. Other HTML panel sessions remain separate. Requests and offers are filtered to the signed-in customer's UID even when that account also has admin rights.

## Build

GitHub Actions workflow `.github/workflows/android-apk.yml` builds an installable debug APK on relevant pushes to `main` or a manual run. It uses the GitHub runner's already-installed Android SDK and publishes the verified APK plus checksum as the `PARTFLOW-customer-APK` artifact. No Firebase admin keys or release signing secrets are needed. This debug APK is for direct testing; store publication requires a separate release signing setup. Each fresh runner generates its own debug key, so APKs from different runs may require uninstalling the previous test app before installing.

The workflow regenerates `android/` with Capacitor, then applies committed `android-overrides/` (PARTFLOW icon, splash and manifest). This keeps the native customizations reproducible without committing generated binaries. For local regeneration, copy `android-overrides/` into `android/` after `npm run android:setup`.

Node 24.12+ with npm 11.6.2 and Android Studio with the Android SDK/JDK required by the installed Capacitor version are required. Install with `npm ci`, then:

```sh
npm run android:sync
npm run android:open
```

For first setup only, if `android/` is absent, run `npm run build:mobile` then `npx cap add android` before sync. Android Studio can generate a debug APK or a signed release. Keep signing keys outside this repository. The application ID is `com.partflow.customer`; choose the final ID before publishing.

The build embeds the complete mobile HTML as `dist-mobile/index.html`; there is no remote `server.url`. Internet is needed for Firebase authentication, requests, offers and submission. The interface starts from bundled assets. Do not assume an offline mutation queue; send buttons are disabled when offline. Email/password login, registration, password reset and verification use Firebase. Native Google sign-in is deliberately absent until a native provider, Firebase Android app, SHA fingerprints and configuration are installed.

Safe-area padding, keyboard-friendly form controls, file input photo selection/compression, Android back navigation and foreground data refresh are included. Offers refresh every 60 seconds while visible, on app resume, or by the refresh button. Photos use the existing Firestore compressed JPEG mechanism (four photos maximum); no paid Storage dependency was added.

Before release: test on a real Android device (login survives restart, logout, requests, gallery/camera picker, offer acceptance, password reset deep links/external mail, offline recovery and back button), configure icons/splash, app signing, privacy policy and store listing. No signed APK is included in the source archive.
