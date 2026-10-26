# Sprint 2: service setup (booking foundation)

## Completed

- Auto-service owners manage their catalog: name, description, duration in 15-minute
  steps (15–480 minutes), active/inactive. Disabling retains record IDs.
- Public professional staff profiles: name, specialty, up to eight local services,
  seven-day schedule, active/inactive. No staff contact, login credentials or
  personal leave reasons are stored in these public records.
- Business weekly hours, per-worker weekly hours, and full-day closures for either
  the whole business or one worker. All hours use Asia/Tbilisi.
- Public approved service profiles expand to show active services, staff, business
  and worker hours, and upcoming active closures. No price collection or payments.
- Owner UI lives below the business profile in `shop.html`; existing parts shops
  do not receive the service manager. Draft/pending service owners can prepare
  content. Approval gates public access to every child collection. Admins inspect
  setup through rules; writes are restricted to the business owner.

## Data model

All paths are additive below `pf_shops/{businessId}`. Existing records need no
migration. Children are readable only if their parent exists and is auto_service.

| Path | Required fields |
| --- | --- |
| `catalog/{id}` | name, description, durationMinutes, active, createdAt, updatedAt |
| `staff/{id}` | name, specialty, serviceIds, days, active, createdAt, updatedAt |
| `hours/weekly` | timezone, days, createdAt, updatedAt |
| `closures/{date}_{all or staff_staffId}` | date, day, staffId (empty = whole business), active, createdAt, updatedAt |

`days` is a seven-element array, Monday first, of `{open, start, end}`; start/end
are local minutes after midnight. Closed days have start=end=0. `day` on closures
is a UTC-midnight Firestore timestamp representing a **calendar date**, not an
appointment instant. Rules derive its YYYY-MM-DD key and reject impossible dates.
The timestamp does not change the business timezone.

CreatedAt is immutable. UpdatedAt must be server time. Owner writes use the same
transactional helper exercised by emulator tests. Hard deletes are denied: retain
references for future booking history; owners can deactivate and reactivate.

Owner subscriptions read their own collections. Public child queries require
active == true and cap results at 100 per collection; no composite index is
needed. The public parent directory remains capped at 300. Pagination is a later
scaling task. One open profile at a time limits listeners. Revocation/unmount
clears data and detaches listeners. Staff assignments must reference existing
services in the same business; inactive assignments are retained, but inactive
services are excluded from the public catalog.

Public directory initialization also accepts the services role using an isolated
in-memory Auth instance. Existing signed-in panel sessions are unchanged.

## Validation

New emulator suite covers actual save/edit helpers, immutable timestamps,
field size/type pollution, owner/other-owner/admin/parts-shop write isolation,
invalid weekly maps, real-date closure validation, same-business assignments,
eight-reference rule evaluation limits, public filtered queries, disabled records,
suspended parents, and orphaned children. Existing regression suites are retained.
Desktop and 390px mobile forms were visually checked using a local demo fixture.

No production fixture, user, staff member, business or booking is created for QA.

## Still to implement, in order

1. **Booking availability:** intersect business and worker hours, filter active
   catalog/staff and exclude closures. This sprint stores schedules; it does not
   advertise calculated free slots. Support one contiguous shift per day; split
   shifts, partial-day leave and overnight hours require an explicit extension.
2. **Bookings:** service/staff/date/slot and private garage vehicle selection;
   atomic deterministic slot locks for every occupied 15-minute unit; service
   confirmation/rejection, cancellation, immutable participant IDs and audit events.
   Treat existing bookings separately from availability changes and suspension.
3. **Booking chat and tests:** participant-scoped chat, double-booking contention,
   time boundaries, suspension, retry/cancellation and timezone tests.
4. **Superadmin packages/trials:** versioned package definitions, manual grants,
   limits, trial and expiry dates, extensions and audit history. Preserve access
   to existing bookings, orders and chat when entitlements expire.
5. **Payments remain disabled.** No checkout, billing SDK or payment webhook.

## Release

Deploy reviewed Firestore rules before the UI. No new index or data migration is
required. An earlier UI remains compatible. A UI rollback can keep the additive
rules in place. Do not delete setup data when reverting the visible manager.
