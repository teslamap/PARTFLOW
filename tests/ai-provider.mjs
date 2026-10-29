import assert from 'node:assert/strict';
import {createAiProvider} from '../server/ai.mjs';
assert.equal(createAiProvider({}),undefined);
assert.throws(()=>createAiProvider({AI_ENDPOINT:'http://unsafe',AI_TOKEN:'secret',AI_MODEL:'test'}),/HTTPS/);
const env={CLOUDFLARE_ACCOUNT_ID:'account',CLOUDFLARE_API_TOKEN:'secret',AI_MODEL:'test'};
let sent;
const ai=createAiProvider(env,async(url,options)=>{sent={url,options};return Response.json({choices:[{message:{content:JSON.stringify({question:'რომელი ნაწილი?'})}}]})});
assert.deepEqual(await ai({messages:[{role:'user',content:'Tesla',extra:'ignored'}],vehicle:null,categories:[]}),{question:'რომელი ნაწილი?'});
assert.equal(sent.url,'https://api.cloudflare.com/client/v4/accounts/account/ai/v1/chat/completions');
assert.equal(sent.options.headers.Authorization,'Bearer secret');
const body=JSON.parse(sent.options.body);assert.equal(body.messages[0].role,'system');assert.deepEqual(body.messages[1],{role:'user',content:'Tesla'});assert.equal(sent.options.redirect,'error');
for(const response of [()=>new Response('',{status:503}),()=>Response.json({choices:[]}),()=>Response.json({choices:[{message:{content:'[]'}}]}),()=>Response.json({choices:[{message:{content:'broken'}}]})]){
 await assert.rejects(createAiProvider(env,async()=>response())({messages:[],vehicle:null,categories:[]}));
}
console.log('PASS: AI provider configuration, Cloudflare request, malformed responses and failures');
