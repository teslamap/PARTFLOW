package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query

data class CustomerRequest(
 val id:String,val brand:String,val model:String,val year:String,
 val part:String,val status:String,val city:String,val budget:String,
 val acceptedOfferId:String?
)
data class CustomerOffer(
 val id:String,val requestId:String,val shopName:String,val price:String,
 val condition:String,val delivery:String,val status:String
)
data class CustomerSnapshot(val requests:List<CustomerRequest> = emptyList(),val offers:List<CustomerOffer> = emptyList(),val error:String?=null)

/** Owner-filtered real-time Firestore listeners. No collection-wide customer reads. */
class CustomerData(private val db:FirebaseFirestore=FirebaseFirestore.getInstance()){
 private val registrations=mutableListOf<ListenerRegistration>()
 fun observe(uid:String,onChange:(CustomerSnapshot)->Unit){
  close()
  var requests=emptyList<CustomerRequest>()
  var offers=emptyList<CustomerOffer>()
  fun publish(error:String?=null)=onChange(CustomerSnapshot(requests,offers,error))
  registrations+=db.collection("pf_requests").whereEqualTo("ownerId",uid)
   .limit(300).addSnapshotListener { snapshot,error->
    if(error!=null){publish("მოთხოვნების ჩატვირთვა ვერ მოხერხდა.");return@addSnapshotListener}
    requests=snapshot?.documents?.map { d->
     CustomerRequest(d.id,d.getString("brand").orEmpty(),d.getString("model").orEmpty(),
      d.get("year")?.toString().orEmpty(),d.getString("part").orEmpty(),
      d.getString("status").orEmpty(),d.getString("city").orEmpty(),
      d.get("budget")?.toString().orEmpty(),d.getString("acceptedOfferId"))
    }?.sortedByDescending { it.id }?:emptyList()
    publish()
   }
  registrations+=db.collection("pf_offers").whereEqualTo("ownerId",uid)
   .limit(300).addSnapshotListener { snapshot,error->
    if(error!=null){publish("შეთავაზებების ჩატვირთვა ვერ მოხერხდა.");return@addSnapshotListener}
    offers=snapshot?.documents?.map { d->
     CustomerOffer(d.id,d.getString("requestId").orEmpty(),d.getString("shopName").orEmpty(),
      d.get("price")?.toString().orEmpty(),d.getString("condition").orEmpty(),
      d.getString("delivery").orEmpty(),d.getString("status").orEmpty())
    }?:emptyList()
    publish()
   }
 }
 fun close(){registrations.forEach { it.remove() };registrations.clear()}
}
