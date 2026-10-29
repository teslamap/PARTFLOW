# V2 implementation status — 2026-10-29

This commit is a tested partial implementation, not completion of the full requested rollout.

Implemented in source:
- Dedicated app.html entry using the existing mobile interface and persistence namespace; native customer WebView targets app.html. Authentication identity bootstrap remains blocked pending native/server integration.
- Expanded Firestore feature controls, dependencies, superadmin rewards settings, transactional immutable flag audit; legacy records are not migrated or deleted.
- Private unverified phone contact (phoneVerified:false), hidden until explicit compatible control configuration. New rules must be deployed first.
- AI parts-request conversation, owned garage selection, durable expiring summary, explicit confirmation, transactional retry deduplication; existing matching shops and realtime offers are reused.
- Protected Node backend with Firebase token verification, anonymous custom-claim and Android App Check checks, rate limiting, referral assignment and once-only transactional rewards, partner promotion submission/approval, transactional voucher issuance and use, points/month limits and order/category checks.
- SMS provider adapter, 5-minute HMAC codes, 5 attempts, per-phone/socket-IP sending limits, one-time verification, verified-phone-only account recovery preserving UID. No SMS provider activated.
- Push UI, token writes and sender now check the flag in source.

Still NOT complete:
- Trusted APK attestation-to-UID bootstrap and release/sideload proof; Anonymous Auth stays OFF and no endpoint grants apkVerified. app.html currently requires existing login, like the previous mobile entry.
- API hosting, Firebase Rules/Functions production publication, AI endpoint/secrets, SMS adapter credentials; no such deployment was performed by the code build. AI stays OFF.
- Stage 8 adds customer referral UI, share-link retention/explicit attribution and hardened once-only reward reconciliation. Partner/voucher UI and statistics remain stage 9 work; automated reward trigger is not deployed. Multi-account abuse prevention remains incomplete and incentives stay OFF.
- VIP entitlement module and email account-linking module. Their flags exist but these modules are not implemented.
- SMS/recovery frontend flows are implemented behind OFF/build gates in stage 7; real-provider verification remains pending.
- AI service booking (parts requests only), production AI quality validation and standalone VIN lookup.

Default requested optional features remain OFF. Payments were not enabled. Do not turn incomplete modules ON.

Validation: TypeScript, web/mobile build, foundation/flags/API denial tests; complete existing Firestore emulator regression suite; real emulator concurrency tests for rewards, voucher points/use limits and AI confirmation; OTP ownership, HMAC storage, replay and unverified recovery tests. CI runs these tests on main. These results do not establish production credentials, device attestation or provider integration.
