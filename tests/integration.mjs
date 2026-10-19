import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
async function api(body){const r=await fetch(base+'/api',{method:body?'POST':'GET',headers:{Cookie:'__sites_local_auth=1',...(body?{'Content-Type':'application/json',Origin:base}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
assert.equal((await fetch(base+'/api')).status,401);
let r=await api();assert.equal(r.status,200);assert.equal(r.data.user.role,'superadmin');
r=await api({action:'request',brand:'Toyota',model:'Prius',year:2015,engine:'1.8 ჰიბრიდი',category:'განათება',part:'QA ფარი',description:'ლოკალური ინტეგრაციის ტესტი',city:'თბილისი',condition:'მეორადი',budget:500});assert.equal(r.status,200,JSON.stringify(r));
r=await api({action:'shop',name:'QA ავტონაწილები',city:'თბილისი',phone:'+995 555 00 00 00',rules:[{brand:'Toyota',model:'Prius',category:'განათება'}]});assert.equal(r.status,200);
let snapshot=(await api()).data;assert.equal(snapshot.shop.status,'pending');
r=await api({action:'offer',requestId:snapshot.requests.find(x=>x.part==='QA ფარი').id,price:300,condition:'მეორადი',delivery:'დღეს',note:'სატესტო'});assert.equal(r.status,403);
assert.equal((await api({action:'moderateShop',id:snapshot.shop.id,status:'approved'})).status,200);
assert.equal((await api({action:'offer',requestId:'qa-external',price:350,condition:'მეორადი',delivery:'დღესვე',note:'ტესტისთვის'})).status,200);
assert.equal((await api({action:'offer',requestId:'qa-wrong',price:350,condition:'მეორადი',delivery:'დღესვე',note:'ტესტისთვის'})).status,403);
assert.equal((await api({action:'offer',requestId:'qa-external',price:350,condition:'მეორადი',delivery:'დღესვე',note:'ტესტისთვის'})).status,400);
assert.equal((await api({action:'accept',id:'qa-offer'})).status,200);
snapshot=(await api()).data;assert.equal(snapshot.requests.find(x=>x.id==='qa-own').status,'closed');assert.equal(snapshot.offers.find(x=>x.id==='qa-offer').status,'accepted');
assert.equal((await api({action:'accept',id:'qa-offer'})).status,400);
assert.equal((await api({action:'accept',id:'qa-foreign-offer'})).status,403);
assert.equal((await fetch(base+'/api',{method:'POST',headers:{Cookie:'__sites_local_auth=1',Origin:'https://wrong.example','Content-Type':'application/json'},body:JSON.stringify({action:'close',id:'qa-own'})})).status,403);
console.log('PASS: auth, create request, pending store rejection, approve store, matching offer, mismatch rejection, duplicate rejection, atomic acceptance, ownership, CSRF');
