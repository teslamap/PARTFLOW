package ge.partflow.customer

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.Timestamp
import java.util.Date

object TowCreate {
 fun submit(mode:String,city:String,destinationCity:String,origin:String,destination:String,
  vehicle:String,condition:String,notes:String,phone:String,lat:Double?,lng:Double?,
  pickup:Date?,done:(String?)->Unit){
  val uid=FirebaseAuth.getInstance().currentUser?.uid
  val error=when {
   uid==null->"ავტორიზაცია აუცილებელია."
   mode !in listOf("sos","intercity")->"გამოძახების ტიპი არასწორია."
   origin.isBlank()||destination.isBlank()||vehicle.isBlank()||city.isBlank()||destinationCity.isBlank()->"შეავსე სავალდებულო ველები."
   !Regex("[+]9955[0-9]{8}").matches(phone)->"ტელეფონის ფორმატი არასწორია."
   condition !in listOf("rolls","blocked","accident")->"მდგომარეობა არასწორია."
   mode=="sos"&&(lat==null||lng==null||lat !in -90.0..90.0||lng !in -180.0..180.0)->"მდებარეობა არასწორია."
   mode=="intercity"&&(pickup==null||pickup.time<=System.currentTimeMillis())->"მიუთითე მომავალი თარიღი."
   else->null
  }
  if(error!=null){done(error);return}
  val record=hashMapOf<String,Any?>(
   "mode" to mode,"city" to city,"destinationCity" to destinationCity,
   "origin" to origin.trim(),"destination" to destination.trim(),"vehicle" to vehicle.trim(),
   "condition" to condition,"notes" to notes.trim(),"phone" to phone,
   "pickupAt" to if(mode=="intercity")Timestamp(pickup!!) else null,
   "location" to if(mode=="sos")mapOf("lat" to lat!!,"lng" to lng!!) else null,
   "scope" to if(mode=="sos")"city" else "all","ownerId" to uid,"status" to "searching",
   "driverId" to null,"quote" to null,"driverName" to null,"driverPhone" to null,
   "createdAt" to FieldValue.serverTimestamp(),"updatedAt" to FieldValue.serverTimestamp(),"expandedAt" to null)
  FirebaseFirestore.getInstance().collection("pf_tow_requests").add(record)
   .addOnCompleteListener { done(if(it.isSuccessful)null else "გამოძახება ვერ შეინახა.") }
 }
}
