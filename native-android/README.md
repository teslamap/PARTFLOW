# PARTFLOW native Android

Four independently installable Kotlin / Jetpack Compose applications. No web page,
JavaScript bundle, browser bridge or wrapper is used by this project. The older
website and wrapper projects remain unchanged.

**Status: native preview, not a completed replacement for every web feature.**
Build success and functional parity are separate acceptance criteria. Do not
publish these builds as finished production apps while the remaining items below
are open.

| Application | Package | Access |
| --- | --- | --- |
| Customer | `com.partflow.native.customer` | Own requests, offers, confirmations, orders, garage, towing, service requests, support |
| Business | `com.partflow.native.business` | Approved matching requests, offers, order fulfillment, owned service businesses, support |
| Tow Driver | `com.partflow.native.tow` | Application, approved city/global matching, assigned rides, support |
| Superadmin | `com.partflow.native.superadmin` | Existing server-authorized superadmins only; approval, moderation, packages, disputes, resumable deletion |

Each package has an independently registered Android Firebase application in
`menio-8de8f`. Application config in flavor assets is public client configuration.
No service account, admin SDK credential or runtime customer data is packaged.
The existing `(default)` Firestore database is STANDARD, region `eur3`.

## Implemented workflows

- Email/password and Credential Manager Google sign-in, reset password, verify email, profile
  name/city, persistent separate Firebase sessions, logout cache/draft purge.
- Local vehicle/model/category/city catalogs extracted from the existing web source.
- Requests with validated vehicle details, budget and native photo picker; up to
  four JPEGs, maximum 180000 characters each after native compression.
- Private garage, validated VINs and optional NHTSA VIN lookup with manual entry.
- Business applications, up to ten specializations and matching, own child auto-services.
- Immutable unique offers, participant chat with activity metadata, two-party
  conversation precondition, versioned confirmation, transactional order selection.
- Order history, role-dependent fulfillment transitions, cancellation and disputes.
- SOS/intercity tow request, native location permission/input, atomic quote/claim,
  owner confirmation, driver progression and owner completion/cancellation.
- Service catalog creation, service requests/status changes, weekly hours,
  staff creation, closures and active/inactive controls.
- Support session open/close and immutable session-associated messages.
- Private archives with live visibility filtering, a message inbox and chat read markers.
- Native interactive map with business pins, pan/zoom and directory filtering.
  Only visible OpenStreetMap tiles are requested, with attribution, an app-specific
  user agent, conditional revalidation and a minimum seven-day cache; no bulk/offline
  area download is offered.
- Superadmin approvals/moderation, categories, package creation/editing/assignment,
  custom prices, disputes, audited feature settings, retention policy,
  explicit administrator chat participation and resumable permanent request cascade.

## Storage and reads

Room stores account/screen-scoped JSON snapshots and form drafts. Snapshots expire
after seven days and are purged at logout or query permission rejection. Firebase
Auth owns credentials; passwords are never stored in Room. Android backup is off.
Firestore uses memory caching so a second persistent disk cache cannot retain
privileged records or pending writes across user sessions.

Only the visible feed is subscribed; screen/background changes detach that feed.
Profile/approval listeners preserve permission re-evaluation. Feeds start at 50
records. Older pages use `startAfter` and one server read per page rather than
re-reading an ever-growing query. Match feeds select one exact approved specialty
or tow scope. Mutations requiring contention protection use transactions; offer
IDs are deterministic. UI shows success only after the SDK task acknowledges.
Offline reads use Room and incomplete forms remain drafts; there is no custom
queue silently replaying orders or privileged mutations.

`firestore.indexes.json` retains the 38 previously deployed indexes and combines
the web manifest with native query indexes. The combined 50-index set was deployed
additively. Existing web source, security rules and hosting were not changed.
To regenerate from current production metadata, first export the CLI index
inventory to `.index-inventory.json`, then run `tools/merge_indexes.mjs` from the
repository root. Never force deletion of unlisted live indexes.

## Build and validation

JDK 17+, Android SDK 35:

```sh
cd native-android
./gradlew :app:assembleDebug :app:testCustomerDebugUnitTest
```

The dedicated `Native Android APKs` Actions workflow compiles all four variants,
runs shared domain tests and lint for each, checks package IDs and APK signatures,
rejects packaged HTML/JS/web bundles, and emits four separate APK artifacts with
SHA-256 checksums and package inspection reports.

Its device job runs actual Repository SDK operations on an Android emulator
against Auth/Firestore emulators using `demo-partflow` and the unchanged repository
rules. It tests cross-user request denial, unique offers, two-party chat,
confirmation/order idempotency, fulfillment authorization, tow lifecycle and
Room account isolation. A Compose test checks the native sign-in surface.
Test fixture bypass authorization is confined to the test source and emulator
loopback address. No production account or record is created by these tests.

## Remaining release gates

- Complete and test full web feature parity: private phone
  contact/verification and optional API-backed features; background notifications;
  superadmin directory search and starting support sessions on behalf of users.
- Finish device-based end-to-end UI checks for each role, including background
  recovery, offline restart, permission revocation, photo selection, accessibility,
  keyboard/back navigation and upgrade behavior.
- Persistent release signing identity, SHA registration, Play Integrity/App Check
  configuration and release distribution. Current artifacts use runner debug
  signing, so replacing a previous build can require uninstalling that preview.
  Google sign-in additionally requires registering the certificate SHA fingerprints
  printed in each artifact's verification report before testing that build.

Disabled web features that depend on absent SMS/payment/AI/push backends must not
be advertised as available merely because an interface or APK builds.
