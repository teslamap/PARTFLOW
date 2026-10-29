import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIREBASE_CONFIG, RUNTIME_CONFIG} from '../src/runtime-config.mjs';
import {FEATURE_DEFAULTS, FEATURE_STATES, featureState, isFeatureEnabled} from '../src/feature-flags.mjs';

const project = JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
assert.equal(FIREBASE_CONFIG.projectId, project, 'keep existing Firebase project');
assert.equal(FIREBASE_CONFIG.authDomain, project + '.firebaseapp.com');
for (const page of [RUNTIME_CONFIG.customerPage, RUNTIME_CONFIG.mobileCustomerPage]) {
  assert.ok(readFileSync('entries/' + page, 'utf8').includes('data-role='), 'preserve existing entry points');
}
for (const key of Object.keys(FEATURE_DEFAULTS)) {
  assert.ok(FEATURE_STATES.includes(featureState(key)));
  assert.equal(isFeatureEnabled(key), false, 'unimplemented V2 features stay disabled');
}
for (const key of ['missing', '__proto__', 'constructor', 'toString', null, undefined]) {
  assert.equal(featureState(key), 'OFF');
  assert.equal(isFeatureEnabled(key), false);
}
assert.throws(() => { FEATURE_DEFAULTS.anonymousApkAuth = 'ON'; }, TypeError);
assert.throws(() => { FIREBASE_CONFIG.projectId = 'other-project'; }, TypeError);
assert.equal(JSON.parse(readFileSync('firebase.json', 'utf8')).auth.providers.anonymous, false);
console.log('PASS: foundation preserves Firebase/entry points and fails closed for V2 features.');
