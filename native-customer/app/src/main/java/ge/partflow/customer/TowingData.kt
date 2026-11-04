package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration

data class TowRequest(val id:String,val mode:String,val origin:String,val destination:String,val status:String,val price:String)
class TowingData(private val db:FirebaseFirestore=FirebaseFirestore.getInstance()){
 private var registration:ListenerRegistration?=null
 fun observe(update:(List<TowRequest>,String?)->Unit){
  close()
  val uid=FirebaseAuth.getInstance().currentUser?.uid
  if(uid==null){update(emptyList(),"ავტორიზაცია აუცილებელია.");return}
  registration=db.collection("pf_tow_requests").whereEqualTo("ownerId",uid)
   .addSnapshotListener { snapshot,error->
    if(error!=null){update(emptyList(),"ევაკუატორის მოთხოვნები ვერ ჩაიტვირთა.");return@addSnapshotListener}
    update(snapshot?.documents?.map { d->TowRequest(d.id,d.getString("mode").orEmpty(),
     d.getString("origin").orEmpty(),d.getString("destination").orEmpty(),
     d.getString("status").orEmpty(),d.get("quote")?.toString().orEmpty()) }.orEmpty(),null)
   }
 }
 fun close(){registration?.remove();registration=null}
}
