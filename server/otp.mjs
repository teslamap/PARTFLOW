import {randomInt,randomBytes,createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {Timestamp,FieldValue} from 'firebase-admin/firestore';
import {enabled,DEFAULT_FLAGS} from '../src/feature-policy.mjs';
import {ApiError} from './service.mjs';
const fail=(ok,status,text)=>{if(!ok)throw new ApiError(status,text)};
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createOtpService({db,auth,sms,secret}){
 const ref=(c,id)=>db.collection('pf_'+c).doc(id);
 const digest=(id,code)=>createHmac('sha256',secret).update(id+':'+code).digest('hex');
 async function gate(tx,purpose){const c=await tx.get(ref('settings','control'));fail(enabled({...DEFAULT_FLAGS,...c.data()?.flags},'smsOtp')&&(purpose!=='recovery'||enabled(c.data()?.flags,'phoneRecovery')),403,'Feature disabled');fail(typeof sms==='function'&&typeof secret==='string'&&secret.length>=32,503,'SMS provider not configured')}
 function phone(value){fail(typeof value==='string'&&/^\+9955\d{8}$/.test(value),400,'Invalid phone');return value}
 async function start({uid,phone:value,purpose,clientIp}){fail(['verify','recovery'].includes(purpose),400,'Invalid purpose');phone(value);if(purpose==='verify')fail(uid,401,'Authentication required');fail(clientIp,503,'Trusted network identity required');const challenge=randomBytes(24).toString('hex'),code=String(randomInt(100000,1000000)),now=Date.now();
 const target=await db.runTransaction(async tx=>{await gate(tx,purpose);const limits=[ref('otp_rate',hash(value)),ref('otp_rate',hash(clientIp))],snapshots=await Promise.all(limits.map(r=>tx.get(r)));for(const s of snapshots){const d=s.data();fail(!d||d.until<now||d.count<10,429,'Too many SMS requests');fail(!d||d.last<now-60000,429,'Wait before retrying')}
 let owner=uid;if(purpose==='verify'){const contact=await tx.get(ref('contacts',uid));fail(contact.data()?.phone===value,409,'Save contact phone first')}else{const index=await tx.get(ref('verified_phones',hash(value)));owner=index.data()?.uid||null;if(owner){const contact=await tx.get(ref('contacts',owner));if(contact.data()?.phone!==value||contact.data()?.phoneVerified!==true)owner=null}}
 snapshots.forEach((s,i)=>{const d=s.data(),fresh=d&&d.until>now;tx.set(limits[i],{count:fresh?d.count+1:1,last:now,until:fresh?d.until:now+86400000,expiresAt:Timestamp.fromMillis(now+86400000)})});
 tx.create(ref('otp_challenges',challenge),{uid:owner,phone:value,purpose,digest:digest(challenge,code),attempts:0,consumed:false,expiresAt:Timestamp.fromMillis(now+300000)});return owner});
 // Non-existent recovery accounts get the same public response, without sending SMS.
 if(target)await sms({phone:value,code,expiresInSeconds:300});return {challengeId:challenge,expiresInSeconds:300};
 }
 async function confirm({uid,challengeId,code,purpose}){fail(typeof challengeId==='string'&&/^[a-f0-9]{48}$/.test(challengeId)&&typeof code==='string'&&/^\d{6}$/.test(code)&&['verify','recovery'].includes(purpose),400,'Invalid code');const result=await db.runTransaction(async tx=>{await gate(tx,purpose);const r=ref('otp_challenges',challengeId),s=await tx.get(r),d=s.data();fail(d&&d.purpose===purpose&&!d.consumed&&d.expiresAt.toMillis()>Date.now()&&d.attempts<5,400,'Invalid or expired code');if(purpose==='verify')fail(uid&&d.uid===uid,403,'Wrong challenge owner');const provided=digest(challengeId,code),correct=timingSafeEqual(Buffer.from(d.digest,'hex'),Buffer.from(provided,'hex'));if(!correct||!d.uid){tx.update(r,{attempts:d.attempts+1});return null}
 const contactRef=ref('contacts',d.uid),contact=await tx.get(contactRef),index=ref('verified_phones',hash(d.phone)),mapping=await tx.get(index);fail(contact.data()?.phone===d.phone,409,'Phone changed');if(purpose==='verify'){fail(!mapping.exists||mapping.data().uid===d.uid,409,'Phone already linked');tx.set(index,{uid:d.uid});tx.update(contactRef,{phoneVerified:true,updatedAt:FieldValue.serverTimestamp()})}else fail(mapping.data()?.uid===d.uid&&contact.data()?.phoneVerified===true,403,'Verified phone required');tx.update(r,{consumed:true,digest:FieldValue.delete()});return d.uid});fail(result,400,'Invalid or expired code');return purpose==='recovery'?{customToken:await auth.createCustomToken(result)}:{verified:true};
 }
 return {start,confirm};
}
