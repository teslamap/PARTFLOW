package ge.partflow.customer

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import com.google.firebase.firestore.FirebaseFirestore
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

data class ShopPin(val id:String,val name:String,val city:String,val address:String,val lat:Double?,val lng:Double?)
@Composable fun ShopMap(request:CustomerRequest?=null){
 var shops by remember{mutableStateOf(emptyList<ShopPin>())}
 var error by remember{mutableStateOf("")}
 val context=LocalContext.current
 DisposableEffect(Unit){
  val l=FirebaseFirestore.getInstance().collection("pf_shops").whereEqualTo("status","approved").addSnapshotListener{snap,e->
   if(e!=null)error="მაღაზიების რუკა ვერ ჩაიტვირთა." else shops=snap?.documents?.map{d->
    val p=d.get("mapLocation") as? Map<*,*>
    ShopPin(d.id,d.getString("name").orEmpty(),d.getString("city").orEmpty(),d.getString("mapAddress").orEmpty(),(p?.get("lat") as? Number)?.toDouble(),(p?.get("lng") as? Number)?.toDouble())
   }.orEmpty()
  };onDispose{l.remove()}
 }
 var selectedShop by remember(request?.acceptedOfferId){mutableStateOf<String?>(null)}
 DisposableEffect(request?.acceptedOfferId){
  val id=request?.acceptedOfferId
  val l=if(id!=null)FirebaseFirestore.getInstance().collection("pf_offers").document(id).addSnapshotListener{d,e->if(e==null)selectedShop=d?.getString("shopId")}else null
  onDispose{l?.remove()}
 }
 val visible=if(request?.acceptedOfferId!=null)shops.filter{it.id==selectedShop} else shops
 val centers=mapOf("თბილისი" to GeoPoint(41.7151,44.8271),"ბათუმი" to GeoPoint(41.6461,41.6405),"ქუთაისი" to GeoPoint(42.2679,42.6946),"რუსთავი" to GeoPoint(41.5495,44.9932),"გორი" to GeoPoint(41.9842,44.1158),"ზუგდიდი" to GeoPoint(42.5088,41.8709),"ფოთი" to GeoPoint(42.1462,41.671),"თელავი" to GeoPoint(41.9198,45.4732))
 val map=remember{Configuration.getInstance().userAgentValue="PARTFLOW/0.2 (ge.partflow.customer.preview)";MapView(context).apply{setTileSource(TileSourceFactory.MAPNIK);setMultiTouchControls(true);controller.setZoom(7.0);controller.setCenter(GeoPoint(42.0,43.5))}}
 DisposableEffect(map){map.onResume();onDispose{map.onPause();map.onDetach()}}
 Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
  if(request==null)PfHeading("მაღაზიების რუკა","PARTFLOW · დამტკიცებული მაღაზიები")
  if(request?.acceptedOfferId!=null)Text("არჩეულია შეთავაზება — ნაჩვენებია მხოლოდ არჩეული მაღაზია.",color=Pf.muted,fontSize=12.sp)
  AndroidView(factory={map},modifier=Modifier.fillMaxWidth().height(320.dp),update={view->
   view.overlays.removeAll{it is Marker}
   visible.forEach{s->
    val exact=s.lat!=null&&s.lng!=null&&s.lat in -90.0..90.0&&s.lng in -180.0..180.0
    val point=if(exact)GeoPoint(s.lat!!,s.lng!!)else centers[s.city]
    if(point!=null)view.overlays.add(Marker(view).apply{position=point;title=s.name;snippet=if(exact)s.address else "ქალაქის ცენტრი — ზუსტი პინი დასაზუსტებელია";setAnchor(Marker.ANCHOR_CENTER,Marker.ANCHOR_BOTTOM)})
   }
   view.invalidate()
  })
  Text("© OpenStreetMap contributors · პინზე შეხებით იხილე დეტალები. დაუზუსტებელი პინი ქალაქის ცენტრს აღნიშნავს.",color=Pf.muted,fontSize=10.sp)
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=12.sp)
  if(visible.isEmpty())Text("მაღაზიების მდებარეობები ჯერ ხელმისაწვდომი არ არის.",color=Pf.muted,fontSize=12.sp)
  visible.forEach{s->PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
   Text(s.name,color=Pf.ink,fontSize=15.sp);Text(listOf(s.city,s.address).filter{it.isNotBlank()}.joinToString(" · "),color=Pf.muted,fontSize=12.sp)
   if(s.lat!=null&&s.lng!=null)PfOutlineButton({try{context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("geo:${s.lat},${s.lng}?q=${s.lat},${s.lng}")))}catch(_:Exception){error="რუკის აპი ვერ გაიხსნა."}}){Text("მარშრუტის გახსნა")}
  }}}
 }
}
