package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query

data class CustomerRequest(
 val id:String,val brand:String,val model:String,val year:String,
 val part:String,val status:String,val city:String,val budget:String,
 val acceptedOfferId:String?,val description:String="",val engine:String="",val category:String="",val vin:String="",val photos:List<String> = emptyList()
)
data class CustomerOffer(
 val id:String,val requestId:String,val shopName:String,val price:String,
 val condition:String,val delivery:String,val status:String,val shopId:String="",val note:String="",val serviceAvailable:Boolean=false,val servicePrice:String=""
)
data class CustomerSnapshot(val requests:List<CustomerRequest> = emptyList(),val offers:List<CustomerOffer> = emptyList(),val error:String?=null)

/** Owner-filtered real-time Firestore listeners. No collection-wide customer reads. */
class CustomerData(private val db:FirebaseFirestore=FirebaseFirestore.getInstance()){
 private val registrations=mutableListOf<ListenerRegistration>()
 fun observe(uid:String,onChange:(CustomerSnapshot)->Unit){
  close()
  NativeAuth.ensureMember()
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
      d.get("budget")?.toString().orEmpty(),d.getString("acceptedOfferId"),d.getString("description").orEmpty(),d.getString("engine").orEmpty(),d.getString("category").orEmpty(),d.getString("vin").orEmpty(),(d.get("photos") as? List<*>)?.filterIsInstance<String>().orEmpty())
    }?.sortedByDescending { it.id }?:emptyList()
    publish()
   }
  registrations+=db.collection("pf_offers").whereEqualTo("ownerId",uid)
   .limit(300).addSnapshotListener { snapshot,error->
    if(error!=null){publish("შეთავაზებების ჩატვირთვა ვერ მოხერხდა.");return@addSnapshotListener}
    offers=snapshot?.documents?.map { d->
     CustomerOffer(d.id,d.getString("requestId").orEmpty(),d.getString("shopName").orEmpty(),
      d.get("price")?.toString().orEmpty(),d.getString("condition").orEmpty(),
      d.getString("delivery").orEmpty(),d.getString("status").orEmpty(),d.getString("shopId").orEmpty(),d.getString("note").orEmpty(),d.getBoolean("serviceAvailable")==true,d.get("servicePrice")?.toString().orEmpty())
    }?:emptyList()
    publish()
   }
 }
 fun close(){registrations.forEach { it.remove() };registrations.clear()}
}
