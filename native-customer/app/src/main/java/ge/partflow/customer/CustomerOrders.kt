package ge.partflow.customer

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*

fun statusLabel(value:String)=mapOf("open" to "აქტიური","closed" to "დახურული","hidden" to "შეჩერებული","confirmed" to "დადასტურებული","preparing" to "მომზადება","shipped" to "გაგზავნილი","delivered" to "მიწოდებული","completed" to "დასრულებული","cancelled" to "გაუქმებული","searching" to "მძღოლის ძებნა","offered" to "შეთავაზება მიღებულია","pending" to "მოლოდინში")[value]?:value
@Composable fun CustomerOrders(){
 if(!featureEnabled("orders"))return
 val uid=FirebaseAuth.getInstance().currentUser?.uid?:return
 var orders by remember(uid){mutableStateOf(emptyList<Pair<String,Map<String,Any>>>())}
 var error by remember{mutableStateOf("")}
 DisposableEffect(uid){
  val l=FirebaseFirestore.getInstance().collection("pf_orders").whereEqualTo("ownerId",uid).addSnapshotListener{s,e->
   if(e!=null)error="შეკვეთები ვერ ჩაიტვირთა." else orders=s?.documents?.map{it.id to it.data.orEmpty()}.orEmpty()
  };onDispose{l.remove()}
 }
 Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
  Text("ჩემი შეკვეთები",color=Pf.ink,fontSize=18.sp)
  if(orders.isEmpty())Text("შეკვეთები ჯერ არ არის.",color=Pf.muted,fontSize=12.sp)
  orders.forEach{(id,o)->OrderCard(id,o)}
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=12.sp)
 }
}
@Composable private fun OrderCard(id:String,order:Map<String,Any>){
 var action by remember{mutableStateOf("")};var note by remember{mutableStateOf("")};var busy by remember{mutableStateOf(false)};var error by remember{mutableStateOf("")}
 val status=order["status"].toString();val dispute=order["dispute"].toString()
 PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
  Text(statusLabel(status),color=Pf.ink,fontSize=16.sp)
  if(dispute=="open")Text("დავა განხილვაშია",color=Pf.muted,fontSize=12.sp)
  if(dispute!="open"&&status=="delivered")PfOutlineButton({action="completed"}){Text("მიღების დადასტურება")}
  if(dispute!="open"&&status in listOf("confirmed","preparing"))PfOutlineButton({action="cancelled"}){Text("შეკვეთის გაუქმება")}
  if(dispute=="none")PfTextButton({action="dispute"}){Text("მხარდაჭერისთვის დავის გახსნა",color=Pf.muted)}
  if(action.isNotBlank()){
   PfField(note,{note=it.take(1000)},label={Text("კომენტარი / მიზეზი")})
   PfButton(enabled=!busy&&note.isNotBlank(),onClick={
    busy=true;changeOrder(id,action,note){busy=false;error=it.orEmpty();if(it==null){action="";note=""}}
   }){Text("დადასტურება")}
   PfTextButton({action=""}){Text("უკან")}
  }
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=12.sp)
 }}
}
private fun changeOrder(id:String,kind:String,note:String,done:(String?)->Unit){
 val uid=FirebaseAuth.getInstance().currentUser?.uid?:return done("ავტორიზაცია აუცილებელია.")
 val db=FirebaseFirestore.getInstance();val ref=db.collection("pf_orders").document(id)
 db.runTransaction{tx->
  val old=tx.get(ref);val status=old.getString("status");val dispute=old.getString("dispute")
  check(old.getString("ownerId")==uid&&note.trim().isNotEmpty()&&note.length<=1000)
  check((kind=="dispute"&&dispute=="none")||(dispute!="open"&&((kind=="completed"&&status=="delivered")||(kind=="cancelled"&&status in listOf("confirmed","preparing")))))
  val version=(old.getLong("version")?:0L)+1
  val nextStatus=if(kind=="dispute")status!! else kind
  val nextDispute=if(kind=="dispute")"open" else dispute!!
  val now=FieldValue.serverTimestamp()
  tx.update(ref,mapOf("status" to nextStatus,"dispute" to nextDispute,"version" to version,"updatedAt" to now))
  tx.set(ref.collection("events").document(version.toString()),mapOf("actorId" to uid,"kind" to kind,"status" to nextStatus,"dispute" to nextDispute,"version" to version,"note" to note.trim(),"createdAt" to now))
  null
 }.addOnCompleteListener{done(if(it.isSuccessful)null else "ცვლილება ვერ შეინახა. განაახლე შეკვეთა.")}
}
@Composable fun ChatInbox(offers:List<CustomerOffer>,onChat:(CustomerOffer)->Unit){
 var support by remember{mutableStateOf(false)}
 Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
  PfHeading("ჩატი","მაღაზიები და მხარდაჭერა")
  PfOutlineButton({support=!support}){Text(if(support)"მაღაზიებთან საუბრები" else "მხარდაჭერასთან საუბარი")}
  if(support)SupportChat() else {
   if(offers.isEmpty())Text("მაღაზიის შეთავაზების მიღების შემდეგ საუბარი აქ გამოჩნდება.",color=Pf.muted,fontSize=12.sp)
   offers.forEach{offer->PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
    Text(offer.shopName,color=Pf.ink,fontSize=15.sp)
    PfOutlineButton({onChat(offer)}){Text("საუბრის გახსნა")}
   }}}
  }
 }
}
