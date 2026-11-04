package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*

data class ShopMessage(val sender:String,val text:String)
@Composable fun ShopChat(offer:CustomerOffer,onClose:()->Unit){
 val db=remember { FirebaseFirestore.getInstance() }
 val uid=FirebaseAuth.getInstance().currentUser?.uid
 var shopId by remember(offer.id){mutableStateOf("")}
 var messages by remember(offer.id){mutableStateOf(emptyList<ShopMessage>())}
 var input by remember(offer.id){mutableStateOf("")}
 var error by remember(offer.id){mutableStateOf("")}
 var busy by remember(offer.id){mutableStateOf(false)}
 DisposableEffect(offer.id){
  val offerListener=db.collection("pf_offers").document(offer.id).addSnapshotListener { doc,e->
   if(e!=null)error="შეთავაზება ვერ ჩაიტვირთა."
   else shopId=doc?.getString("shopId").orEmpty()
  }
  val msgListener=db.collection("pf_messages").whereEqualTo("offerId",offer.id)
   .addSnapshotListener { snap,e->
    if(e!=null)error="მაღაზიასთან ჩატი ვერ ჩაიტვირთა."
    else messages=snap?.documents?.sortedBy { it.getTimestamp("createdAt")?.seconds?:0L }?.map {
     ShopMessage(it.getString("senderId").orEmpty(),it.getString("text").orEmpty())
    }.orEmpty()
   }
  onDispose { offerListener.remove();msgListener.remove() }
 }
 Column(Modifier.fillMaxWidth().padding(16.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
  Text(offer.shopName,style=MaterialTheme.typography.titleLarge)
  Column(Modifier.fillMaxWidth().heightIn(max=350.dp).verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(6.dp)) {
  messages.forEach { m->
   Card(Modifier.fillMaxWidth()){Column(Modifier.padding(12.dp)){
    Text(if(m.sender==uid)"თქვენ" else "მაღაზია",style=MaterialTheme.typography.labelMedium)
    Text(m.text)
   }}
  }
  }
  if(messages.isEmpty())Text("შეტყობინებები ჯერ არ არის.",style=MaterialTheme.typography.bodySmall)
  if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
  OutlinedTextField(input,{input=it.take(2000)},label={Text("შეტყობინება")},modifier=Modifier.fillMaxWidth())
  Button(enabled=!busy&&uid!=null&&shopId.isNotBlank()&&input.trim().isNotBlank(),onClick={
   val owner=uid?:return@Button
   val recipient=shopId
   val body=input.trim()
   busy=true;error=""
   val activity=db.collection("pf_chat_activity").document(offer.id)
   val message=db.collection("pf_messages").document()
   db.runTransaction { tx->
    val old=tx.get(activity)
    val offerDoc=tx.get(db.collection("pf_offers").document(offer.id))
    val requestDoc=tx.get(db.collection("pf_requests").document(offer.requestId))
    if(offerDoc.getString("ownerId")!=owner||offerDoc.getString("shopId")!=recipient||
     offerDoc.getString("requestId")!=offer.requestId||
     requestDoc.getString("status")=="hidden"||
     (requestDoc.getString("status")!="open"&&requestDoc.getString("acceptedOfferId")!=offer.id))
     throw IllegalStateException("Conversation is not available")
    val version=if(old.exists())(old.getLong("version")?:0L)+1L else 1L
    val previousShop=old.getBoolean("shopReplied")?:false
    val fields=mapOf<String,Any>(
     "offerId" to offer.id,"requestId" to offer.requestId,"ownerId" to owner,
     "shopId" to recipient,"senderId" to owner,"recipientId" to recipient,
     "text" to body,"createdAt" to FieldValue.serverTimestamp())
    val activityFields=hashMapOf<String,Any>(
     "offerId" to offer.id,"requestId" to offer.requestId,"ownerId" to owner,
     "shopId" to recipient,"lastMessageId" to message.id,"lastSenderId" to owner,
     "lastText" to body,"lastKind" to "message","customerReplied" to true,
     "shopReplied" to previousShop,"version" to version,
     "updatedAt" to FieldValue.serverTimestamp())
    if(!old.exists())activityFields["createdAt"]=FieldValue.serverTimestamp()
    tx.set(message,fields)
    tx.set(activity,activityFields,SetOptions.merge())
    null
   }.addOnCompleteListener { result->
    busy=false
    if(result.isSuccessful)input="" else error="შეტყობინება ვერ გაიგზავნა."
   }
  },modifier=Modifier.fillMaxWidth()){Text(if(busy)"იგზავნება..." else "გაგზავნა")}
  TextButton(onClick=onClose){Text("დახურვა")}
 }
}
