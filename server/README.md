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

## Stage 5 Cloudflare configuration

The protected Node API requires an existing HTTPS host and Firebase Application Default Credentials. Workers AI supplies inference; this Firebase Admin API is not a Worker.

Set server-only CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Workers AI permission) and AI_MODEL. The adapter calls https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1/chat/completions. AI_ENDPOINT and AI_TOKEN overrides remain supported; HTTPS is required. Never put provider tokens in VITE variables.

Reference: https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/

Before enabling: deploy the protected API with Firebase credentials and allowed origins, verify provider access and Georgian output, build VITE_API_BASE with the HTTPS API address, then test clarification, summary, confirmation, retries, expiry, cross-user denial and existing matching/offers. Only then enable aiOrderAssistant. Service booking and VIN decoding remain unsupported.

## Stage 7 channel rollout

Defaults remain OFF. In-app notifications require no SMS/push provider and use private Firestore receipts. Phone verification UI requires smsOtp + phoneContact and VITE_API_BASE. Public customer recovery UI additionally requires VITE_PHONE_RECOVERY=1; backend phoneRecovery and smsOtp must both be ON. The build switch only controls visibility and never authorizes recovery. Configure/verify HTTPS API, SMS adapter and OTP_HMAC_SECRET before building this switch; test same-UID recovery, expiry, replay, wrong-owner and flag-off behavior with a real provider. Keep the switch unset until these checks pass. Existing email-password reset remains available.

Push requires its separate Firebase Functions deployment, Android FCM credentials, user permission and pushNotifications=ON; registration source alone does not establish delivery. No production channel activation was performed in stage 7.
