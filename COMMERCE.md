# Chat, fulfillment and notification operations

No payment collection, checkout, ledger, financial transaction or billing-plan change is included. Existing Auth accounts, member roles, shop approvals, requests, offers and archives retain their schemas. Firestore Standard `(default)` in `menio-8de8f`, `eur3`, was verified through the Firebase API.

## User flows

Desktop panels have a **ჩატი / შეკვეთები** menu. Mobile has the same bottom-navigation item, plus a link from Profile. The workspace has Orders, Chat and Notifications tabs. Conversations are scoped to an existing request/offer and its customer/shop, including before selection. Administrators monitor conversations without impersonating a participant or sending messages on their behalf.

Selecting an offer atomically closes the request, creates `pf_orders/{requestId}`, and creates `events/0`. Repeating selection of the same offer returns the same order. Older selected offers have an explicit **create order from selected offer** action; no migration of existing records is required.

| Transition | Actor |
| --- | --- |
| Selected offer → confirmed | Request owner |
| confirmed → preparing → shipped → delivered | Selected shop or administrator |
| delivered → completed | Customer or administrator |
| confirmed/preparing → cancelled | Either participant or administrator |
| shipped/delivered → cancelled | Administrator, with reason |
| Open dispute | Either participant, once per order |
| Resolve dispute | Administrator, with resolution note |

Every change requires a comment and atomically creates a new, immutable versioned history event. Open disputes freeze participant fulfillment updates. Administrators can resolve the dispute or change the fulfillment status with a recorded reason. Completed/cancelled states cannot be reopened. History retains the actor UID, server time, reason, status and dispute state. Admins can search the order workspace by request ID, Georgian status or `დავა`.

## Data, access and notifications

- `pf_messages`: immutable, bounded plain text linked to an immutable offer; only the two participants and administrators may read. Admin chat is read-only. No HTML rendering or client-authored notification payloads.
- `pf_orders` and nested `events`: immutable participant/offer identifiers; monotonic version; server timestamps. Rules require the matching event in the same atomic write. Events cannot be edited or deleted, including by client administrators.
- Notifications are derived from actual incoming messages, received offers, and the latest order state. Private `pf_inbox/{uid}/receipts/{sourceKey}` markers synchronize read state across sessions. Opening an item marks it read and opens its chat/order. The inbox is a bounded recent activity view (100 incoming messages / 300 orders and offers), not a permanent notification log. Full fulfillment history remains under each order.
- `pf_devices/{uid}/tokens/{sha256}`: private Android tokens; only the owner can register, read or remove. Server SDK sends Push. Other users and client administrators cannot read tokens. Logout removes the stored device registration before signing out and unregisters native Push.
- Queries have matching composite indexes. Chat uses offer ID plus participant filters; administrators use offer ID alone. Unmount/sign-out unsubscribes listeners; user/role changes remount the workspace and clear prior results. New text/token fields are excluded from indexing.

Rules/index deployment is independent of GitHub Pages deployment. The commerce rules and indexes were deployed to the existing project; production user records were not migrated, seeded or deleted.

## Android Push readiness

The existing v2 remote WebView deliberately has no native bridge. It supports all in-app chat/order functionality but cannot register native Push. `npm run android:push:setup` creates an **opt-in v3 Capacitor bridge build** using the installed `@capacitor/push-notifications` plugin, while restricting top-level navigation to the customer page on the existing HTTPS origin. Run this in a fresh checkout without an existing generated `android/` directory. Do not run `prepare-live-android.mjs` afterward: that intentionally removes the bridge configuration.

Before a Push APK can deliver notifications:

1. Register Android package `com.partflow.customer` in the same Firebase project and put its `google-services.json` in generated `android/app/`.
2. Build/sign the APK with the Android SDK and install it on a device. Enable Push in Notifications; Android permission and FCM registration failures are shown to the user. Verify Android 13+ permission denial/grant and sign-out/relogin on a real device.
3. Provision a trusted FCM sender. Optional v2 Firestore triggers are provided in `functions/`, with a separate `firebase.push.json`. They derive recipients from real message/offer/order records, send generic lock-screen text, remove permanently invalid tokens, and retry transient failures. Tapping Push opens the appropriate in-app chat/order; payloads never direct arbitrary URL navigation.
4. Deploy those triggers only after the project's Cloud Functions prerequisites and billing choice are explicitly configured. They were **not deployed**, and no billing plan was changed. With suitable prerequisites: `npm --prefix functions ci`, then `firebase deploy --config firebase.push.json --only functions --project menio-8de8f`.

FCM delivery is at least once; Android notification tags/collapse keys replace repeated visible notifications for the same record. Delivery is best effort and never drives order state. The in-app inbox works without FCM or Functions. APK/device delivery has not been claimed as verified.

References: [Capacitor Push setup](https://capacitorjs.com/docs/apis/push-notifications), [Firebase Admin FCM sending](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).

## Verification

`npm ci`, `npm run check`, `npm run build:mobile`, `npm run test:push`. Against the local `demo-partflow` Firestore emulator, run `npm run test:rules` sequentially (each suite resets its own emulator fixtures). CI uses Java 21 and performs the same checks.

`tests/commerce.mjs` verifies live chat delivery and scoped queries, participant/admin isolation, forged identities, oversized/wrong-type/extra fields, immutable messages, mandatory atomic history, all fulfillment transitions, actor restrictions, frozen disputes, admin resolution, cancellation, terminal-state protection, duplicate/concurrent confirmation, immutable event history, private read receipts and device-token access. Existing rules/archive/realtime suites verify compatibility with the original roles and workflows.

Security Rules remain a reviewed prototype; emulator tests cover specified attacks but are not an exhaustive security guarantee. Some deliberately invalid updates exhaust the rules expression budget and are denied; legitimate tested transitions pass. Review and verify the rules before broad public rollout.
