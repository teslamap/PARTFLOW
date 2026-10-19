import {createPanelSession,PANEL_ROLES} from '../src/auth-session';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('This test only runs locally');
const sessions=PANEL_ROLES.map(role=>createPanelSession({projectId:'demo-partflow',apiKey:'fake-emulator-key',appId:'demo:partflow:web:test',authDomain:'demo-partflow.firebaseapp.com'},role,'http://127.0.0.1:9099').auth);
const output=document.querySelector('#result')!,button=document.querySelector<HTMLButtonElement>('#run')!;
const log=(s:string)=>{output.textContent+='\n'+s;};
const check=(expected:boolean[],label:string)=>{const got=sessions.map(a=>!!a.currentUser);if(got.some((v,i)=>v!==expected[i]))throw Error(label+': '+JSON.stringify(got));log('PASS '+label+' '+JSON.stringify(got));};
async function run(){button.disabled=true;await Promise.all(sessions.map(a=>a.authStateReady()));const phase=sessionStorage.getItem('partflow-test-phase');
if(phase==='reload'){
check([false,true,true,false,true],'panel-specific sessions survive reload');
const saved=JSON.parse(sessionStorage.getItem('partflow-test-fixture')!);
await signOut(sessions[1]);check([false,false,true,false,true],'shop logout preserves admin session');
await signInWithEmailAndPassword(sessions[3],saved.email,saved.password);check([false,false,true,true,true],'superadmin login stays separate');
await signOut(sessions[3]);check([false,false,true,false,true],'superadmin logout preserves admin session');
await signOut(sessions[4]);
await signOut(sessions[2]);check([false,false,false,false,false],'all sessions explicitly signed out');
sessionStorage.removeItem('partflow-test-phase');sessionStorage.removeItem('partflow-test-fixture');log('ALL TESTS PASSED');return;
}
await Promise.all(sessions.map(a=>signOut(a)));
const email='isolation-'+Date.now()+'@example.com',password='Local-only-'+crypto.randomUUID();
await createUserWithEmailAndPassword(sessions[0],email,password);check([true,false,false,false,false],'customer login does not sign in other panels');
await signInWithEmailAndPassword(sessions[1],email,password);check([true,true,false,false,false],'shop requires its own sign-in');
await signOut(sessions[0]);check([false,true,false,false,false],'customer logout does not sign out shop');
await signInWithEmailAndPassword(sessions[4],email,password);check([false,true,false,false,true],'mobile requires separate login');
await signInWithEmailAndPassword(sessions[2],email,password);check([false,true,true,false,true],'admin login does not sign in superadmin');
sessionStorage.setItem('partflow-test-fixture',JSON.stringify({email,password}));sessionStorage.setItem('partflow-test-phase','reload');location.reload();
}
button.onclick=()=>run().catch(e=>{log('FAIL '+e.message);button.disabled=false;});
if(sessionStorage.getItem('partflow-test-phase')==='reload')run().catch(e=>log('FAIL '+e.message));

