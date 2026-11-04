package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*

/** Transactions mirror the web commerce protocol; rules remain the final authority. */
object CustomerActions {
 private val db get()=FirebaseFirestore.getInstance()
 private val uid get()=FirebaseAuth.getInstance().currentUser?.uid
 fun archive(type:String,id:String,label:String,restore:Boolean=false,done:(String?)->Unit){
  val owner=uid?:return done("ავტორიზაცია აუცილებელია.")
  val ref=db.collection("pf_archives").document(owner).collection("panels").document("mobile-customer").collection("items").document(type+"_"+id)
  val task=if(restore)ref.delete() else ref.set(mapOf("type" to type,"targetId" to id,"label" to label.take(120),"createdAt" to FieldValue.serverTimestamp()))
  task.addOnCompleteListener{done(if(it.isSuccessful)null else "არქივის შეცვლა ვერ მოხერხდა.")}
 }
 fun close(id:String,done:(String?)->Unit){
  db.collection("pf_requests").document(id).update("status","closed").addOnCompleteListener{done(if(it.isSuccessful)null else "მოთხოვნა ვერ დაიხურა.")}
 }
 fun accept(offer:CustomerOffer,expectedVersion:Long,done:(String?)->Unit){
  val owner=uid?:return done("ავტორიზაცია აუცილებელია.")
  val rr=db.collection("pf_requests").document(offer.requestId)
  val order=db.collection("pf_orders").document(offer.requestId)
  val confirmation=db.collection("pf_confirmations").document(offer.id)
  db.runTransaction { tx->
   val o=tx.get(db.collection("pf_offers").document(offer.id))
   val r=tx.get(rr);val old=tx.get(order);val c=tx.get(confirmation)
   val shop=tx.get(db.collection("pf_shops").document(o.getString("shopId")?:throw IllegalStateException()))
   check(r.getString("ownerId")==owner&&o.getString("ownerId")==owner)
   if(old.exists()){check(old.getString("offerId")==offer.id);return@runTransaction null}
   check(r.getString("status")=="open"&&shop.getString("status")=="approved")
   check(c.getString("status")=="pending"&&c.getLong("version")==expectedVersion)
   val now=FieldValue.serverTimestamp()
   tx.update(confirmation,mapOf("status" to "accepted","updatedAt" to now))
   tx.update(rr,mapOf("status" to "closed","acceptedOfferId" to offer.id))
   tx.set(order,mapOf("requestId" to offer.requestId,"offerId" to offer.id,"ownerId" to owner,"shopId" to o.getString("shopId"),
    "status" to "confirmed","dispute" to "none","version" to 0,"createdAt" to now,"updatedAt" to now,
    "confirmationId" to offer.id,"confirmationVersion" to expectedVersion))
   tx.set(order.collection("events").document("0"),mapOf("actorId" to owner,"kind" to "confirmed","status" to "confirmed",
    "dispute" to "none","note" to "შეთავაზება არჩეულია","version" to 0,"createdAt" to now))
   null
  }.addOnCompleteListener{done(if(it.isSuccessful)null else "დადასტურება ვერ შესრულდა. განაახლე შეთავაზება და სცადე ხელახლა.")}
 }
}
