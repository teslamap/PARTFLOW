package ge.partflow.customer
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
@Composable fun PrivateContact(){
 if(!featureEnabled("phoneContact"))return
 val uid=FirebaseAuth.getInstance().currentUser?.uid?:return
 var phone by remember(uid){mutableStateOf("")};var busy by remember{mutableStateOf(false)};var message by remember{mutableStateOf("")}
 DisposableEffect(uid){
  val l=FirebaseFirestore.getInstance().collection("pf_contacts").document(uid).addSnapshotListener{d,e->if(e!=null)message="ნომერი ვერ ჩაიტვირთა." else phone=d?.getString("phone").orEmpty()}
  onDispose{l.remove()}
 }
 PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
  Text("საკონტაქტო ინფორმაცია",color=Pf.ink,fontSize=17.sp)
  PfField(phone,{phone=it.take(20)},label={Text("პირადი ნომერი · +9955XXXXXXXX")},singleLine=true)
  Text("ნომერი პირადია. ცვლილებისას დადასტურება განულდება.",color=Pf.muted,fontSize=11.sp)
  PfButton(enabled=!busy&&Regex("[+]9955[0-9]{8}").matches(phone),onClick={
   busy=true;FirebaseFirestore.getInstance().collection("pf_contacts").document(uid).set(mapOf("phone" to phone,"phoneVerified" to false,"updatedAt" to FieldValue.serverTimestamp())).addOnCompleteListener{busy=false;message=if(it.isSuccessful)"ნომერი შენახულია." else "ნომერი ვერ შეინახა."}
  }){Text("ნომრის შენახვა")}
  if(message.isNotBlank())Text(message,color=Pf.muted,fontSize=12.sp)
 }}
}
