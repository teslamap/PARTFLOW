import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
const pages=['index','customer','shop','admin','superadmin','mobile-customer','app','services','towing'];
const scripts=new Set(),styles=new Set();
for(const page of pages){
 const path='dist/'+page+'.html',html=readFileSync(path,'utf8');
 for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
  const url=match[1];if(/^(https?:|data:|#|mailto:)/.test(url))continue;
  assert.ok(!url.startsWith('/')&&!url.startsWith('../'),'non-portable '+page+': '+url);
  assert.ok(existsSync(resolve(dirname(path),url.split('?')[0])),'missing asset '+page+': '+url);
  if(url.endsWith('.js'))scripts.add(url);if(url.endsWith('.css'))styles.add(url);
 }
}
assert.ok(scripts.size>0&&scripts.size<8,'pages reuse shared script assets');assert.ok(styles.size>0);
assert.ok(existsSync('dist-mobile/index.html'));for(const url of scripts)assert.ok(existsSync(resolve('dist-mobile',url)));
console.log('PASS: shared JS/CSS, nine portable HTML entries and mobile asset packaging');
