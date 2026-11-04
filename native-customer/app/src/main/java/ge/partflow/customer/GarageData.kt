package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.FieldValue
import java.util.Calendar

data class GarageVehicle(val id:String,val brand:String,val model:String,val year:Int,val engine:String,val vin:String,val fuel:String)
class GarageData(private val db:FirebaseFirestore=FirebaseFirestore.getInstance()){
 private var listener:ListenerRegistration?=null
 fun observe(uid:String,update:(List<GarageVehicle>,String?)->Unit){
  close()
  listener=db.collection("pf_garage").document(uid).collection("vehicles")
   .addSnapshotListener { snapshot,error->
    if(error!=null){update(emptyList(),"გარაჟის მონაცემები ვერ ჩაიტვირთა.");return@addSnapshotListener}
    update(snapshot?.documents?.mapNotNull { d->
     val year=d.getLong("year")?.toInt()?:return@mapNotNull null
     GarageVehicle(d.id,d.getString("brand").orEmpty(),d.getString("model").orEmpty(),year,
      d.getString("engine").orEmpty(),d.getString("vin").orEmpty(),d.getString("fuel").orEmpty())
    }.orEmpty(),null)
   }
 }
 fun add(brand:String,model:String,year:Int,engine:String,vin:String,trim:String,fuel:String,done:(String?)->Unit){
  val uid=FirebaseAuth.getInstance().currentUser?.uid
  val normalizedVin=vin.trim().uppercase()
  val currentYear=Calendar.getInstance().get(Calendar.YEAR)
  val error=when {
   uid==null->"ავტორიზაცია აუცილებელია."
   brand.isBlank()||model.isBlank()||year<1950||year>currentYear+1->"მარკა, მოდელი ან წელი არასწორია."
   normalizedVin.isNotEmpty()&&!Regex("[A-HJ-NPR-Z0-9]{17}").matches(normalizedVin)->"VIN არასწორია."
   engine.length>80||trim.length>80||fuel.length>50->"მონაცემები დასაშვებ ზომას აჭარბებს."
   else->null
  }
  if(error!=null){done(error);return}
  val values=mapOf("brand" to brand.trim(),"model" to model.trim(),"year" to year,
   "engine" to engine.trim(),"vin" to normalizedVin,"trim" to trim.trim(),
   "fuel" to fuel.trim(),"createdAt" to FieldValue.serverTimestamp())
  db.collection("pf_garage").document(uid!!).collection("vehicles").add(values)
   .addOnCompleteListener { done(if(it.isSuccessful)null else "ავტომობილის შენახვა ვერ მოხერხდა.") }
 }
 fun close(){listener?.remove();listener=null}
}
