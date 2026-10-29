# Protected API (deployment not activated)

Run `node server/index.mjs` with Node 24 behind HTTPS on an existing server. It binds localhost:8787. No paid Firebase Functions are deployed.

SMS routes use an adapter endpoint (`SMS_ENDPOINT`, `SMS_TOKEN`) and a server-only `OTP_HMAC_SECRET` of at least 32 characters. Codes expire after 5 minutes, allow 5 attempts, and are HMAC hashed; sends are limited by phone and trusted socket IP. Behind a reverse proxy the socket IP limit is shared; do not trust arbitrary forwarded headers. Provider delivery and end-to-end recovery are not production verified.

Server configuration: Application Default Credentials for the existing Firebase project (`GOOGLE_APPLICATION_CREDENTIALS` outside the repository); `PARTFLOW_ORIGINS`; optional `AI_ENDPOINT`, `AI_TOKEN`, `AI_MODEL`; `ANDROID_FIREBASE_APP_ID` for Android App Check. Build the client with `VITE_API_BASE` after verifying HTTPS, rules and provider access.

Implemented routes: ai-draft / ai-confirm (durable expiring draft and transactional confirmation), referral-code / referral-attach / reward, promotion-create / promotion-approve, voucher-redeem / voucher-use. All require Firebase ID tokens, flags and per-user rate limiting. Rewards require a verified email account pending device-level anti-abuse integration. Never activate referral incentives for anonymous accounts without that integration. VIP entitlements, identity bootstrap, complete partner/customer reward UI, promotion statistics are NOT implemented. Account duplication cannot be ruled out with email alone.

AI is for parts requests; service booking requires additional integration. Existing approved-shop matching and real-time offer listeners serve AI-created requests. VIN decoding is not provided by this API; only an owned garage vehicle can be supplied. No payment handling.

Do not mark rollout complete until:
- Deploy and emulator-test Firestore rules with privileged Firebase access (GitHub Pages does not deploy rules).
- Deploy API on an approved existing host and configure model access.
- Complete native attestation-to-UID bootstrap; standard WebView/UA detection is insufficient. No endpoint currently grants `apkVerified`.
- Configure signed sideload APK attestation and verify release signing/update continuity on a real device. Firebase Anonymous Auth remains disabled.
- Implement missing modules and end-to-end/concurrency tests before enabling their flags.

This directory is server-only. Never bundle credentials or service modules into the website.
