package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration

data class TowRequest(val id:String,val mode:String,val origin:String,val destination:String,val status:String,val price:String,val scope:String,val createdAt:Long)
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
     d.getString("status").orEmpty(),d.get("quote")?.toString().orEmpty(),
     d.getString("scope").orEmpty(),d.getTimestamp("createdAt")?.toDate()?.time?:0L) }.orEmpty(),null)
   }
 }
 fun changeStatus(id:String,status:String,done:(String?)->Unit){
  if(status !in listOf("confirmed","cancelled","completed")){done("სტატუსი არასწორია.");return}
  db.collection("pf_tow_requests").document(id).update(mapOf("status" to status,"updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()))
   .addOnCompleteListener { done(if(it.isSuccessful)null else "სტატუსის შეცვლა ვერ მოხერხდა.") }
 }
 fun expand(id:String,done:(String?)->Unit){
  db.collection("pf_tow_requests").document(id).update(mapOf("scope" to "all",
   "expandedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
   "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()))
   .addOnCompleteListener { done(if(it.isSuccessful)null else "ძებნის გაფართოება ვერ მოხერხდა.") }
 }
 fun close(){registration?.remove();registration=null}
}
