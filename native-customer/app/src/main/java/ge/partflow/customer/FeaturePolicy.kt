package ge.partflow.customer
import androidx.compose.runtime.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

@Composable fun featureEnabled(key:String):Boolean{
 val uid=FirebaseAuth.getInstance().currentUser?.uid
 var enabled by remember(uid,key){mutableStateOf(key in listOf("orders","offers","chat","garage"))}
 DisposableEffect(uid,key){
  val l=if(uid!=null)FirebaseFirestore.getInstance().collection("pf_settings").document("control").addSnapshotListener{d,e->
   if(e==null){val value=(d?.get("flags") as? Map<*,*>)?.get(key);if(value!=null)enabled=value=="ON"}
  }else null
  onDispose{l?.remove()}
 }
 return enabled
}
