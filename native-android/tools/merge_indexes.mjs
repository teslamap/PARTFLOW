import fs from 'node:fs';
const deployed=JSON.parse(fs.readFileSync(process.argv[2]||'native-android/.index-inventory.json','utf8').replace(/^\uFEFF/,''));
if(deployed.status!=='success')throw Error('Live index inventory failed');
const local=JSON.parse(fs.readFileSync('firestore.indexes.json','utf8'));
const indexes=[];const seen=new Set();
function add(c,fields,scope='COLLECTION') {
  const item={collectionGroup:c,queryScope:scope,fields:fields.filter(f=>f.fieldPath!=='__name__').map(f=>({...f}))};
  const key=JSON.stringify({...item,fields:[...item.fields].sort((a,b)=>a.fieldPath.localeCompare(b.fieldPath))});
  if(item.fields.length>=2&&!seen.has(key)){seen.add(key);indexes.push(item)}
}
for(const spec of [...deployed.result.indexes,...local.indexes])add(spec.collectionGroup,spec.fields,spec.queryScope);
function ordered(c,...fields){add(c,[...fields.map(fieldPath=>({fieldPath,order:'ASCENDING'})),{fieldPath:['pf_tow_drivers'].includes(c)?'updatedAt':'createdAt',order:'DESCENDING'}])}
for(const fields of [['ownerId'],['status'],['status','brand'],['status','model'],['status','category'],['status','brand','model'],['status','brand','category'],['status','model','category'],['status','brand','model','category']])ordered('pf_requests',...fields);
for(const fields of [['ownerId'],['shopId'],['requestId','ownerId'],['requestId','shopId']])ordered('pf_offers',...fields);
for(const fields of [['ownerId'],['shopId']])ordered('pf_orders',...fields);
ordered('pf_shops','ownerId');ordered('pf_shops','businessType','status');
ordered('pf_tow_drivers','ownerId');
for(const fields of [['ownerId'],['driverId'],['status','scope'],['status','scope','city']])ordered('pf_tow_requests',...fields);
for(const c of ['catalog','staff','closures'])ordered(c,'active');
ordered('pf_messages','offerId');ordered('pf_deletions','status');
const overrides=new Map();
for(const item of [...deployed.result.fieldOverrides,...local.fieldOverrides])overrides.set(item.collectionGroup+'|'+item.fieldPath,item);
fs.writeFileSync('native-android/firestore.indexes.json',JSON.stringify({indexes,fieldOverrides:[...overrides.values()]},null,2)+'\n');
console.log(`Preserved ${deployed.result.indexes.length} deployed indexes; combined index set: ${indexes.length}`);
