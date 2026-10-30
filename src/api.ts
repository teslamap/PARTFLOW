import {auth,androidAppCheckToken} from './firebase';
export const endpoint=import.meta.env.VITE_API_BASE||'';
export async function api(action:string,data:any,anonymous=false,base=endpoint){
 if(!base)throw Error('სერვერი ჯერ არ არის კონფიგურირებული');
 const headers:any={'Content-Type':'application/json'};
 if(!anonymous){const token=await auth.currentUser?.getIdToken();if(!token)throw Error('შესვლა აუცილებელია');headers.Authorization='Bearer '+token;const attestation=await androidAppCheckToken();if(attestation)headers['X-Firebase-AppCheck']=attestation}
 const r=await fetch(base.replace(/\/$/,'')+'/'+action,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(35000)});
 let value;try{value=await r.json()}catch{throw Error('სერვერის პასუხი ვერ დამუშავდა')}
 if(!r.ok)throw Error(value.error||'მოქმედება ვერ შესრულდა');return value;
}
