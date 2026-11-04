package ge.partflow.customer
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.*
import kotlinx.coroutines.delay
@Composable fun CustomerTowCard(tow:TowRequest,store:TowingData){
 val context=LocalContext.current
 var busy by remember(tow.id){mutableStateOf(false)};var error by remember{mutableStateOf("")};var action by remember{mutableStateOf("")}
 var now by remember{mutableStateOf(System.currentTimeMillis())}
 LaunchedEffect(tow.id){while(true){delay(30000);now=System.currentTimeMillis()}}
 PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(17.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
  Text(if(tow.mode=="sos")"● SOS გამოძახება" else "↗ ქალაქთაშორისი",color=Pf.ink,fontSize=16.sp)
  Text(tow.origin+" → "+tow.destination,color=Pf.ink,fontSize=14.sp)
  Text(tow.vehicle,color=Pf.muted,fontSize=12.sp)
  Text(statusLabel(tow.status),color=Pf.muted,fontSize=12.sp)
  if(tow.pickupAt>0)Text(java.text.SimpleDateFormat("dd.MM.yyyy HH:mm",java.util.Locale.getDefault()).format(java.util.Date(tow.pickupAt)),color=Pf.muted,fontSize=12.sp)
  if(tow.price.isNotBlank())Text(tow.price+" ₾",color=Pf.ink,fontSize=22.sp)
  if(tow.driverName.isNotBlank())Text("მძღოლი: "+tow.driverName,color=Pf.ink,fontSize=13.sp)
  if(tow.driverPhone.isNotBlank())PfOutlineButton(onClick={try{context.startActivity(Intent(Intent.ACTION_DIAL,Uri.parse("tel:"+tow.driverPhone)))}catch(_:Exception){error="ზარის აპი ვერ გაიხსნა."}}){Text("მძღოლთან დარეკვა")}
  if(tow.status=="offered")PfButton(enabled=!busy,onClick={action="confirmed"}){Text("მძღოლისა და ფასის დადასტურება")}
  if(tow.status in listOf("searching","offered","confirmed"))PfOutlineButton(enabled=!busy,onClick={action="cancelled"}){Text("გამოძახების გაუქმება")}
  if(tow.status=="transporting")PfButton(enabled=!busy,onClick={action="completed"}){Text("დასრულების დადასტურება")}
  if(tow.mode=="sos"&&tow.scope=="city"&&tow.status=="searching"&&tow.createdAt>0&&now-tow.createdAt>=900000){
   PfOutlineButton(enabled=!busy,onClick={busy=true;store.expand(tow.id){busy=false;error=it.orEmpty()}}){Text("სხვა ქალაქებშიც ძებნა")}
  }
  if(action.isNotBlank()){
   Text("ადასტურებ მოქმედებას?",color=Pf.ink,fontSize=13.sp)
   PfButton(enabled=!busy,onClick={busy=true;store.changeStatus(tow.id,action){busy=false;error=it.orEmpty();action=""}}){Text(if(busy)"მიმდინარეობს…" else "დიახ, ვადასტურებ")}
   PfTextButton(enabled=!busy,onClick={action=""}){Text("უკან")}
  }
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=12.sp)
 }}
}
