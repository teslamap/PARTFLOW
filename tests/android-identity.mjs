import assert from 'node:assert/strict';
import {shouldUseAndroidAppCheck,shouldCreateAnonymousAccount} from '../src/android-identity.mjs';
for(const args of [
 {isAndroid:false,enabled:true,bridgePresent:true},
 {isAndroid:true,enabled:false,bridgePresent:true},
 {isAndroid:true,enabled:true,bridgePresent:false},
])assert.equal(shouldUseAndroidAppCheck(args),false);
assert.equal(shouldUseAndroidAppCheck({isAndroid:true,enabled:true,bridgePresent:true}),true);
for(const args of [
 {isAndroid:false,enabled:true,appCheckReady:true,currentUser:null},
 {isAndroid:true,enabled:false,appCheckReady:true,currentUser:null},
 {isAndroid:true,enabled:true,appCheckReady:false,currentUser:null},
 {isAndroid:true,enabled:true,appCheckReady:true,currentUser:{uid:'existing'}},
])assert.equal(shouldCreateAnonymousAccount(args),false);
assert.equal(shouldCreateAnonymousAccount({isAndroid:true,enabled:true,appCheckReady:true,currentUser:null}),true);
console.log('PASS: Android attestation and anonymous auth require explicit build gates and a native bridge.');
