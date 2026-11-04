# PARTFLOW customer — native Android preview

Kotlin + Jetpack Compose; no WebView. Branch: native/customer-compose-20261103.
The existing web app, Firebase rules, indexes and other roles are preserved.

## Implemented
- Shared PARTFLOW navy/orange custom text inputs, buttons, searchable selection dialogs,
  confirmation controls and chat bubbles. Native drawer, authentication and profile UI.
- All 28 web vehicle makes and their models, garage wizard, VIN decoding through NHTSA
  vPIC, on-device Latin OCR to extract VIN from a selected certificate photo, manual
  review, plate/trim/fuel fields, duplicate VIN check, vehicle removal and request prefill.
  Certificate photos and raw recognized text are never uploaded.
- Owner-scoped Firestore request/offer listeners, request search and status filtering,
  details, JPEG photo attachment/viewing, custom category loading, close and private archive/restore.
- Shop chat inbox and support chat with reopening of closed conversations; shop messages use both ownerId and offerId filters.
  Negotiated confirmation acceptance atomically updates the confirmation/request and
  creates the order plus immutable event. Decline, customer order completion,
  cancellation, event history and dispute opening follow the existing commerce protocol.
- Native OpenStreetMap shop map, approved-shop reads, selected-shop-only scope after
  acceptance, explicit approximate city-center pins and external route opening.
- SOS location permission and GPS capture, intercity date/time selectors, towing
  history, driver contact, quote confirmation/cancellation, completion and search expansion.
- Profile name/city, private contact where enabled, email verification/reset and sign-out.
  Server feature flags gate garage, offers, orders, chat and private contact UI.
- Android CI runs assembleDebug, lintDebug and UI tests on an Android 29 emulator,
  installs and launches the standalone APK, captures navigation/form evidence, verifies its signature and publishes
  the APK directly as a prerelease asset. Existing web/security regressions run separately.

## Verification and limitations
A successful build alone does not establish full visual or functional parity.
The CI run and emulator screenshots are the evidence for build/install/UI checks.
Production Firebase workflows have not been exercised with a real customer/shop account.
Do not describe this preview as a fully verified production app.

Remaining parity work: optional push registration/inbox badges and deep links,
SMS/phone recovery, optional rewards/referrals/vouchers and AI tools, full Georgian
certificate-field OCR (current local OCR extracts Latin VIN only), native service
booking where enabled, richer chat media/read receipts,
and complete device/back/offline/accessibility/visual parity testing.
The referenced design-concept video was not available in the imported chat attachments;
the two supplied Android screenshots and the actual web source were reviewed.
Offline writes use Firebase's normal pending-write behavior; a success is shown only
after the server acknowledges a write. Error states do not simulate successful operations.

## Build
JDK 17, Android SDK 35, Gradle 8.9:
`cd native-customer && gradle --no-daemon assembleDebug lintDebug`

The installable preview package is `ge.partflow.customer.preview`, minimum Android 8.
It is debug-signed. CI runners may use different debug keys; if Android reports a
signature conflict with an older preview, exporting any needed local information
and uninstalling that preview may be necessary. A stable production signing key
is required before store distribution.
