import {createHash} from 'node:crypto';
import {FieldValue,FieldPath} from 'firebase-admin/firestore';
const receiptId=(kind,id)=>createHash('sha256').update(kind+':'+id).digest('hex');
export async function recordShopMetric(db,kind,id,offerOrOrder){
 const shopId=offerOrOrder?.shopId;if(typeof shopId!=='string'||!shopId||shopId.includes('/'))return false;
 if(kind!=='offer'&&kind!=='completed')throw Error('Unknown metric');
 if(kind==='completed'&&offerOrOrder.status!=='completed')return false;
 let seconds=0;
 if(kind==='offer'){
  const request=await db.doc('pf_requests/'+offerOrOrder.requestId).get(),start=request.data()?.createdAt?.toMillis?.(),end=offerOrOrder.createdAt?.toMillis?.();
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return false;
  seconds=Math.floor((end-start)/1000);
 }
 return db.runTransaction(async tx=>{
  const receipt=db.doc('pf_shop_metric_receipts/'+receiptId(kind,id)),metrics=db.doc('pf_shop_metrics/'+shopId),old=await tx.get(receipt),shop=await tx.get(db.doc('pf_shops/'+shopId));
  if(old.exists||!shop.exists)return false;
  tx.create(receipt,{kind,recordedAt:FieldValue.serverTimestamp()});
  tx.set(metrics,kind==='offer'?{responseCount:FieldValue.increment(1),responseSeconds:FieldValue.increment(seconds)}:{completedCount:FieldValue.increment(1)},{merge:true});
  return true;
 });
}
export async function backfillShopMetrics(db,{apply=false}={}){
 let scanned=0,recorded=0;
 for(const [collection,kind] of [['pf_offers','offer'],['pf_orders','completed']]){
  let cursor;
  for(;;){
   let q=db.collection(collection).orderBy(FieldPath.documentId()).limit(200);if(cursor)q=q.startAfter(cursor);const page=await q.get();
   if(page.empty)break;
   for(const row of page.docs){scanned++;if(apply&&await recordShopMetric(db,kind,row.id,row.data()))recorded++;}
   cursor=page.docs.at(-1);if(page.size<200)break;
  }
 }
 return {scanned,recorded,apply};
}
