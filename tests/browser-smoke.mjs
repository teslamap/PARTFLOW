import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(process.env.PARTFLOW_BROWSER_PACKAGE||'/tmp/partflow-browser/package.json');
const {chromium}=require('playwright');
const root=resolve('dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),p=resolve(root,decodeURIComponent(url.pathname.replace(/^\/PARTFLOW\//,'')));if(!p.startsWith(root+sep)||!(await stat(p)).isFile())throw Error('missing');res.writeHead(200,{'Content-Type':types[extname(p)]||'application/octet-stream'});res.end(await readFile(p))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,base=origin+'/PARTFLOW/';
const browser=await chromium.launch({headless:true});
try{
 for(const name of ['customer','shop','admin','superadmin','mobile-customer','app','towing','services']){
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()>=400)missing.push(r.url())});
  await page.goto(base+name+'.html?demo=1');await page.locator('#root').locator('h1,h2').first().waitFor({timeout:20000});
  if(['customer','shop','admin','superadmin'].includes(name)){
   await page.locator('.demo-banner').waitFor();
   if(name==='customer'){await page.locator('.page-heading button.primary').click();await page.locator('[role=dialog] form').waitFor();await page.keyboard.press('Escape');await page.locator('[role=dialog]').waitFor({state:'hidden'});}
   if(name==='shop'){await page.locator('.sidebar nav button').first().click();}
  }
  if(['mobile-customer','app'].includes(name)){await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'ახალი მოთხოვნა',exact:true}).first().click();await page.locator('[role=dialog] form').waitFor();await page.keyboard.press('Escape');await page.locator('[role=dialog]').waitFor({state:'hidden'});}
  assert.deepEqual(errors,[],name+' JS errors');assert.deepEqual(missing,[],name+' missing local assets');await page.close();console.log('PASS browser smoke: '+name);
 }
}finally{await browser.close();await new Promise(r=>server.close(r))}
