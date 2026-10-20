import {readFileSync,writeFileSync,cpSync,realpathSync,rmSync} from 'node:fs';
import {join,sep} from 'node:path';
cpSync('android-overrides','android',{recursive:true});
const file='android/app/build.gradle';
let gradle=readFileSync(file,'utf8');
gradle=gradle.replace('versionCode 1','versionCode 2').replace('versionName "1.0"','versionName "2.0"');
if(!gradle.includes('// Remote-only WebView assets'))gradle+='\n// Remote-only WebView assets: no bundled website or Capacitor bridge configuration.\nandroid { sourceSets { main { assets { exclude "public/**", "capacitor.config.json", "capacitor.plugins.json" } } } }\n';
writeFileSync(file,gradle);
// Remove only Capacitor-generated web assets inside this native project.
// Resolve and check the parent before deleting a directory on Windows or CI.
const androidRoot=realpathSync('android'),assets=realpathSync('android/app/src/main/assets');
if(!assets.startsWith(androidRoot+sep))throw Error('Android asset directory is outside the project');
rmSync(join(assets,'public'),{recursive:true,force:true});
for(const name of ['capacitor.config.json','capacitor.plugins.json'])rmSync(join(assets,name),{force:true});
console.log('Prepared remote customer-only WebView: https://teslamap.github.io/PARTFLOW/mobile-customer.html');
