package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.FieldValue
import java.util.Calendar

data class GarageVehicle(val id:String,val brand:String,val model:String,val year:Int,val engine:String,val vin:String,val fuel:String,val trim:String="",val plate:String="")
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
      d.getString("engine").orEmpty(),d.getString("vin").orEmpty(),d.getString("fuel").orEmpty(),d.getString("trim").orEmpty(),d.getString("plate").orEmpty())
    }.orEmpty(),null)
   }
 }
 fun add(brand:String,model:String,year:Int,engine:String,vin:String,trim:String,fuel:String,plate:String="",done:(String?)->Unit){
  val uid=FirebaseAuth.getInstance().currentUser?.uid
  val normalizedVin=vin.trim().uppercase()
  val currentYear=Calendar.getInstance().get(Calendar.YEAR)
  val error=when {
   uid==null->"ავტორიზაცია აუცილებელია."
   !VehicleCatalog.containsKey(brand)||model !in VehicleCatalog[brand].orEmpty()||year<1950||year>currentYear+1->"მარკა, მოდელი ან წელი არასწორია."
   normalizedVin.isNotEmpty()&&!Regex("[A-HJ-NPR-Z0-9]{17}").matches(normalizedVin)->"VIN არასწორია."
   engine.isBlank()||engine.length>80||trim.length>80||fuel.length>50||plate.isNotBlank()&&!Regex("[A-Z0-9 -]{1,12}").matches(plate)->"მონაცემები დასაშვებ ზომას აჭარბებს."
   else->null
  }
  if(error!=null){done(error);return}
  val values=mapOf("brand" to brand.trim(),"model" to model.trim(),"year" to year,
   "engine" to engine.trim(),"vin" to normalizedVin,"trim" to trim.trim(),
   "fuel" to fuel.trim(),"createdAt" to FieldValue.serverTimestamp())
  val collection=db.collection("pf_garage").document(uid!!).collection("vehicles")
  val record=values.toMutableMap().apply{if(plate.isNotBlank())put("plate",plate)}
  fun save(){collection.add(record).addOnCompleteListener{done(if(it.isSuccessful)null else "ავტომობილის შენახვა ვერ მოხერხდა.")}}
  if(normalizedVin.isBlank())save()else collection.whereEqualTo("vin",normalizedVin).limit(1).get().addOnCompleteListener{
   if(!it.isSuccessful)done("VIN-ის შემოწმება ვერ მოხერხდა.")
   else if(!it.result.isEmpty)done("ეს VIN გარაჟში უკვე დამატებულია.")else save()
  }
 }
 fun close(){listener?.remove();listener=null}
}
