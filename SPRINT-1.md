# Sprint 1: auto services

## Verified baseline

Inspected main at `22f48baa0c5bb0836bcf184ca56df9b0228292c9` before editing.
React 19 / TypeScript, Vite standalone HTML output, Firebase Auth + Firestore,
Capacitor Android. Source lives in `src/`; `entries/` are build inputs. Root panel
HTML files are generated artifacts and must be rebuilt together.

`pf_members/{uid}` roles: customer, admin, superadmin. Business ownership is
independent of member role. `pf_shops/{uid}` supports one business per account.
Existing collections include requests, offers, orders, confirmations, messages,
chat activity, private panel archives, garage vehicles and device tokens.
Founder bootstrap requires the existing verified email; this sprint does not
change role assignment or authentication.

## Behavior and schema

- `businessType`: `parts_shop` or `auto_service`. Missing means legacy parts shop.
- Legacy parts shops retain pending/approved/suspended and existing moderation.
- Service registration uses `pending_approval`. Only superadmin can approve,
  reject, request clarification or suspend. Rejection/clarification/suspension
  require a reason. Review stamps contain server time and authenticated actor.
- Owner edits return a service to pending approval, preserve original creation
  time and review metadata, and cannot change owner or business type. The owner
  can correct and resubmit rejected/clarification applications.
- `reviewReason` (max 1000), `reviewedBy`, `reviewedAt` are protected together.
  Approval clears the reason. Pending/rejected service details are visible to
  their owner and administrative users. Normal admins can inspect applications
  but cannot moderate services.
- `services.html` is an unauthenticated directory. Its exact query is
  businessType == auto_service AND status == approved, createdAt descending,
  limit 300. The new composite index supports that query. Approved business
  records contain business contact details; do not store private documents in
  this collection. Reviews are visible on the approved document with a blank
  reason; this sprint retains the latest review, not a full audit history.
- Approved services do not receive private parts requests or submit parts offers.
  Booking is a later sprint. Existing shops, commerce, chat and garage retain
  their authorization and schemas.
- Registration: open `shop.html?businessType=auto_service`, create/sign in to an
  account, open business profile and submit specialization/contact details.
  One account cannot simultaneously own a parts shop and service in this model.

## Migration and release

Migration is optional for compatibility. `GCLOUD_PROJECT` must be explicit;
credentials use Firebase Admin's standard application credentials. Run
`npm run migrate:business-types` to count missing types without writes, then
`npm run migrate:business-types -- --apply` after reviewing the target and backup.
Each document is re-read in a transaction; only a missing businessType is added.
Existing types and all approval statuses remain unchanged. Re-running is safe.

Release order: back up Firestore; review emulator results and the diff; deploy
indexes and wait until ready; deploy rules; publish rebuilt HTML; optionally run
the migration. No migration or deployment is performed as part of this change.
An old client cannot edit service profiles under these rules. Rollback must keep
the new rules while service documents exist, since old rules reject their schema.
Revert UI separately; do not broadly loosen rules or delete live businesses.

## Verification

`npm run check`, `npm run build:mobile`, `npm run test:business`,
`npm run test:push`, `npm run test:install`; Firestore emulator:
`npm run test:rules`. CI includes service rules and actual migration dry-run,
apply and repeat tests alongside existing commerce/chat/garage regressions.

Adversarial tests cover self-approval, normal-admin approval, anonymous pending
reads, broad public queries, owner spoofing, type switching/removal, timestamp
forgery, metadata tampering, oversized/missing/unknown fields, protected deletion,
and service access to parts requests. Emulator compilation validates rule syntax.
Unaffected collections remain governed by their existing validators and tests.

## Next sprints (payments disabled)

1. Booking: service-owned staff, service catalog, duration and working hours,
   exceptions/time off, timezone, customer garage vehicle references. Reserve a
   deterministic staff/time-slot lock in a transaction to prevent double booking.
   Customer requests; service confirms/rejects; customer cancels; preserve
   immutable participants and append state-change events. Only approved services
   can accept new bookings. Scope chat to booking participants. Add concurrency,
   cancellation, suspension and timezone tests before public release.
2. Superadmin packages: versioned package catalog with limits and enabled
   capabilities; business entitlements with packageId, startsAt, trialEndsAt,
   endsAt, grantedBy and reason. Grants/extensions are superadmin-only and
   audited; derive eligibility server-side from timestamps. Define expiry grace
   behavior without hiding or deleting existing orders, chats or bookings.
3. Keep trial grants/manual entitlements independent of payment. No checkout,
   provider SDK, card data, subscription charge, payment webhook or automatic
   billing is enabled by this sprint or needed for these next stages.
