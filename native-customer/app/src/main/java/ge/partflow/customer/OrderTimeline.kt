package ge.partflow.customer
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.*
import com.google.firebase.firestore.FirebaseFirestore
@Composable fun OrderTimeline(id:String){
 var events by remember(id){mutableStateOf(emptyList<Map<String,Any>>())};var error by remember{mutableStateOf("")}
 DisposableEffect(id){
  val l=FirebaseFirestore.getInstance().collection("pf_orders").document(id).collection("events").orderBy("version").limitToLast(100).addSnapshotListener{s,e->
   if(e!=null)error="ისტორია ვერ ჩაიტვირთა."else events=s?.documents?.map{it.data.orEmpty()}.orEmpty()
  };onDispose{l.remove()}
 }
 Column(Modifier.fillMaxWidth(),verticalArrangement=Arrangement.spacedBy(10.dp)){
  events.forEach{event->Text("• "+statusLabel(event["status"].toString())+" · "+event["note"].toString(),color=Pf.muted,fontSize=11.sp,lineHeight=18.sp)}
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=11.sp)
 }
}
