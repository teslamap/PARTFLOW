import {orderLabels} from './commerce.mjs';
import {shopPanelRequests} from './core.mjs';
import {ms} from './marketplace-policy.mjs';
const time=value=>{const t=ms(value);return Number.isFinite(t)?t:0};
export function buildNotifications({uid,requests=[],offers=[],orders=[],messages=[],confirmations=[],marketplace=false,shop=null}){
 const notices=[];
 for(const c of confirmations){if(!(c.status==='pending'||c.status==='withdrawn'?c.ownerId===uid:c.shopId===uid))continue;if(c.status==='pending'&&!requests.some(r=>r.id===c.requestId&&(r.status==='open'||r.acceptedOfferId===c.offerId)))continue;notices.push({id:'confirmation_'+c.id+'_'+c.version+'_'+c.status,label:c.status==='pending'?'შეკვეთის დადასტურების მოთხოვნა':'შეკვეთის პასუხი: '+({accepted:'დადასტურებული',declined:'უარყოფილი',withdrawn:'გაუქმებული'}[c.status]||c.status),requestId:c.requestId,offerId:c.offerId,time:time(c.updatedAt)})}
 for(const m of messages)if(m.senderId!==uid&&(m.ownerId===uid||m.shopId===uid))notices.push({id:'message_'+m.id,label:'ახალი შეტყობინება',requestId:m.requestId,offerId:m.offerId,time:time(m.createdAt)});
 for(const o of offers)if(o.ownerId===uid)notices.push({id:'offer_'+o.id,label:'ახალი შეთავაზება',requestId:o.requestId,offerId:o.id,time:time(o.createdAt)});
 for(const o of orders)if((o.ownerId===uid||o.shopId===uid)&&(o.version>0||o.shopId===uid))notices.push({id:'order_'+o.id+'_'+o.version,label:'შეკვეთა: '+orderLabels[o.status]+(o.dispute==='open'?' · დავა':''),requestId:o.requestId,orderId:o.id,time:time(o.updatedAt||o.createdAt)});
 if(marketplace){
  if(shop?.id===uid)for(const r of shopPanelRequests(requests,shop,offers))if(r.status==='open'&&r.ownerId!==uid&&!offers.some(o=>o.requestId===r.id&&o.shopId===uid))notices.push({id:'match_'+r.id,label:'ახალი შესაბამისი მოთხოვნა · '+r.part,requestId:r.id,time:time(r.createdAt)});
  for(const c of confirmations){const o=offers.find(o=>o.id===c.offerId);if(c.ownerId===uid&&c.status==='pending'&&o&&Number(c.price)<Number(o.price))notices.push({id:'price_'+c.id+'_'+c.version,label:'ფასი შემცირდა · '+(Number(o.price)-Number(c.price)).toFixed(2)+' ₾',requestId:c.requestId,offerId:c.offerId,time:time(c.updatedAt)})}
 }
 return [...new Map(notices.filter(n=>typeof n.requestId==='string').map(n=>[n.id,n])).values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
}
