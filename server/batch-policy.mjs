import {CITIES} from '../src/core.mjs';
export const BATCH_DEFAULTS=Object.freeze({transport:false,shopReferrals:false,support:false,discounts:false,perCreatorGEL:5,requireCompletedOrder:true,minAccountDays:7,lowFeeFloorGEL:null});
export function check(ok,status,message){if(!ok)throw Object.assign(Error(message),{status})}
export function key(v){check(typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v),400,'Invalid identifier');return v}
export function text(v,max,optional=false){check(typeof v==='string'&&v.trim().length<=max&&(optional||v.trim().length>0),400,'Invalid text');return v.trim()}
export function city(v){check(CITIES.includes(v)&&v!=='სხვა',400,'Choose a supported city');return v}
export function money(v){check(Number.isSafeInteger(v)&&v>=1&&v<=100000,400,'Invalid GEL amount');return v}
export function batchPolicy(d){
 const p={...BATCH_DEFAULTS,...d};
 check(Object.keys(p).every(k=>Object.hasOwn(BATCH_DEFAULTS,k)),400,'Unknown policy field');
 for(const k of ['transport','shopReferrals','support','discounts','requireCompletedOrder'])check(typeof p[k]==='boolean',400,'Invalid switch');
 check(Number.isSafeInteger(p.perCreatorGEL)&&p.perCreatorGEL>=1&&p.perCreatorGEL<=50&&Number.isSafeInteger(p.minAccountDays)&&p.minAccountDays>=0&&p.minAccountDays<=365,400,'Invalid qualification rule');
 check(p.lowFeeFloorGEL===null||(Number.isSafeInteger(p.lowFeeFloorGEL)&&p.lowFeeFloorGEL>=1&&p.lowFeeFloorGEL<=100000),400,'Invalid low fee floor');return p;
}
export function monthlyQuote(fee,count,policy){
 money(fee);check(Number.isSafeInteger(count)&&count>=0,400,'Invalid count');const p=batchPolicy(policy);
 // Standard plan never drops below 50 GEL. Other plans require an explicit floor.
 const unresolved=fee!==100&&p.lowFeeFloorGEL===null;
 const floor=fee===100?50:p.lowFeeFloorGEL;
 const discount=p.discounts&&!unresolved?Math.min(50,Math.max(0,fee-floor),Math.min(count,50)*p.perCreatorGEL):0;
 return {maximumFeeGEL:fee,discountGEL:discount,dueGEL:fee-discount,discountRulePending:unresolved};
}
export function transportInput(d,now=Date.now()){
 check(['sos','intercity'].includes(d.mode),400,'Invalid transport mode');const value={mode:d.mode,city:city(d.city),destinationCity:city(d.destinationCity),destination:text(d.destination,500),notes:text(d.notes||'',2000,true),phone:text(d.phone,30)};
 check(/^[+0-9 ()-]{9,30}$/.test(value.phone),400,'Invalid phone');
 const p=d.pickup;check(p&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180,400,'Phone pickup location required');value.pickup={lat:p.lat,lng:p.lng};
 if(d.mode==='intercity'){check(value.city!==value.destinationCity,400,'Choose different cities');check(Number.isSafeInteger(d.scheduledAt)&&d.scheduledAt>now&&d.scheduledAt<=now+366*86400000,400,'Future date/time required');value.scheduledAt=d.scheduledAt}else value.scheduledAt=null;
 return value;
}
// Georgian business months (UTC+4), independent of server/client timezone.
export const billingMonth=(now=Date.now())=>new Date(now+4*3600000).toISOString().slice(0,7);
