# Towing dispatch

Customer app: use the **SOS** and **დაგეგმილი გადაყვანა** buttons on the home screen. Drivers use the independent **towing.html** page with a separate sign-in session. Shop panels have no towing forms. Admin driver approval is available in business management.
The existing parts, garage, shop, service and chat flows remain separate.

## Customer

- SOS requires a one-time browser location, pickup city/address, destination city/address, vehicle, vehicle condition and contact phone. It initially reaches only approved drivers registered in the same city/municipality.
- After 15 minutes **while still searching**, the customer can explicitly consent to expand nationwide. Server time in Firestore Rules enforces this boundary; no timer silently expands the audience.
- Intercity requires pickup/destination, a future date/time, vehicle, condition and phone; notes are optional. All approved drivers nationwide can see it immediately. Date/time inputs use the customer's local timezone and persist as a Firestore timestamp.
- The first successful driver transaction reserves the request with a price. The customer confirms that driver and price. Other drivers cannot claim a reserved, confirmed or cancelled request.
- Customers can cancel before travel starts and confirm completion after transport starts.

## Driver and admin

Driver registration is available only on the independent driver page (`towing.html`). Applications include name, phone, city and truck details; they start pending. Administrators approve, reject or suspend applications in the admin business management page. Administrators cannot approve their own driver profile. Pending/rejected applicants can resubmit; approved profiles cannot silently change their city or identity. Suspended drivers cannot claim or advance requests.

Approved drivers see the same-city SOS feed and nationwide feed in real time while the page is open. Accept a call with a price, wait for customer confirmation, mark departure, then mark transport started. The customer closes the trip. Background push/SMS dispatch is not part of this module; an open towing page receives live Firestore updates.

Status flow: `searching → offered → confirmed → en_route → transporting → completed`.
Cancellation is allowed from `searching`, `offered` and `confirmed`.

## Data and security

- `pf_tow_drivers/{uid}`: private application, accessible only to its owner and admins.
- `pf_tow_requests/{id}`: immutable trip details, owner, one-time coordinates, server timestamps, search scope, state and selected driver/price snapshot.
- Reads require authentication and ownership, assignment, admin role or an approved driver matching an active search audience. Closed requests disappear from the shared feed; their participants retain access.
- Updates validate the entire document, whitelist changed fields, enforce transitions and preserve immutable ownership, timestamps, trip details and quote.
- Coordinates are captured only on the customer's explicit button press. There is no driver GPS collection, watchPosition loop, GPS history or free/busy control.
- Each live request subscription currently loads up to 100 documents; the admin driver list loads up to 200. Larger deployments need cursor pagination. Matching uses the selected city/municipality, not reverse geocoding.

## Validation and deployment

`npm run test:towing` validates fields, the exact 15-minute boundary, and rendered role separation: customer SOS/scheduled forms, driver-only registration, and absence of these forms from shop/admin panels.
`npm run test:towing:rules` runs against the local Firestore emulator on port 8080 and tests real transactions, query authorization, city restrictions, nationwide routing, first-claim races, consent, suspension, immutable fields, schema/type/size attacks and status transitions. Both suites are included in CI; existing regression suites remain enabled.

Deploy `firestore.rules` to `menio-8de8f` before publishing the new UI. The module uses indexed equality filters and needs no Functions deployment or new paid service. Build with `npm run build`; GitHub Pages publishes from the main-branch workflow after regressions pass. Firebase Hosting remains the secondary copy.
