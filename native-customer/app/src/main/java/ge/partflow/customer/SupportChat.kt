package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*

data class SupportMessage(val id:String,val senderId:String,val text:String)
@Composable fun SupportChat(){
 val uid=FirebaseAuth.getInstance().currentUser?.uid
 val db=remember { FirebaseFirestore.getInstance() }
 var messages by remember { mutableStateOf(emptyList<SupportMessage>()) }
 var session by remember { mutableIntStateOf(1) }
 var text by remember { mutableStateOf("") }
 var error by remember { mutableStateOf("") }
 var sending by remember { mutableStateOf(false) }
 DisposableEffect(uid){
  if(uid==null)return@DisposableEffect onDispose {}
  val thread=db.collection("pf_support_threads").document(uid)
  val a=thread.addSnapshotListener { doc,e->
   if(e!=null)error="მხარდაჭერის ჩატი ვერ ჩაიტვირთა."
   else if(doc!=null&&doc.exists())session=doc.getLong("session")?.toInt()?:1
  }
  val b=thread.collection("messages").addSnapshotListener { snap,e->
   if(e!=null)error="შეტყობინებები ვერ ჩაიტვირთა."
   else messages=snap?.documents?.sortedBy { it.getTimestamp("createdAt")?.seconds?:0L }?.map {
    SupportMessage(it.id,it.getString("senderId").orEmpty(),it.getString("text").orEmpty())
   }.orEmpty()
  }
  onDispose { a.remove();b.remove() }
 }
 Column(Modifier.fillMaxWidth().padding(16.dp)){
  Text("მხარდაჭერის ჩატი",style=MaterialTheme.typography.titleLarge)
  Spacer(Modifier.height(10.dp))
  Column(Modifier.fillMaxWidth().heightIn(max=350.dp).verticalScroll(rememberScrollState())){
   messages.forEach { message->
    Card(Modifier.fillMaxWidth().padding(vertical=4.dp)){
     Column(Modifier.padding(12.dp)){
      Text(if(message.senderId==uid)"თქვენ" else "მხარდაჭერა",style=MaterialTheme.typography.labelMedium)
      Text(message.text)
     }
    }
   }
  }
  if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
  OutlinedTextField(value=text,onValueChange={text=it.take(2000)},label={Text("შეტყობინება")},modifier=Modifier.fillMaxWidth())
  Button(enabled=!sending&&uid!=null&&text.trim().isNotEmpty(),onClick={
   if(uid!=null){
    sending=true;error=""
    val thread=db.collection("pf_support_threads").document(uid)
    thread.get().addOnCompleteListener { read->
     if(!read.isSuccessful){sending=false;error="ჩატის გახსნა ვერ მოხერხდა.";return@addOnCompleteListener}
     val existing=read.result
     val active=existing.exists()&&existing.getString("status")=="open"
     val setup=if(!existing.exists())mapOf<String,Any>("ownerId" to uid,"kind" to "customer",
      "createdAt" to FieldValue.serverTimestamp(),"updatedAt" to FieldValue.serverTimestamp(),
      "status" to "open","session" to 1) else emptyMap()
     val ready:()->Unit={
      val n=if(active)existing.getLong("session")?.toInt()?:1 else if(!existing.exists())1 else session
      thread.collection("messages").add(mapOf("senderId" to uid,"text" to text.trim(),
       "createdAt" to FieldValue.serverTimestamp(),"session" to n))
       .addOnCompleteListener { done->
        sending=false
        if(done.isSuccessful)text="" else error="შეტყობინება ვერ გაიგზავნა."
       }
     }
     if(active)ready()
     else if(!existing.exists())thread.set(setup).addOnCompleteListener {
      if(it.isSuccessful)ready() else {sending=false;error="ჩატი ვერ შეიქმნა."}
     }
     else {sending=false;error="მხარდაჭერის საუბარი დახურულია."}
    }
   }
  },modifier=Modifier.fillMaxWidth()){Text(if(sending)"იგზავნება..." else "გაგზავნა")}
 }
}
