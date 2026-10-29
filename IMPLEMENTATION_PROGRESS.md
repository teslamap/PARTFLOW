# PARTFLOW V2 implementation progress

Updated: 2026-10-29 (Asia/Dubai). Scope: **stage 1 only**.

## Continuation contract

Complete one stage, test, commit/push, check live deployment, report, then stop.
Ask: **1 მოვრჩი, გადავიდე მეორეზე?** Do not start stage 2 without the user's confirmation.
Use focused reads and small changes (TOKEN-SAVER). Preserve existing design, data and live behavior.

| Stage | Agreed scope | Status |
| --- | --- | --- |
| 1 | Audit and safe foundation | Implemented; local checks passed; deployment/CI verification pending |
| 2 | GOD MODE flags, live config, kill switch, maintenance, audit/rollback | Not started; requires confirmation |
| 3 | Web/APK auth, anonymous UID persistence, trusted Android identity | Not started |
| 4 | Orders, matching, offers, real-time updates and chat | Not started |
| 5 | Cloudflare AI assistant and confirmed order creation | Not started |
| 6 | Garage, VIN and profile | Not started |
| 7 | In-app notifications and disabled recovery/push/SMS channels | Not started |
| 8 | Disabled referrals, points and anti-fraud | Not started |
| 9 | Disabled vouchers, partners and monetization | Not started |
| 10 | Full operational GOD MODE and final regression | Not started |

## Stage 1 audit

Audited baseline: `f8767deb46b0db0782eb643289b9428d62146429` on `main`.
No repository `AGENTS.md` was present.

- **Source/build:** React 19, TypeScript, Vite 8, Firebase; `entries/` and `src/` are editable sources. `build-tools/standalone-html.ts` generates self-contained root HTML and `dist/`. Regenerate and commit root HTML with source changes. Existing large-bundle warning is expected for standalone pages.
- **Firebase:** existing project `menio-8de8f`; `.firebaserc`, hosting config, rules and indexes agree. Public Firebase client identifiers are not server credentials. Emulator connections remain DEV-only. Rules end in default-deny and enforce user/participant/admin access. No production rules, indexes, providers, documents or project settings were changed. Deployed rules/provider state cannot be inferred from repository configuration alone.
- **Auth:** `src/auth-session.ts` creates stable named Firebase apps per panel. Desktop uses session persistence; mobile uses local persistence. Google/email login is implemented. `index.html` redirects to `customer.html`; demos are explicitly isolated. `firebase.json` declares anonymous auth false and source has no anonymous login. Founder privilege is tied to a verified allowlisted email in client and rules; changing it requires coordinated review.
- **APK:** customer WebView package `com.partflow.customer`, HTTPS/host/path restrictions, DOM storage, remote `mobile-customer.html`, and `PartflowAndroid/2` user-agent marker. There is no `app.html`. User-agent detection is a UI/persistence hint, not trusted server identity. Anonymous auth and native identity attestation remain stage 3. No APK rebuild, native behavior change or device validation in stage 1.
- **Requests/orders:** `src/data.ts`, `src/live-data.mjs`, `src/offer-write.mjs`, `src/commerce.mjs` and rules cover UID ownership, approved shops, deterministic offer/order IDs, transactions and participant-scoped listeners. Existing behavior is retained; full V2 lifecycle review belongs to stage 4.
- **Chat:** `src/chat-workflow.mjs` and workspace UI use offer/request participants, transactional messages/activity, admin participation and confirmation records. Rules and emulator tests cover access and workflow. No messages or retention settings changed.
- **Notifications:** existing inbox and optional Capacitor/FCM code already exist; `functions/` deploys separately via `firebase.push.json`. The remote-only customer WebView excludes the Capacitor bridge. Do not describe native push as verified or activate it without the stage 7 review.
- **Deployment:** `.github/workflows/publish-pages.yml` builds `dist/` on relevant `main` changes and deploys GitHub Pages. Android workflows have separate path filters. `.github/workflows/test.yml` runs build/type checks and Firestore emulator regression. Firebase Hosting is a secondary deployment and is not updated by the Pages workflow.
- **Baseline live:** primary index, customer and mobile pages and secondary Firebase Hosting index returned HTTP 200 with PARTFLOW content. Baseline Pages and test workflows succeeded for the audited SHA. This is an HTTP/artifact check, not a real-user login or production order/chat mutation test.

## Stage 1 changes

- `src/runtime-config.mjs`: frozen public Firebase settings and existing entry-point metadata. `src/firebase.ts` consumes the exact same Firebase values; auth app names and persistence are untouched.
- `src/feature-flags.mjs`: immutable V2 defaults, four reserved state names, unknown-key denial and no client override or network loading. Every new feature is OFF. This is scaffolding, not a functioning GOD MODE or backend authorization system. Existing orders/chat/auth/push are not rerouted through these new flags.
- `tests/foundation.mjs`: checks project/entry-point continuity, disabled V2 features, inherited/unknown keys and immutability. Added to existing CI.
- Generated root HTML refreshed using the existing build pipeline.
- This progress file records the handoff and explicit stage boundary.

## Validation and release evidence

Local PASS: TypeScript (`tsc --noEmit`), production Vite build, mobile asset preparation, foundation, business/migration policy, push payload, installation and catalog tests; `git diff --check`.
Dependencies installed with `npm ci` from the unchanged lockfile. No dependency upgrade.
Local Java is unavailable, so Firestore emulator regression is delegated to the existing GitHub Actions test job; it must pass before stage 1 is reported complete.

Implementation commit and final CI/live evidence will be recorded in the stage 1 verification follow-up commit. A commit cannot embed its own SHA; use that follow-up or Git history for the final documentation SHA.

## Remaining work / exact next step

Finish stage 1 release verification, record the implementation SHA and deployment/test results, then stop and ask the required Georgian question. After explicit approval only, start stage 2 by designing privileged config storage, validation, server enforcement, audit and rollback. Do not treat client flags as security controls or enable any paid/external service.
