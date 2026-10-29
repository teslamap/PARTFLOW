// Public client settings only. Never place service credentials here.
export const FIREBASE_CONFIG = Object.freeze({
  projectId: 'menio-8de8f',
  appId: '1:429553713786:web:bf1325a209c917bd4db1c3',
  storageBucket: 'menio-8de8f.firebasestorage.app',
  apiKey: 'AIzaSyDghOTPxpYXBGijyZMJTL3SxTazB881YMo',
  authDomain: 'menio-8de8f.firebaseapp.com',
  messagingSenderId: '429553713786',
});

export const RUNTIME_CONFIG = Object.freeze({
  schemaVersion: 1,
  // Keep panel names and Firebase persistence keys stable across upgrades.
  customerPage: 'customer.html',
  mobileCustomerPage: 'mobile-customer.html',
  liveBaseUrl: 'https://teslamap.github.io/PARTFLOW/',
});
