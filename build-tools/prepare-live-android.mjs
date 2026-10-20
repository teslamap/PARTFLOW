import {readFileSync,writeFileSync,cpSync} from 'node:fs';
cpSync('android-overrides','android',{recursive:true});
const file='android/app/build.gradle';
let gradle=readFileSync(file,'utf8');
gradle=gradle.replace('versionCode 1','versionCode 2').replace('versionName "1.0"','versionName "2.0"');
if(!gradle.includes('// Remote-only WebView assets'))gradle+='\n// Remote-only WebView assets: no bundled website or Capacitor bridge configuration.\nandroid { sourceSets { main { assets { exclude "public/**", "capacitor.config.json", "capacitor.plugins.json" } } } }\n';
writeFileSync(file,gradle);
console.log('Prepared remote customer-only WebView: https://teslamap.github.io/PARTFLOW/mobile-customer.html');
