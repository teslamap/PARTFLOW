package com.partflow.customer;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;
import java.util.Collections;

/** Remote customer-only WebView. No native JavaScript interface is exposed. */
public class MainActivity extends AppCompatActivity {
    private static final String HOST = "teslamap.github.io";
    private static final String PATH = "/PARTFLOW/mobile-customer.html";
    private WebView web;
    private LinearLayout failure;
    private ValueCallback<Uri[]> files;
    private long backgroundAt;

    @Override public void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        FirebaseApp.initializeApp(this);
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance());
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff142332);
        root.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        web = new WebView(this);
        web.setBackgroundColor(0xfff7f8fa);
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        failure = new LinearLayout(this);
        failure.setOrientation(LinearLayout.VERTICAL);
        failure.setPadding(32,64,32,32);
        TextView text = new TextView(this);
        text.setText("PARTFLOW\n\nგვერდი ვერ ჩაიტვირთა. შეამოწმე ინტერნეტთან კავშირი.");
        text.setTextColor(0xffffffff);text.setTextSize(18);
        failure.addView(text);
        Button retry = new Button(this);retry.setText("ხელახლა ცდა");retry.setOnClickListener(v->loadHome());failure.addView(retry);
        failure.setVisibility(View.GONE);root.addView(failure,new LinearLayout.LayoutParams(-1,-1));
        setContentView(root);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString()+" PartflowAndroid/2");
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        if(Build.VERSION.SDK_INT>=26)settings.setSafeBrowsingEnabled(true);
        WebView.setWebContentsDebuggingEnabled(false);
        if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
            WebViewCompat.addWebMessageListener(web,"PartflowAppCheck",Collections.singleton("https://"+HOST),(view,message,origin,isMainFrame,reply)->{
                if(!isMainFrame||!"https".equals(origin.getScheme())||!HOST.equals(origin.getHost())||!PATH.equals(Uri.parse(view.getUrl()).getPath())||!"appCheckToken".equals(message.getData()))return;
                FirebaseAppCheck.getInstance().getAppCheckToken(false)
                    .addOnSuccessListener(result->reply.postMessage("{\"token\":"+org.json.JSONObject.quote(result.getToken())+",\"expireTimeMillis\":"+result.getExpireTimeMillis()+"}"))
                    .addOnFailureListener(error->reply.postMessage("{}"));
            });
        }
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                if(!request.isForMainFrame())return false;
                Uri uri=request.getUrl();
                if(allowed(uri))return false;
                if("tel".equals(uri.getScheme())||"mailto".equals(uri.getScheme())){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException ignored){}
                }
                // Shop, admin and other origins never open inside this app.
                return true;
            }
            @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showFailure();}
            @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame()&&response.getStatusCode()>=400)showFailure();}
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){handler.cancel();showFailure();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(files!=null)files.onReceiveValue(null);files=callback;
                Intent intent=new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
                try{startActivityForResult(Intent.createChooser(intent,"ფოტოების არჩევა"),41);}catch(ActivityNotFoundException e){files.onReceiveValue(null);files=null;}
                return true;
            }
        });
        loadHome();
    }
    static boolean allowed(Uri uri){return "https".equals(uri.getScheme())&&HOST.equals(uri.getHost())&&uri.getPort()==-1&&uri.getUserInfo()==null&&PATH.equals(uri.getPath());}
    private void showFailure(){web.setVisibility(View.GONE);failure.setVisibility(View.VISIBLE);}
    private void loadHome(){failure.setVisibility(View.GONE);web.setVisibility(View.VISIBLE);web.loadUrl("https://"+HOST+PATH+"?app=android&v="+System.currentTimeMillis(),Collections.singletonMap("Cache-Control","no-cache"));}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode==41&&files!=null){files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode,data));files=null;}}
    @Override protected void onStop(){super.onStop();backgroundAt=System.currentTimeMillis();CookieManager.getInstance().flush();}
    @Override protected void onResume(){super.onResume();if(web!=null&&backgroundAt>0&&System.currentTimeMillis()-backgroundAt>60000){web.evaluateJavascript("Boolean(document.querySelector('[aria-modal=\"true\"],input:focus,textarea:focus'))",active->{if("false".equals(active))loadHome();});}backgroundAt=0;}
    @Override public void onBackPressed(){web.evaluateJavascript("Boolean(document.querySelector('[aria-modal=\"true\"]'))",modal->{if("true".equals(modal)){web.evaluateJavascript("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))",null);}else if(web.canGoBack())web.goBack();else moveTaskToBack(true);});}
    @Override protected void onDestroy(){if(files!=null)files.onReceiveValue(null);if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
