import {readFileSync,writeFileSync,cpSync} from 'node:fs';
// Use after cap add/sync. This is an opt-in alternative to the bridge-free v2 APK.
// Keep the Capacitor bridge configuration and plugin registry for native FCM.
cpSync('android-overrides','android',{recursive:true});
const configPath='android/app/src/main/assets/capacitor.config.json';
const config=JSON.parse(readFileSync(configPath,'utf8'));
config.server={url:'https://teslamap.github.io/PARTFLOW/mobile-customer.html',cleartext:false,androidScheme:'https'};
writeFileSync(configPath,JSON.stringify(config,null,2));
writeFileSync('android/app/src/main/java/com/partflow/customer/MainActivity.java',`package com.partflow.customer;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  bridge.getWebView().getSettings().setUserAgentString(bridge.getWebView().getSettings().getUserAgentString()+" PartflowAndroid/3");
  bridge.setWebViewClient(new BridgeWebViewClient(bridge){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    if(!request.isForMainFrame())return false;
    Uri u=request.getUrl();
    return !("https".equals(u.getScheme())&&"teslamap.github.io".equals(u.getHost())&&u.getPort()==-1&&u.getUserInfo()==null&&"/PARTFLOW/mobile-customer.html".equals(u.getPath()));
   }
  });
 }
}
`);
let gradle=readFileSync('android/app/build.gradle','utf8').replace('versionCode 1','versionCode 3').replace('versionName "1.0"','versionName "3.0"');
writeFileSync('android/app/build.gradle',gradle);
console.log('Push-ready customer bridge prepared. Add Android app google-services.json before building.');
