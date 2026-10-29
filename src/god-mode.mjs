import {doc,collection,runTransaction,serverTimestamp,onSnapshot} from 'firebase/firestore';

export const FLAGS=Object.freeze({godMode:'GOD MODE',maintenance:'ტექნიკური მომსახურება',aiOrderAssistant:'AI შეკვეთები',anonymousApkAuth:'ანონიმური APK ავტორიზაცია',smsOtp:'SMS კოდი',phoneRecovery:'ტელეფონის აღდგენა',emailLinking:'ელფოსტის მიბმა',referrals:'რეფერალები',loyaltyPoints:'ქულები',vouchers:'ვაუჩერები'});
export const DEFAULT_CONTROL=Object.freeze({schemaVersion:1,flags:Object.freeze({godMode:'OFF',maintenance:'OFF',aiOrderAssistant:'OFF',anonymousApkAuth:'OFF',smsOtp:'OFF',phoneRecovery:'OFF',emailLinking:'OFF',referrals:'OFF',loyaltyPoints:'OFF',vouchers:'OFF'}),message:'მიმდინარეობს ტექნიკური მომსახურება.'});
export const STATES=Object.freeze(['OFF','TEST','LIMITED','ON']);
export function normalizeControl(value={}){
 const flags={...DEFAULT_CONTROL.flags};
 for(const key of Object.keys(flags))if(STATES.includes(value.flags?.[key]))flags[key]=value.flags[key];
 return {schemaVersion:1,flags,message:typeof value.message==='string'?value.message.slice(0,240):DEFAULT_CONTROL.message,revision:Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0,updatedBy:value.updatedBy||'',updatedAt:value.updatedAt||null};
}
export function assertControl(value){
 if(!value||typeof value!=='object'||!value.flags||Object.keys(value.flags).length!==Object.keys(DEFAULT_CONTROL.flags).length||Object.keys(DEFAULT_CONTROL.flags).some(k=>!STATES.includes(value.flags[k])))throw Error('კონფიგურაცია არასწორია');
 if(typeof value.message!=='string'||value.message.trim().length<1||value.message.length>240)throw Error('შეტყობინება უნდა იყოს 1–240 სიმბოლო');
 return value;
}
export function listenControl(db,next,error){return onSnapshot(doc(db,'pf_settings','control'),s=>next(normalizeControl(s.data())),error)}
export async function saveControl(db,uid,current,draft,action='update'){
 if(!uid)throw Error('ავტორიზაცია აუცილებელია');assertControl(draft);
 return runTransaction(db,async tx=>{
  const target=doc(db,'pf_settings','control'),audit=collection(db,'pf_control_audit');
  const previous=await tx.get(target),before=normalizeControl(previous.data()),revision=before.revision+1;
  if(previous.exists()&&before.revision!==current.revision)throw Error('კონფიგურაცია შეიცვალა. განაახლე და სცადე ხელახლა.');
  tx.set(target,{schemaVersion:1,flags:{...draft.flags},message:draft.message.trim(),revision,updatedBy:uid,updatedAt:serverTimestamp()});
  tx.set(doc(audit),{action,revision,actorId:uid,before:{flags:before.flags,message:before.message},after:{flags:{...draft.flags},message:draft.message.trim()},createdAt:serverTimestamp()});
  return revision;
 });
}
