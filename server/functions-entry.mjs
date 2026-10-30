import {onRequest} from 'firebase-functions/v2/https';
import {initializeApp,getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getAppCheck} from 'firebase-admin/app-check';
import {createService} from './service.mjs';
if(!getApps().length)initializeApp();
const service=createService({db:getFirestore(),auth:getAuth(),appCheck:getAppCheck(),androidAppId:'1:429553713786:android:d48cc58d5f40b8a64db1c3'});
// Dedicated codebase; never deploy/delete the unrelated push functions.
export const partflowBatch=onRequest({region:'europe-west1',minInstances:0,maxInstances:1,concurrency:20,memory:'256MiB',timeoutSeconds:60,cors:['https://teslamap.github.io','https://menio-8de8f.web.app','https://menio-8de8f.firebaseapp.com'],invoker:'public'},async(req,res)=>{
 if(req.method!=='POST'){res.status(405).json({error:'POST required'});return}
 if(!/^\/batch-[a-z-]+$/.test(req.path)){res.status(404).json({error:'Unknown action'});return}
 if(!req.rawBody||req.rawBody.length>50000){res.status(413).json({error:'Request too large'});return}
 const headers=new Headers();for(const name of ['authorization','content-type','x-firebase-appcheck'])if(typeof req.headers[name]==='string')headers.set(name,req.headers[name]);
 const response=await service.handle(new Request('https://partflow.invalid'+req.path,{method:'POST',headers,body:req.rawBody}),{clientIp:req.ip||req.socket.remoteAddress});
 res.set('Cache-Control','no-store').status(response.status).type('application/json').send(await response.text());
});
