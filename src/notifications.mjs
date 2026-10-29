import {orderLabels} from './commerce.mjs';
const time=value=>value?.toMillis?.()||value?.toDate?.().getTime()||0;
export function buildNotifications({uid,requests=[],offers=[],orders=[],messages=[],confirmations=[]}){
 const notices=[];
 for(const c of confirmations){if(!(c.status==='pending'||c.status==='withdrawn'?c.ownerId===uid:c.shopId===uid))continue;if(c.status==='pending'&&!requests.some(r=>r.id===c.requestId&&(r.status==='open'||r.acceptedOfferId===c.offerId)))continue;notices.push({id:'confirmation_'+c.id+'_'+c.version+'_'+c.status,label:c.status==='pending'?'შეკვეთის დადასტურების მოთხოვნა':'შეკვეთის პასუხი: '+({accepted:'დადასტურებული',declined:'უარყოფილი',withdrawn:'გაუქმებული'}[c.status]||c.status),requestId:c.requestId,offerId:c.offerId,time:time(c.updatedAt)})}
 for(const m of messages)if(m.senderId!==uid&&(m.ownerId===uid||m.shopId===uid))notices.push({id:'message_'+m.id,label:'ახალი შეტყობინება',requestId:m.requestId,offerId:m.offerId,time:time(m.createdAt)});
 for(const o of offers)if(o.ownerId===uid)notices.push({id:'offer_'+o.id,label:'ახალი შეთავაზება',requestId:o.requestId,offerId:o.id,time:time(o.createdAt)});
 for(const o of orders)if((o.ownerId===uid||o.shopId===uid)&&(o.version>0||o.shopId===uid))notices.push({id:'order_'+o.id+'_'+o.version,label:'შეკვეთა: '+orderLabels[o.status]+(o.dispute==='open'?' · დავა':''),requestId:o.requestId,orderId:o.id,time:time(o.updatedAt||o.createdAt)});
 return [...new Map(notices.filter(n=>typeof n.requestId==='string').map(n=>[n.id,n])).values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
}
