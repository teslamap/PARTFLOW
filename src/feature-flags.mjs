// Stage 1 scaffolding: local, immutable defaults; no remote reads or writes.
// This module grants no permissions. Firestore rules/server checks remain authoritative.
// ON/TEST/LIMITED policy, privileged editing and backend enforcement belong to stage 2.
export const FEATURE_STATES = Object.freeze(['OFF', 'TEST', 'LIMITED', 'ON']);
export const FEATURE_DEFAULTS = Object.freeze({
  godMode: 'OFF',
  anonymousApkAuth: 'OFF',
  aiOrderAssistant: 'OFF',
  smsOtp: 'OFF',
  phoneRecovery: 'OFF',
  emailLinking: 'OFF',
  referrals: 'OFF',
  loyaltyPoints: 'OFF',
  vouchers: 'OFF',
});

// Unknown keys and unavailable rollout policy always fail closed. No client overrides.
export function featureState(key) {
  return Object.hasOwn(FEATURE_DEFAULTS, key) ? FEATURE_DEFAULTS[key] : 'OFF';
}
export function isFeatureEnabled(key) {
  return featureState(key) === 'ON';
}
