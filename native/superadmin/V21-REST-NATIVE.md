# PARTFLOW Superadmin V21 — native REST authentication

V21 uses Kotlin/Jetpack Compose with Firebase Authentication REST (`accounts:signInWithPassword`) and Cloud Firestore REST (`Authorization: Bearer <Firebase ID token>`) when no Android Firebase App ID is configured. The existing project's public Web API key is used only as a client API identifier. No service account, privileged OAuth token, hard-coded password, or Firestore Security Rule bypass is included.

The app verifies the signed-in `pf_members/{uid}` superadmin role (or existing verified founder exception), then performs a Firestore rules-protected superadmin list operation. Session tokens remain in process memory and are cleared on logout. All mutations are explicit user actions with a confirmation screen and are authorized by Firestore Security Rules.

The REST path does **not** register a Firebase Android application; it makes that registration unnecessary for these API operations. Some advanced SDK-only screens and map functionality are not yet ported to REST mode. Firebase data reads and writes, security rules, and physical device testing have not been verified with real credentials yet. Keep this pull request in draft until those tests pass.
