package ge.partflow.customer

import android.Manifest
import android.content.pm.PackageManager
import android.location.*
import android.os.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.platform.LocalContext

@Composable fun TowLocation(onLocation:(Double,Double)->Unit,onError:(String)->Unit){
 val context=LocalContext.current
 var locating by remember{mutableStateOf(false)}
 val manager=remember{context.getSystemService(android.content.Context.LOCATION_SERVICE) as LocationManager}
 var listener by remember{mutableStateOf<LocationListener?>(null)}
 val handler=remember{Handler(Looper.getMainLooper())}
 fun locate(){
  try{
   val provider=if(manager.isProviderEnabled(LocationManager.GPS_PROVIDER))LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
   locating=true
   val active=object:LocationListener{
    override fun onLocationChanged(location:Location){onLocation(location.latitude,location.longitude);locating=false;manager.removeUpdates(this);listener=null}
    override fun onProviderEnabled(provider:String){}
    override fun onProviderDisabled(provider:String){}
    @Deprecated("Legacy callback") override fun onStatusChanged(provider:String?,status:Int,extras:Bundle?){}
   }
   listener=active;manager.requestLocationUpdates(provider,0L,0f,active,Looper.getMainLooper())
   handler.postDelayed({if(listener===active){manager.removeUpdates(active);listener=null;locating=false;onError("მდებარეობა ვერ განისაზღვრა. ჩართე GPS და სცადე ხელახლა.")}},20000)
  }catch(_:Exception){locating=false;onError("ჩართე მდებარეობა და მიეცი აპს წვდომა.")}
 }
 val permission=rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()){result->if(result.values.any{it})locate()else onError("მდებარეობის წვდომა აუცილებელია SOS გამოძახებისთვის.")}
 DisposableEffect(Unit){onDispose{listener?.let{manager.removeUpdates(it)};handler.removeCallbacksAndMessages(null)}}
 PfOutlineButton(enabled=!locating,onClick={
  if(context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED||context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED)locate()
  else permission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION))
 }){Text(if(locating)"მდებარეობა იძებნება…" else "◎  ჩემი მდებარეობის გამოყენება")}
}
