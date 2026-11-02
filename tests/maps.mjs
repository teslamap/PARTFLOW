import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validPoint,shopPin,scopedShops,locationFields} from '../src/map-policy.mjs';
const shops=[{id:'a',name:'A',city:'ბათუმი',mapLocation:{lat:41.64,lng:41.63}},{id:'b',name:'B',city:'თბილისი'},{id:'c',name:'C',city:'სხვა'}],offers=[{id:'offer-a',requestId:'r',shopId:'a'},{id:'offer-b',requestId:'r',shopId:'b'}];
assert.equal(shopPin(shops[0]).approximate,false);assert.equal(shopPin(shops[1]).approximate,true);assert.equal(shopPin(shops[2]),null,'never invent coordinates for unknown city');
assert.deepEqual(scopedShops(shops,{id:'r'},offers),shops);
assert.deepEqual(scopedShops(shops,{id:'r',acceptedOfferId:'offer-b'},offers).map(s=>s.id),['b']);
assert.deepEqual(scopedShops(shops,{id:'r',acceptedOfferId:'missing'},offers),[],'no competing shops when selected offer is unavailable');
assert.deepEqual(scopedShops(shops,{id:'another',acceptedOfferId:'offer-a'},offers),[],'offer must belong to the selected request');
assert.deepEqual(scopedShops(shops,{id:'r',acceptedOfferId:'offer-a'},offers).map(s=>s.id),['a']);
for(const p of [null,{}, {lat:NaN,lng:1},{lat:91,lng:1},{lat:1,lng:-181},{lat:'41',lng:41}]){assert.equal(validPoint(p),false);assert.throws(()=>locationFields(p,''));}
assert.deepEqual(locationFields({lat:0,lng:0},' address '),{mapLocation:{lat:0,lng:0},mapAddress:'address'});assert.throws(()=>locationFields({lat:1,lng:1},'x'.repeat(301)));
const manifest=readFileSync('android-overrides/app/src/main/AndroidManifest.xml','utf8'),java=readFileSync('android-overrides/app/src/main/java/com/partflow/customer/MainActivity.java','utf8');
for(const p of ['ACCESS_FINE_LOCATION','ACCESS_COARSE_LOCATION'])assert.ok(manifest.includes(p));
assert.ok(!manifest.includes('ACCESS_BACKGROUND_LOCATION'));
assert.match(java,/onGeolocationPermissionsShowPrompt/);assert.match(java,/onRequestPermissionsResult/);assert.match(java,/requestPermissions\(new String\[\]\{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION\},42\)/);
assert.match(java,/callback.invoke\(origin,false,false\)/);assert.match(java,/allowed\(Uri.parse\(web.getUrl\(\)\)\)/);assert.match(java,/WebSettings.LOAD_DEFAULT/);
console.log('PASS: map pin precision, single confirmed-shop scope, immutable selection boundaries and foreground Android location permission wiring');
