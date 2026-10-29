import {createAiProvider} from './ai.mjs';
import {createOtpService} from './otp.mjs';
import {createServer} from 'node:http';
import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getAppCheck} from 'firebase-admin/app-check';
import {createService} from './service.mjs';
initializeApp({credential:applicationDefault()});
const origins=(process.env.PARTFLOW_ORIGINS||'https://teslamap.github.io').split(',');
const ai=createAiProvider();
const service=createService({db:getFirestore(),auth:getAuth(),appCheck:getAppCheck(),androidAppId:process.env.ANDROID_FIREBASE_APP_ID,ai});
const sms=process.env.SMS_ENDPOINT&&process.env.SMS_TOKEN?async body=>{const r=await fetch(process.env.SMS_ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+process.env.SMS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('SMS delivery failed')}:undefined;
const otp=createOtpService({db:getFirestore(),auth:getAuth(),sms,secret:process.env.OTP_HMAC_SECRET});
async function handle(req,res){const origin=req.headers.origin;if(origin&&!origins.includes(origin)){res.writeHead(403);res.end();return}const cors={'Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Headers':'Authorization,Content-Type,X-Firebase-AppCheck','Access-Control-Allow-Methods':'POST,OPTIONS'};if(req.method==='OPTIONS'){res.writeHead(204,cors);res.end();return}let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>50000){res.writeHead(413,cors);res.end();return}chunks.push(chunk)}const request=new Request('https://partflow.invalid'+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});let response;
if(['/sms-start','/sms-confirm','/recovery-start','/recovery-confirm'].includes(req.url)){try{if(req.method!=='POST')throw Object.assign(Error('POST required'),{status:405});const d=JSON.parse(Buffer.concat(chunks).toString()),recovery=req.url.startsWith('/recovery'),uid=recovery?null:(await service.authenticate(request)).uid,purpose=recovery?'recovery':'verify';response=Response.json(await (req.url.endsWith('start')?otp.start({uid,phone:d.phone,purpose,clientIp:req.socket.remoteAddress}):otp.confirm({uid,challengeId:d.challengeId,code:d.code,purpose})))}catch(e){response=Response.json({error:e.status?e.message:'Request failed'},{status:e.status||500})}}
else response=await service.handle(request);res.writeHead(response.status,{...cors,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await response.text())}
createServer((req,res)=>{void handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"Request failed"}')})}).listen(Number(process.env.PORT||8787),'127.0.0.1');
