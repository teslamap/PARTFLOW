# PARTFLOW — Firebase

Georgian automotive parts request platform on the existing `menio-8de8f` Firebase project.

## Pages

- `/customer.html` — customer requests and received offers
- `/shop.html` — shop registration, specializations, matching requests and offers
- `/admin.html` — shop approval/suspension and request moderation
- `/superadmin.html` — admin roles and categories

All four root HTML files are complete, generated pages: visible HTML, the entire stylesheet and the complete React/Firebase JavaScript bundle are embedded in each file. They do not require separate `/src` or `/assets` files to run. Firebase network access is still required for real sign-in and data; Google fonts load online. The default page opens the customer panel. `?demo=1` runs an isolated, clearly labeled in-memory demo without reading or writing Firebase data.

Edit the templates under `entries/` and the application under `src/`, then run `npm run build`. The build emits full pages into `dist/` and updates the four root HTML files committed to GitHub. `build-tools/standalone-html.ts` performs the embedding and fails if a future change introduces unembedded JavaScript chunks. Root HTML files are generated outputs; do not hand-edit them.

## Services and access

Each HTML panel uses its own named Firebase Auth instance and sessionStorage persistence. Signing in or out on one panel does not sign the other panels in or out; each panel needs an explicit sign-in. Reloading the same panel in the same tab preserves its session. Closing that tab ends its session. Accounts, roles and Firestore data remain shared; this separates browser sessions, not accounts or permissions. Older shared sessions are not imported into the new panel instances.

To test this locally, start the Auth emulator and the Vite dev server, then open `/tests/session-isolation.html`. This emulator-only browser test verifies four independent sessions, logout behavior and persistence across a full reload. It creates no production account or data.

Firebase Hosting serves the static React app. Firebase Authentication provides Google and email/password sign-in. Firestore stores requests, offers, shop profiles, roles and added categories. No Sites/ChatGPT login, D1 or R2 dependency remains.

The verified Google identity `suloanani1@gmail.com` is the preconfigured founder/superadmin. This is a trusted deployment allowlist, not a first-registrant privilege. Other users register as customers; a separate shop profile goes through admin approval. Editing shop specialties resets approval. New admins can only be assigned by superadmin. Changing the founder identity requires reviewing and deploying the rules and matching frontend configuration together. Email/password users with the founder email need to verify that address and refresh their token before receiving founder access; Google sign-in handles verification directly.

Each specialization combines brand, model and part category. An approved shop sees only a matching combination. Up to ten specializations per shop, with explicit wildcards for all models/categories. Year, engine and VIN are shown to shops and do not establish verified OEM compatibility. Offers are unique per shop/request and immutable. Request acceptance is transactional and selects a single offer. Admin moderation preserves open/closed status when restoring hidden requests.

No private email addresses are stored in shared account directory documents. Users cannot self-approve stores, promote their role, overwrite others' requests, or inspect unrelated offers. Legacy Menio collections are denied by the new rules.

## Spark plan limits

Cloud Storage requires a Blaze billing plan. This release keeps Spark and uses small, compressed JPEG attachments directly in request documents: maximum four, each under 180000 base64 characters. The photo field is excluded from indexes. This is suitable for the initial small MVP; move attachments to an object store when scaling. The source image selection limit is 4 MB, compressed in the browser before upload.

List queries cap each result set at 300. Cursor pagination and query profiling are required for larger deployments. No chat, payments, SMS/email request alerts or fulfillment workflows are included. Shop dashboards load current matching requests on opening/refreshing.

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

```sh
npx -y firebase-tools@latest login
npm run build
npx -y firebase-tools@latest deploy --only hosting,firestore,auth --project menio-8de8f
```

Review Security Rules and the trusted founder allowlist before expanding access. Firestore database ID is `(default)`, edition STANDARD, location `eur3`. Firebase project ID remains `menio-8de8f`; the product brand is PARTFLOW.
