# PARTFLOW V2 implementation progress

Updated: 2026-10-29 (Asia/Dubai). Scope: **stage 1 only**.

## Continuation contract

Complete one stage, test, commit/push, check live deployment, report, then stop.
Ask: **1 მოვრჩი, გადავიდე მეორეზე?** Do not start stage 2 without the user's confirmation.
Use focused reads and small changes (TOKEN-SAVER). Preserve existing design, data and live behavior.

| Stage | Agreed scope | Status |
| --- | --- | --- |
| 1 | Audit and safe foundation | Complete: checked, committed, pushed and verified live |
| 2 | GOD MODE flags, live config, kill switch, maintenance, audit/rollback | Complete; deployed and verified |
| 3 | Web/APK auth, anonymous UID persistence, trusted Android identity | In progress; existing auth audited; Firebase Android app registered |
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
Local Java is unavailable; the full Firestore emulator regression passed in the existing GitHub Actions test job, including catalog, rules, archives, realtime isolation, commerce, shop panel, deletion, chat workflow, auto-service, migration and service management suites.

- Implementation commit: [`bc0468a8d6cdbb4a9b96f9b67b48932b1978d739`](https://github.com/teslamap/PARTFLOW/commit/bc0468a8d6cdbb4a9b96f9b67b48932b1978d739), pushed to `main`.
- Full CI: [40876269438](https://github.com/teslamap/PARTFLOW/actions/runs/40876269438), **success** for that exact implementation SHA.
- Pages publishing: [40876269405](https://github.com/teslamap/PARTFLOW/actions/runs/40876269405), **success**; branch Pages deployment [40876268801](https://github.com/teslamap/PARTFLOW/actions/runs/40876268801), **success**.
- Post-deployment primary live check: index and all six panels returned HTTP 200. Customer, mobile-customer, shop, admin, superadmin and services HTML matched the local production build after normalizing Windows/Linux line endings, including decoded embedded favicon content. Index matched directly. No login, production order or chat message was created during verification.
- Secondary Firebase Hosting was reachable at audit time; it was not redeployed. Android workflows were not triggered, as no native/package inputs changed.
- Final release record is this documentation-only follow-up. A commit cannot embed its own SHA; use Git history for this final documentation commit.

## Remaining work / exact next step

## Stage 2 complete

- GOD MODE added to the existing superadmin infrastructure page. Controls include OFF/TEST/LIMITED/ON, maintenance message, AI/APK/SMS/recovery/email/referral/points/voucher flags, config revision, and up to 20 visible audit entries with rollback.
- Firestore `pf_settings/control` is readable to signed-in users and writable only by verified superadmins; rules validate schema, exact flag keys/states, actor, timestamp, message and sequential revision. `pf_control_audit` is readable to superadmins, append-only, and has no client update/delete path. Existing infrastructure rule access remains unchanged.
- Each save or rollback uses a Firestore transaction to write a new revision and audit entry atomically. Stale edits are rejected.
- Production Firestore rules deployed successfully to `menio-8de8f` Standard `(default)` database.
- Stage 2 implementation: [`bdf0a021598c15bdd6027b0626827d0652dcb0f1`](https://github.com/teslamap/PARTFLOW/commit/bdf0a021598c15bdd6027b0626827d0652dcb0f1). Follow-up test expectation fixes: [`03c9c557c88b536a5c2001e98c768f6d97031c24`](https://github.com/teslamap/PARTFLOW/commit/03c9c557c88b536a5c2001e98c768f6d97031c24) and [`d4cb9a90a71d27c0e30351c087f77cec1cf143f9`](https://github.com/teslamap/PARTFLOW/commit/d4cb9a90a71d27c0e30351c087f77cec1cf143f9).
- Final full CI: [40879874141](https://github.com/teslamap/PARTFLOW/actions/runs/40879874141), **success**, including TypeScript, mobile production build, business, push, install, and all Firestore emulator regression suites.
- Pages workflow for final code: [40879634249](https://github.com/teslamap/PARTFLOW/actions/runs/40879634249), **success**. Live superadmin, customer and mobile pages return HTTP 200; the published pages contain the new GOD MODE UI.
- **Scope:** all new flags default OFF. This stage stores and distributes flags; it does not wire them into existing auth/order/chat flows or create backend endpoints for future features. Maintenance display, emergency shutdown of existing workflows, and feature-specific backend enforcement remain follow-up implementation before those functions are enabled.

**STOP: stage 2 is complete (2/10). Stage 3 has not started.** Ask the required Georgian question and wait for explicit approval.

## Stage 3 audit / checkpoint

- Existing web panels already require Firebase Auth, use independent named Firebase sessions, and scope records by UID. Mobile customer web auth already uses local Firebase persistence; signed-in requests/offers are filtered to the current UID.
- APK is a remote-only WebView and currently uses email/password. `PartflowAndroid/2` is only a user-agent hint for local persistence and hiding Google popup; it is spoofable and is not device attestation.
- Firebase anonymous provider is disabled in `firebase.json` and production. Do not enable automatic anonymous login until Firebase App Check is integrated/enforced for the actual Android app and UID ownership tests pass.
- Registered Firebase Android app `com.partflow.customer`, app ID `1:429553713786:android:d48cc58d5f40b8a64db1c3`; saved its public client config at `android-overrides/app/google-services.json`.
- Remaining stage 3 work: integrate Android Firebase SDK and App Check Play Integrity on the native wrapper; pass attestation into Firebase Web SDK through an origin-restricted bridge or migrate Firebase calls to native SDK; establish production attestation/enforcement; then enable anonymous auth, test persistence/ownership and retain existing web auth. Current debug APK has no Play Store release identity, so Play Integrity setup must be verified for its distribution track.
- No anonymous provider or production auth settings have been enabled. No APK build or emulator tests have been run for this checkpoint; tests are intentionally deferred until the stage is ready, per user's direction.
