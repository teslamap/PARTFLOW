# First structural batch — 2026-10-30

## Release scope

Source implementation is ready for the existing main/Pages pipeline. **New product features remain OFF. No production backend, billing, rules or indexes were deployed.** The user explicitly requested leaving the features disabled until billing is arranged.

Architecture audit: baseline main `333abbddf81e23c88860aa24452b001c94fd7296`; React/Vite standalone entry points, Firebase Auth and Firestore. Existing request/offer/order/chat collections and UI flows are retained. The protected Node API was not hosted. The connected PARTFLOW Firebase project is `menio-8de8f`; read-only checks confirmed billing is disabled, no accessible billing accounts exist, and Cloud Functions API is disabled. No repository AGENTS.md was present. Existing Firestore default-deny rules already deny every new batch collection, including nested offers/messages. No rule broadening is needed.

## Implemented

- One-shot phone pickup coordinates, caller-selected supported city, destination address/city, phone and optional text notes. No driver GPS stream, availability toggle or automatic city expansion.
- SOS: only superadmin-registered, non-revoked drivers in the caller's city see open calls. Transactional acceptance has one winner. Private phone/precise pickup is released to the accepted driver; the customer receives that driver's contact. Customers may cancel an open request.
- Scheduled intercity: mandatory future device-local date/time, different supported cities, offers from registered drivers nationwide, positive integer GEL quotes, customer-only selection and one winning driver. Open offers cannot directly accept a scheduled job. Revoked drivers cannot submit, accept or be selected.
- Stable unique per-shop referral link and locally generated printable SVG QR. First-touch retention lasts 30 days. Scan statistics count deduplicated network/day visits, **not unique people**, and never earn discounts. Public scan receipts prove that a link visit preceded signup (five-minute clock tolerance). Verified new users explicitly attach attribution before their first request; changing a shop and self-referral are rejected.
- Monthly statistics use Georgian business months (UTC+4): scans, attributed signups, once-per-customer qualified genuine request creators. Qualifying creators require verified email, configurable account age, an independent superadmin authenticity review, and by default a linked independent approved-shop completed/non-disputed order. Shop accounts and self-review are excluded. Reconciliation is explicit/on demand; there is no automatic production trigger or claim of Sybil-proof identity. A creator qualifies once across their lifetime, in the month of successful qualification.
- Monthly fee quotes: default standard 100 GEL, discount at most 50 GEL and standard due at least 50 GEL. Superadmins can save individual positive monthly maxima for approved shops or auto services (100/50/10/etc). For every nonstandard fee, discounts remain disabled until a positive minimum payable amount is explicitly configured. No zero subscription, payment collection, invoice issuance or billing provider has been introduced.
- Separate text-only customer/shop-to-superadmin support conversations, open/pending/closed status, transactional idempotent messages, recipient unread counts and race-safe read receipts. Thread/message pagination is available. Inbox counts poll every 30 seconds; message contents refresh on demand. Existing order chat is unchanged.
- Verified superadmin-only policy/fee/driver/authenticity controls, append-only server audit records, existing maintenance switch respected. All batch collections are API-only. No attachment endpoints or client-side privilege grants.

## Validation

Local: TypeScript, web build and mobile asset preparation; foundation/feature/API-denial/referral/notification regression; pricing/date/city policy tests; isolated HTTPS function package dependency install/import. Firestore emulator tests cover existing rules, commerce, order-chat workflow, auto-service, rewards/AI transactions and OTP, plus the new SOS race/city isolation, intercity choice, support privacy/idempotency/read races, referral uniqueness/proof/fees and denied client get/list/create/update/delete for all new collections. The new suites are included in CI. A large standalone bundle warning is inherited from the existing build strategy.

## Prepared hosting (not activated)

`firebase.batch.json` defines a **separate** `partflow-batch-api` codebase. `node build-tools/prepare-api.mjs` copies an allowlist of server/shared source into ignored `api-runtime/`, with locked dependencies; no credentials, .env, UI bundles or existing push functions are uploaded. The HTTPS function accepts only batch routes, Firebase tokens (except non-incentivized scans), configured PARTFLOW origins and bounded bodies. It uses the platform service account rather than a downloadable private key. Region europe-west1, zero minimum instances, one maximum instance, 256 MiB memory, concurrency 20 and 60-second timeout. These limits do not guarantee zero cloud charges.

After the user arranges billing and requests activation:

1. Prepare/install the package: `node build-tools/prepare-api.mjs` then `npm ci --prefix api-runtime`.
2. Deploy only this codebase: `firebase deploy --project menio-8de8f --config firebase.batch.json --only functions:partflow-batch-api`. Do not deploy or delete the separate push codebase.
3. Publish the two new `pf_batch_transport` indexes using the existing index configuration, preserving unrelated production indexes. No new client security rule permissions are required.
4. Verify anonymous denial, verified superadmin controls, default OFF, allowed-origin/size enforcement and private participants at the returned HTTPS endpoint.
5. Set the public GitHub repository variable `PARTFLOW_BATCH_API_BASE` to the actual deployed function URL and rerun Pages. The workflow reads this into `VITE_BATCH_API_BASE`. Existing `VITE_API_BASE` remains independent. Without an endpoint the new UI stays hidden.
6. In the superadmin panel register approved drivers, review policies and fee floors, then enable only the agreed switches. Run a small authorized real-device pickup/offer/support/referral trial before broader activation.

Pending: actual API/index deployment, endpoint configuration, production/browser/device end-to-end verification and feature activation. VIN OCR, automatic city expansion, payment integration and existing deferred AI/SMS/attestation work are excluded. No production customer/order/chat data was modified.
