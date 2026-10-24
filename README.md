# PARTFLOW — GitHub Pages + Firebase

Georgian automotive parts request platform. GitHub is the source of truth for code and GitHub Pages is the primary website host. The existing `menio-8de8f` Firebase project provides Authentication and Firestore; customer data is not stored in this public repository.

Primary website: https://teslamap.github.io/PARTFLOW/

- [Customer](https://teslamap.github.io/PARTFLOW/customer.html)
- [Shop](https://teslamap.github.io/PARTFLOW/shop.html)
- [Admin](https://teslamap.github.io/PARTFLOW/admin.html)
- [Superadmin](https://teslamap.github.io/PARTFLOW/superadmin.html)
- [Mobile customer](https://teslamap.github.io/PARTFLOW/mobile-customer.html)

## Pages

- `/customer.html` — customer requests and received offers
- `/shop.html` — shop registration, specializations, matching requests and offers
- `/admin.html` — shop approval/suspension and request moderation
- `/superadmin.html` — admin roles and categories
- `/mobile-customer.html` — independent mobile customer interface, prepared for Capacitor Android WebView

All five root HTML files are complete, generated pages: visible HTML, the entire stylesheet and the complete React/Firebase JavaScript bundle are embedded in each file. They do not require separate `/src` or `/assets` files to run. Firebase network access is still required for real sign-in and data; Google fonts load online. The default page opens the customer panel. `?demo=1` runs an isolated, clearly labeled in-memory demo without reading or writing Firebase data.

Edit the templates under `entries/` and the application under `src/`, then run `npm run build`. The build emits full pages into `dist/` and updates the five root HTML files committed to GitHub. Commit both source edits and generated root pages to `main`; the existing GitHub Pages branch deployment publishes them automatically. `build-tools/standalone-html.ts` performs the embedding and fails if a future change introduces unembedded JavaScript chunks. Root HTML files are generated outputs; do not hand-edit them.

## Services and access

Each HTML panel uses its own named Firebase Auth instance. The four desktop panels use sessionStorage; the mobile customer uses its own local persistence so its login survives app restart. Signing in or out on one panel does not sign the other panels in or out; each panel needs an explicit sign-in. Accounts, roles and Firestore data remain shared; this separates browser sessions, not accounts or permissions. Older shared sessions are not imported into the new panel instances. Sessions on GitHub Pages and Firebase Hosting are also separate browser origins.

The panels have no role switcher or links to other panels, including login/denied-access screens and the static HTML fallback. Open each panel's exact URL separately. The Android app is customer-only, blocks other panels and loads the live GitHub Pages customer URL, so future website changes do not require reinstalling the APK. See `ANDROID.md`.

Opened panels use Firestore `onSnapshot` listeners instead of polling. Requests, offers, acceptance, moderation, shop approval/specializations, categories and administrative lists update automatically. Queries are scoped to the current panel and user, ordered newest first and limited to 300 per query. Permission/specialization changes rebuild subscriptions; logout/unmount detaches them. `tests/realtime.mjs` verifies cross-client updates and isolation in the emulator. Commerce adds participant-scoped rules; existing request/offer schemas remain unchanged.

To test this locally, start the Auth emulator and the Vite dev server, then open `/tests/session-isolation.html`. This emulator-only browser test verifies five independent sessions, logout behavior and persistence across a full reload. It creates no production account or data.

GitHub Pages serves the static React app. Firebase Authentication provides Google and email/password sign-in. `teslamap.github.io` is an authorized Firebase Auth domain. Firestore stores requests, offers, shop profiles, roles and added categories. The Firebase Hosting copy remains available as a secondary URL; publishing code to GitHub is sufficient for the primary website. No Sites/ChatGPT login, D1 or R2 dependency remains.

The verified Google identity `suloanani1@gmail.com` is the preconfigured founder/superadmin. This is a trusted deployment allowlist, not a first-registrant privilege. Other users register as customers; a separate shop profile goes through admin approval. Editing shop specialties resets approval. New admins can only be assigned by superadmin. Changing the founder identity requires reviewing and deploying the rules and matching frontend configuration together. Email/password users with the founder email need to verify that address and refresh their token before receiving founder access; Google sign-in handles verification directly.

Each specialization combines brand, model and part category. An approved shop sees only a matching combination. Up to ten specializations per shop, with explicit wildcards for all models/categories. Year, engine and VIN are shown to shops and do not establish verified OEM compatibility. Offers are unique per shop/request and immutable. Request acceptance is transactional and selects a single offer. Admin moderation preserves open/closed status when restoring hidden requests.

No private email addresses are stored in shared account directory documents. Users cannot self-approve stores, promote their role, overwrite others' requests, or inspect unrelated offers. Legacy Menio collections are denied by the new rules.

## Spark plan limits

Cloud Storage requires a Blaze billing plan. This release keeps Spark and uses small, compressed JPEG attachments directly in request documents: maximum four, each under 180000 base64 characters. The photo field is excluded from indexes. This is suitable for the initial small MVP; move attachments to an object store when scaling. The source image selection limit is 4 MB, compressed in the browser before upload.

List queries cap each result set at 300. Cursor pagination and query profiling are required for larger deployments. Request-scoped real-time chat, an in-app inbox, versioned fulfillment orders, disputes and administrator monitoring are included. Payments and SMS/email alerts are excluded. See COMMERCE.md for flows, access rules, Android Push prerequisites and validation.

## Development

```sh
npm ci
npm run dev
npm run build
npx tsc --noEmit
```

Firebase config is public application configuration, not an admin credential. Security comes from Authentication and reviewed Firestore rules. Never commit CLI tokens, service account keys, password exports or user data.

For local rules tests, Java 21+ is required:

```sh
npx -y firebase-tools@latest emulators:start --only firestore,auth --project demo-partflow
node tests/rules.mjs
```

`tests/rules.mjs` uses only the local emulator and covers ownership, exact matching queries, role escalation denial, approval, duplicate offers, acceptance, moderation and denied legacy paths.

## Deploy

For the primary website: run `npm ci` and `npm run build`, then commit the updated source and generated root HTML files to `main`. The configured GitHub Pages deployment serves the repository root. No Firebase credentials are needed to publish these static pages. Keep runtime data and private credentials out of GitHub.

Deploy to Firebase only when backend rules/auth settings change, or when explicitly updating the secondary Hosting copy:

```sh
npx -y firebase-tools@latest login
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore,auth --project menio-8de8f
```

Review Security Rules and the trusted founder allowlist before expanding access. Firestore database ID is `(default)`, edition STANDARD, location `eur3`. Firebase project ID remains `menio-8de8f`; the product brand is PARTFLOW.


## Panel archives

Each signed-in account can hide records visible to that panel and restore them from Archive. Markers live only in `pf_archives/{uid}/panels/{panel}/items/{type_id}` with `type`, `targetId`, a short `label`, and server `createdAt`. Archive does not modify shared requests/offers, suspend a shop, disable sign-in, or grant access. User lists and categories retain their existing superadmin scope. The archive and its live listener are private to the owner; panel sessions and visibility remain independent. Mobile customer opens Archive through Profile.

Permanent deletion, including Firebase Auth account deletion, is deferred at the owner’s request. No deletion backend or permanent-delete UI is deployed; existing shared documents cannot be deleted through client rules. No billing change is required for archives.

Validation: run `npm run test:rules` (rules, archive, realtime and commerce suites) sequentially against the local demo-partflow Firestore emulator; each suite resets emulator data.
