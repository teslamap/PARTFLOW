# Audit rollout (staged, no production mutation)
The new city visibility, claims and photo storage paths require Firebase administrator deployment and verification; do not enable them merely by merging this PR.

## City
1. Deploy rules/indexes, then deploy the dedicated batch API codebase including the scheduler. Wait for indexes to build.
2. Run `GCLOUD_PROJECT=... node scripts/migrate-city-visibility.mjs` (dry run), then add `--apply`. Repeat until candidates = 0. Legacy requests remain national.
3. Set GitHub variable PARTFLOW_CITY_VISIBILITY_V2=true, publish and verify the local/national queries on real test accounts. Refresh stale client builds.
4. Set pf_settings/cityVisibility to {enabled:true} using an authorized Admin SDK session. Test fresh local/remote, automatic expansion (scheduler minute granularity), manual expansion, owner/admin and existing offer access. Roll back by setting enabled:false. Do not remove indexes during rollback.

## Claims
1. For every intended verified administrator, run `GCLOUD_PROJECT=... node scripts/manage-admin-claims.mjs grant UID` then add `--apply`. Sign in again and verify custom claims.
2. Only after verifying access, run the same script with `cutover UID --apply` for a verified claimed admin. Existing member roles cease to grant privileges. Revoke claims using `revoke UID --apply` and sign out/re-authenticate. Allow for token expiration; existing ID tokens may survive revocation until expiry.
3. Roll back by changing pf_settings/adminIdentity.claimsOnly to false. Do not delete the last working administrator.

## Photos
Requires a configured Firebase Storage bucket, billing if required by Firebase, bucket CORS for authenticated blob reads from the actual app origins, and permission for Storage Rules to read Firestore. Deploy storage rules and cleanup trigger first. Verify claims and city migration before enabling photo uploads. Enable PARTFLOW_STORAGE_PHOTOS=true only after testing authenticated access and denial. Old clients cannot render storage markers: publish upgraded readers before migrating. The migration script defaults to dry run; supply GCLOUD_PROJECT and PARTFLOW_STORAGE_BUCKET, back up Firestore first, then use --apply. Do not make the bucket public or use persistent bearer download URLs. Disabling the flag stops new Storage uploads; migrated photos still require the new reader. Monitor orphan objects after interrupted request writes and clean up only after confirming no request exists. No production data has been migrated by this PR.

## Web
Pages deployment builds shared assets; default local build still emits standalone root HTML for compatibility. Incremental loading expands the live window by 100 per query, not a cursor-only history page. Older data is no longer permanently hidden by a hard 300-record cap.
