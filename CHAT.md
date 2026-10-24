# Request-grouped chat and visible administrator participation

The Chat tab now opens a conversation list rather than an offer selector. Each request is an independently collapsible group; its children are the individual shop conversations for that request. Customers see their requests and each responding shop. Shops see only their own offer conversations. Admin/superadmin panels can inspect the conversations they already have permission to monitor. Empty customer requests remain listed with an explanation until a shop offers.

Desktop uses a list/conversation split view. Mobile opens the list first, then a selected conversation with a back arrow. The customer APK uses the live mobile page, so this interface update does not require a native plugin or a new APK. The mobile composer stays above bottom navigation, the conversation scrolls independently, and older messages can be loaded beyond the newest 60. The Chat, Orders and Notifications sections share the same workspace across panels.

## Shop confirmation and selection

After both participants have written in the conversation, the approved shop can send **შეკვეთის დადასტურების მოთხოვნა** with the negotiated price, condition, delivery and note. Existing legacy messages can prove the same two-way contact without rewriting or migrating them. Only the shop can originate the proposal. Pending terms cannot be edited: the shop withdraws the proposal or the customer declines it, then a new revision can be sent. The current proposal retains a monotonic revision number; acceptance locks the accepted terms.

The customer sees the confirmation card and can accept or decline it. Acceptance checks the exact displayed revision, atomically closes the request to further selection, records the accepted confirmation, creates the confirmed order and its initial immutable history event, and links the order to that confirmation/revision. Two shops cannot both win, including under concurrent acceptance. A suspended/unapproved shop cannot originate or receive a new confirmation. The normal confirmed → preparing → shipped → delivered → completed/cancelled and dispute workflows remain available in Orders.

The selected shop's chat remains active, including after fulfillment. The other conversations for that request become read-only with a clear reason and preserved history. Rules enforce this on writes; hiding the composer is not the only protection. Competitor proposals become ineffective through the same request selection state. Declining/withdrawing an unselected proposal leaves the conversation open. Old requests that already selected an offer can initialize their fulfillment order through the legacy action without losing their data.

## Administrator joining

Monitoring is read-only until the administrator presses **ჩატში შეერთება**. Joining atomically creates a participation record, a visible system entry naming the admin, and a new conversation summary. The customer and the shop both receive the entry; unrelated shop conversations do not. Further admin messages have a distinct purple appearance, a shield, the verified member display name and **ადმინისტრატორი** label. Both participants are recipients. This is an explicit participation record, not an online-presence indicator.

An administrator cannot impersonate a customer/shop, silently join without the system entry, or accept an order on the customer's behalf. A current admin role and the participation record are checked for every admin message; removing the role blocks further admin writes. Closed competitor conversations remain read-only even for admin participation. All text is rendered as plain React text.

## Additive collections and rules

| Path | Contents and access |
| --- | --- |
| `pf_chat_activity/{offerId}` | Participant-scoped latest message summary, monotonic version and two-way-contact flags. Each write must match a newly created real message in the same transaction. No forged previews or flags. |
| `pf_chat_admins/{offerId_uid}` | Immutable join identity and linked system message. Only a current administrator can create it; the system entry must be created atomically in the same conversation. Participants and admins can read it. |
| `pf_confirmations/{offerId}` | Current negotiated proposal/revision and response. Strict shop/customer state transitions; accepted proposals cannot be rewritten. |
| `pf_chat_reads/{uid}/threads/{offerId}` | Private read version and server time. A version cannot exceed the real summary version. |
| `pf_messages/{id}` | Existing participant messages plus strictly validated `admin`/`admin_join` messages. The latter have verified `senderName` and exactly the two real participant `recipientIds`. |

Existing requests, offers, Auth accounts, member roles and message documents are retained. Orders add optional `confirmationId`/`confirmationVersion` references, while existing orders keep their original shape. New source text fields are excluded from indexes. Composite indexes mirror owner/shop summary and proposal subscriptions, scoped message queries and selected-conversation admin lists.

Unread counts and latest-message previews update live. Confirmation receipts use the existing private inbox markers, and viewing a visible conversation marks its current activity/proposal read. Hidden tabs do not automatically mark incoming activity read. The inbox shows real participant/admin messages and actual confirmation states. Optional Push routing handles both recipients of admin messages and shop/customer confirmation responses, but Functions/FCM activation remains separate as documented in COMMERCE.md.

Superadmin permanent request deletion also drains the new summary, admin participation and confirmation collections before removing messages/offers. Read markers retain no message/request content and do not display a notification by themselves. Auth, other requests and shop profiles are preserved.

## Verification

`npm run test:rules` includes `tests/chat-workflow.mjs`. The suite covers two-way contact, legacy proofs, admin join visibility and uniqueness, named admin recipients, forbidden silent/non-admin writes, private summary/read access, stale cards, decline/resend, acceptance, role revocation, competing acceptances and winning/losing conversation behavior. Existing rule/archive/realtime/commerce/deletion suites are retained and pass through the new consent workflow. Deletion tests verify cleanup of the new collections as well.

Browser QA uses a mobile buyer, two independent shop sessions and an admin session on local Auth/Firestore emulators. It checks independent accordion groups, history pagination, explicit admin joining visible to both sides, admin messages, proposal decline/resend/accept, the winning active chat, losing read-only chat, no cross-conversation admin leak, 320px layout and composer placement above bottom navigation. Development fixtures never touch production accounts or requests.

Security Rules are a tested prototype, not an exhaustive guarantee; review them before broader rollout.
