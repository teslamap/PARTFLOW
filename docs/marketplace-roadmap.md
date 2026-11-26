# Marketplace engagement — rollout
This extension has no inventory, automatic offers, compatibility lookup, AI integration, payment processor or delivery management. Manual shop offers and chat agreement remain the source of truth.

## Implemented
- Verified completed-order ratings (one per order, admin moderation, no reviewer identity in public document).
- Shop lifetime average first-offer response time and completed-order count, computed by trusted idempotent functions; historical metrics via dry-run backfill.
- Offer comparison by initial part/total price, condition, warranty and visible reputation; 1/3/7/14/30-day validity with server-enforced expiry and shop renewal. Legacy offers without validity remain valid.
- Repeat closed request without its photos or old offers; price negotiation via existing confirmation flow; private watchlists and new matching request/price reduction in-app notifications.
- Per-request price statistics, matching-demand counts and structured cancellation reason summaries, based on loaded data, not market-wide estimates.
- Private bidirectional block on NEW offers/renewals; existing chats, commitments and records stay accessible. Participant reports and superadmin moderation.
- Existing FCM remains unchanged; new smart notifications are in-app only in this release. No new background push fan-out.
- Payments explicitly deferred: first decide processor, payment timing, refund/cancellation policy, fees, dispute ownership and settlement; no card data or payment UI added.

## Deploy order
1. Audit PR must pass and be merged first. Run emulator and browser regression jobs.
2. Deploy Firestore rules and indexes; wait for review aggregation index. Do not enable production UI before this.
3. Deploy the push/functions codebase including shop metrics triggers, using a verified Firebase project; dry-run `GCLOUD_PROJECT=... node scripts/backfill-shop-metrics.mjs`, then `--apply` after review. Metrics are anonymous lifetime aggregates, not live inventory or sales totals.
4. Set GitHub variable PARTFLOW_MARKETPLACE_EXTRAS=true and publish updated clients. Default false protects old deployments.
5. Test genuine customer/shop/admin accounts, permissions and mobile layout. Existing records do not require destructive migration.
6. If rollback needed, disable the UI flag; preserve existing quote expiry and new block protections. Do not delete user reviews or reports.
