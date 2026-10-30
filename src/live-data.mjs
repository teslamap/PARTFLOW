import {searchExpanded} from './search-expansion.mjs';
import {collection,doc,query,where,orderBy,limit,onSnapshot} from 'firebase/firestore';
import {CATEGORIES,sortCategories} from './core.mjs';

const row=(id,d)=>({...d,id,createdAt:d.createdAt?.toDate?.().toISOString()||'',...(d.rulesMap?{rules:Object.keys(d.rulesMap).filter(k=>d.rulesMap[k]===true).map(k=>{const [brand,model,category]=k.split('~');return {brand,model,category}})}:{})});
const unique=values=>[...new Map(values.flat().map(v=>[v.id,v])).values()];

// All queries mirror the existing participant/approval-based security rules.
// Rebuild listeners when role or shop specializations change, and detach on logout.
export function subscribePanelData(db,identity,next,error,{panel='customer'}={}){
 const isShop=panel==='shop',isCustomer=['customer','mobile-customer'].includes(panel),adminPanel=['admin','superadmin'].includes(panel);
 let stopped=false,generation=0,profile=null,shop=null,profileReady=false,shopReady=!isShop,signature='',children=[];
 const own=c=>doc(db,'pf_'+c,identity.id);
 function rebuild(){
  if(stopped||!profileReady||!shopReady)return;
  const key=JSON.stringify([profile,shop]);
  if(key===signature)return;signature=key;
  for(const stop of children)stop();children=[];const g=++generation;
  const requestSets=new Map(),offerSets=new Map(),extras=new Map(),extraStops=new Map(),pending=new Set();
  let categories=CATEGORIES,archives=[],shops=[],users=[],building=true;
  const isAdmin=adminPanel&&['admin','superadmin'].includes(profile?.role);
  if(adminPanel&&(!isAdmin||panel==='superadmin'&&profile?.role!=='superadmin')){next({user:{...identity,...profile},shop:null,categories:CATEGORIES,requests:[],offers:[],archives:[],shops:[],users:[]});error(new Error('ამ პანელის უფლება აღარ გაქვს.'));return;}
  function current(){return !stopped&&g===generation}
  function emit(){
   if(!current()||building||pending.size)return;
   const requests=unique([...requestSets.values(),[...extras.values()]]).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
   const offers=unique([...offerSets.values()]).map(o=>{const r=requests.find(r=>r.id===o.requestId);return {...o,status:r?.acceptedOfferId?r.acceptedOfferId===o.id?'accepted':'declined':'pending'}});
   next({user:{...identity,...profile},shop:shop?row(identity.id,shop):null,categories,requests,offers,archives,shops:unique([shops,shop?[row(identity.id,shop)]:[]]),users});
  }
  function reconcile(){
   if(!current()||building||[...pending].some(k=>k.startsWith('requests:')))return;
   const requests=unique([...requestSets.values()]),offers=unique([...offerSets.values()]);
   const needed=new Set(offers.filter(o=>!requests.some(r=>r.id===o.requestId)).map(o=>o.requestId));
   for(const [id,stop] of extraStops)if(!needed.has(id)){stop();extraStops.delete(id);extras.delete(id);pending.delete('extra:'+id)}
   for(const id of needed)if(!extraStops.has(id)){
    pending.add('extra:'+id);
    const stop=onSnapshot(doc(db,'pf_requests',id),s=>{if(!current())return;pending.delete('extra:'+id);if(s.exists())extras.set(id,row(s.id,s.data()));else extras.delete(id);emit()},e=>{if(current()){pending.delete('extra:'+id);extras.delete(id);error(e);emit()}});
    extraStops.set(id,stop);
   }
  }
  function watch(key,c,filters,receive){
   pending.add(key);
   let stop=()=>{},timer,attempt=0;
   function connect(){
    if(!current())return;pending.add(key);
    stop=onSnapshot(query(collection(db,'pf_'+c),...filters,orderBy('createdAt','desc'),limit(300)),s=>{if(!current())return;attempt=0;pending.delete(key);receive(s.docs.map(d=>row(d.id,d.data())));reconcile();emit()},e=>{if(!current())return;pending.delete(key);error(e);if(['failed-precondition','unavailable','deadline-exceeded'].includes(e.code))timer=setTimeout(connect,Math.min(30000,1500*2**Math.min(attempt++,5)));});
   }
   connect();children.push(()=>{stop();clearTimeout(timer)});
  }
  const requests=(key,filters)=>watch('requests:'+key,'requests',filters,v=>requestSets.set(key,v));
  const offers=(key,filters)=>watch('offers:'+key,'offers',filters,v=>offerSets.set(key,v));
  watch('categories','categories',[],v=>{categories=sortCategories([...CATEGORIES,...v.map(r=>r.name)])});
  pending.add('archives');
  children.push(onSnapshot(query(collection(db,'pf_archives',identity.id,'panels',panel,'items'),orderBy('createdAt','desc')),s=>{if(!current())return;archives=s.docs.map(d=>row(d.id,d.data()));pending.delete('archives');emit()},e=>{if(current()){pending.delete('archives');error(e);emit()}}));
  if(isAdmin||isCustomer)requests('own',isAdmin?[]:[where('ownerId','==',identity.id)]);
  if(isShop&&shop?.status==='approved'&&shop?.businessType!=='auto_service')for(const [i,rule] of row(identity.id,shop).rules.entries()){
   const filters=[where('status','in',['open','closed'])];for(const k of ['brand','model','category'])if(rule[k]!=='*')filters.push(where(k,'==',rule[k]));requests('match'+i,filters);
  }
  if(isAdmin||isCustomer)offers('owner',isAdmin?[]:[where('ownerId','==',identity.id)]);
  if(isShop)offers('shop',[where('shopId','==',identity.id)]);
  watch('shops','shops',isAdmin?[]:[where('status','==','approved')],v=>{shops=v});
  if(panel==='superadmin'&&profile?.role==='superadmin')watch('users','members',[],v=>{users=v});
  children.push(()=>{for(const stop of extraStops.values())stop()});
  building=false;
  // No stale privileged/matched data remains visible while permissions change.
  next({user:{...identity,...profile},shop:shop?row(identity.id,shop):null,categories:CATEGORIES,requests:[],offers:[],archives:[],shops:shop?[row(identity.id,shop)]:[],users:[]});
  // Time passing does not trigger a Firestore snapshot. Re-evaluate matching locally.
  if(isShop){const expanded=new Set();const clock=setInterval(()=>{let changed=false;for(const r of unique([...requestSets.values()]))if(searchExpanded(r)&&!expanded.has(r.id)){expanded.add(r.id);changed=true}if(changed)emit()},1000);children.push(()=>clearInterval(clock))}
  reconcile();emit();
 }
 const roots=[
  onSnapshot(own('members'),s=>{if(stopped)return;profile=s.exists()?row(s.id,s.data()):{...identity,role:'customer'};profileReady=true;rebuild()},e=>{if(!stopped)error(e)})
 ];
 if(isShop)roots.push(onSnapshot(own('shops'),s=>{if(stopped)return;shop=s.exists()?s.data():null;shopReady=true;rebuild()},e=>{if(!stopped)error(e)}));
 return()=>{stopped=true;generation++;roots.forEach(stop=>stop());children.forEach(stop=>stop())};
}
