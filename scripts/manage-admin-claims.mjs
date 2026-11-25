import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const projectId=process.env.GCLOUD_PROJECT;if(!projectId)throw Error('Set GCLOUD_PROJECT explicitly');
initializeApp({projectId,...(process.env.FIREBASE_AUTH_EMULATOR_HOST?{}:{credential:applicationDefault()})});
const auth=getAuth(),db=getFirestore();
const [action,uid]=process.argv.slice(2),apply=process.argv.includes('--apply');
if(!['grant','revoke','cutover'].includes(action)||!uid||uid.startsWith('--'))throw Error('Usage: grant|revoke|cutover UID [--apply]');
const user=await auth.getUser(uid);
if(action!=='revoke'&&!user.emailVerified)throw Error('Verified email required');
if(action==='cutover'&&user.customClaims?.superadmin!==true)throw Error('Grant and verify a working admin claim first');
if(apply){
 if(action==='cutover')await db.collection('pf_settings').doc('adminIdentity').set({claimsOnly:true});
 else{const claims={...user.customClaims};if(action==='grant')claims.superadmin=true;else delete claims.superadmin;await auth.setCustomUserClaims(uid,claims);await auth.revokeRefreshTokens(uid);}
}
console.log(JSON.stringify({action,uid,applied:apply}));
