import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getFirestore,FieldPath} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
const projectId=process.env.GCLOUD_PROJECT,storageBucket=process.env.PARTFLOW_STORAGE_BUCKET;
if(!projectId||!storageBucket)throw Error('Set GCLOUD_PROJECT and PARTFLOW_STORAGE_BUCKET explicitly');
initializeApp({projectId,storageBucket,credential:applicationDefault()});
const db=getFirestore(),bucket=getStorage().bucket(),apply=process.argv.includes('--apply');let cursor,scanned=0,candidates=0,changed=0;
for(;;){
 let q=db.collection('pf_requests').orderBy(FieldPath.documentId()).limit(50);if(cursor)q=q.startAfter(cursor);const page=await q.get();if(page.empty)break;
 for(const row of page.docs){
  scanned++;const d=row.data(),photos=d.photos;if(!Array.isArray(photos)||!photos.some(p=>typeof p==='string'&&p.startsWith('data:image/jpeg;base64,')))continue;
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(d.ownerId)||!/^[A-Za-z0-9_-]{1,128}$/.test(row.id)||photos.length>4)throw Error('Invalid request photo path');
  candidates++;if(!apply)continue;
  const updated=await Promise.all(photos.map(async(p,i)=>{
   if(typeof p!=='string'||!p.startsWith('data:image/jpeg;base64,'))return p;
   const bytes=Buffer.from(p.slice('data:image/jpeg;base64,'.length),'base64');if(bytes.length>135000||bytes[0]!==255||bytes[1]!==216)throw Error('Invalid JPEG '+row.id);
   const file=bucket.file('requestPhotos/'+d.ownerId+'/'+row.id+'/'+i+'.jpg');await file.save(bytes,{resumable:false,contentType:'image/jpeg',metadata:{cacheControl:'private,no-store'}});return 'pf-storage:'+i;
  }));
  if(await db.runTransaction(async tx=>{const current=await tx.get(row.ref);if(!current.exists||JSON.stringify(current.data().photos)!==JSON.stringify(photos))return false;tx.update(row.ref,{photos:updated});return true;}))changed++;
 }
 cursor=page.docs.at(-1);if(page.size<50)break;
}
console.log(JSON.stringify({scanned,candidates,changed,apply}));
