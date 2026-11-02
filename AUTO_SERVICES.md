# Auto-service accounts and orders

Existing parts shops can add multiple auto-services from **Shop profile → My auto-services**, using their current Firebase Auth session. Each branch has a `service_`-prefixed auto-generated `pf_shops` document ID (separate from Auth account IDs), immutable `ownerId` and `parentShopId` equal to the shop account UID. Each application requires its own superadmin approval; the shop's existing approval never approves its branches.

Independent services register/sign in using the existing email/password or Google Firebase Auth flow at `shop.html?businessType=auto_service`, then submit their business profile. Their business ID remains their account UID, without `parentShopId`.

New submissions use `pending`. Existing `pending_approval` applications remain compatible. Only a superadmin may set `approved`, `rejected`, `needs_clarification` or `suspended`, with review identity, server timestamp and a reason for non-approval. Profile edits return non-suspended services to pending. Owners cannot bypass suspension by resubmitting. Setup data can be prepared privately before approval. Only approved services and active setup records are public.

Service orders are isolated at `pf_shops/{businessId}/serviceOrders/{orderId}`, separately from the existing parts commerce collections. Required fields: `businessId`, `customerId`, `description` (1–2000 characters), `status`, `createdAt`, `updatedAt`. Customers submit pending requests only to approved services; an owner accepts and then completes them. Customers/owners can cancel pending or accepted requests. Suspended services cannot receive or accept/complete requests; customers retain history and cancellation. Superadmins can inspect/manage service orders; ordinary admins and other businesses cannot read them. Identity, content and creation time are immutable; terminal orders cannot be reopened or deleted. These are service requests, not reserved appointment slots.

Customers see their service-order history, including suspended businesses, in the services page. A collection-group index on `serviceOrders.customerId` supports that private history. Shop owners switch branches to manage setup and orders. Superadmins use the existing businesses screen for review and expandable service-order management.

No payment processing, billing flags, prices, existing monetization, parts requests/offers, or Auth providers are changed. No production data migration is required.

## Verification

- `npm run check`
- `npm run build` (also regenerates the repository's standalone HTML pages)
- `npm run test:business`
- `node tests/foundation.mjs`
- `npm run test:rules` against the local Firestore emulator
- Firebase rules compilation with `deploy --only firestore:rules --dry-run`

`tests/owned-services.mjs` exercises multi-branch and independent creation, absent/foreign parent denial, pending/private visibility, owner queries, superadmin-only reviews, immutable ownership/parent/type/timestamps, malformed/oversized/missing/extra fields, role escalation denial, cross-business and cross-customer order access, unfiltered collection/group query denial, suspension, cancellation, valid/invalid state transitions, terminal protection and orphan creation denial. Expected denied writes produce emulator permission-denied messages; assertions require those denials.

Existing rules regressions cover parts commerce, archive/restore, realtime subscriptions, service setup, migration preservation and chat/deletion workflows.
