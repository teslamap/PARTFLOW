# PARTFLOW

Georgian automotive parts request platform. Customers describe a vehicle and part; approved shops see only requests matching one complete specialization (brand + model + category).

## Implemented

- Customer dashboard, detailed requests, optional VIN, budget, condition, city and up to four photos.
- Shop registration with multiple specialization rules and admin approval. Editing a shop requires approval again.
- Offers with price, condition, delivery terms and notes; customers select an offer and close a request. Phone contact is available for the selected shop.
- Admin shop approval/suspension and request moderation.
- Superadmin account role management and category creation.
- Persistent Cloudflare D1 records, private R2 photos, server authorization, atomic offer selection and duplicate-offer protection.
- Clearly labeled in-memory demo mode for exploring every role. Demo changes never write to the database.
- Responsive Georgian UI. Prices are in GEL.

## Access and initial setup

This initial Sites deployment is **owner-private** and uses platform-managed ChatGPT sign-in. The first authenticated owner initializes the superadmin account. Complete this setup while owner-private, before widening access. The existing owner cannot be demoted in the app. New authenticated accounts receive the customer role; shop registration is a separate profile. Viewing another role in the sidebar does not grant server privileges.

This release is a working private MVP, not a public launch. Public access, ordinary customer phone/email login, legal/privacy policies, rate limiting and abuse controls, production monitoring and an owner recovery procedure must be designed before a public rollout. No billing, payments, SMS/email/push notifications, chat, order fulfillment or inventory integration is implemented. Requests appear in matching shops' dashboard; external notifications are not sent. The starter vehicle list is curated and intentionally limited. Matching uses brand/model/category, not year, engine or verified OEM compatibility; these details are shown to shops for confirmation.

## Development

Node 22.13+ and npm:

```sh
npm run install:ci
npm run db:generate # only after changing db/schema.ts
npm run build
```

Apply the committed SQL migrations in order to the local database (build first to generate Wrangler configuration):

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_simple_roxanne_simpson.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_perfect_rawhide_kid.sql
npm run dev
```

On portable loopback development, `/signin-with-chatgpt?return_to=/` signs in as the starter's local test identity. This mock identity is not bundled into production. Real hosted identity headers are injected by Sites; do not expose a standalone Worker directly to untrusted callers without a trusted identity gateway.

## Verification

```sh
node --test tests/core.test.mjs
npx tsc --noEmit
```

`tests/integration.mjs` is an opt-in local-only test using synthetic DB fixtures; it creates requests and a store, tests approval, mismatches, duplicates, ownership, origin protection and atomic acceptance. It requires the local development server, signed-in local owner and the documented fixture IDs. It must not run against production. The original implementation was verified with these fixtures; use a fresh disposable local DB and prepare equivalent fixture records before rerunning.

## Structure

- `app/page.tsx`, `app/globals.css`: responsive UI and isolated demo mode.
- `app/core.mjs`: catalog, matching, scope and input validation.
- `app/api/route.ts`: authorized platform operations.
- `app/api/media/`: photo upload and authorized reads.
- `db/schema.ts`, `drizzle/`: schema and append-only migrations.
- `.openai/hosting.json`: Sites identity and logical DB/BUCKET bindings.

Do not commit credentials, `.wrangler`, `.sites-runtime`, `node_modules` or runtime records. Hosted database migrations apply through Sites publication. Local records and demo data are not production seed data.
