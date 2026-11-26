export const VALID_DAYS=[1,3,7,14,30];
export const CANCEL_REASONS={no_part:'ნაწილი აღარ არის',price:'ფასზე ვერ შევთანხმდით',changed_mind:'მოთხოვნა აღარ მჭირდება',delivery:'მიწოდების პირობები',other:'სხვა'};
export const REPORT_REASONS={misleading:'არასწორი ინფორმაცია',abuse:'შეუფერებელი ქცევა',fraud:'საეჭვო თაღლითობა',other:'სხვა'};
export const ms=v=>v?.toMillis?.()??(typeof v==='string'?Date.parse(v):typeof v==='number'?v:NaN);
export function expiresAt(o){return VALID_DAYS.includes(o.validDays)?ms(o.renewedAt??o.createdAt)+o.validDays*86400000:Infinity}
export function activeQuote(o,now=Date.now()){return expiresAt(o)>now}
export function totalPrice(o){return Number(o.price)+(o.serviceAvailable===true?Number(o.servicePrice||0):0)}
export function priceStats(offers){const values=offers.map(o=>Number(o.price)).filter(v=>Number.isFinite(v)&&v>0);return values.length?{count:values.length,min:Math.min(...values),max:Math.max(...values),average:values.reduce((a,b)=>a+b,0)/values.length}:null}
export function demandStats(requests){const map=new Map();for(const r of requests){if(r.status==='hidden')continue;const key=[r.brand,r.model,r.category].join(' · ');map.set(key,(map.get(key)||0)+1)}return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))}
export function repeatFields(r){return Object.fromEntries(['brand','model','year','engine','vin','category','part','description','city','condition','budget'].map(k=>[k,r[k]??(k==='budget'?null:'')]))}
export function responseSeconds(request,offer){const delta=(ms(offer.createdAt)-ms(request.createdAt))/1000;return Number.isFinite(delta)&&delta>=0?Math.floor(delta):null}
