package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.*

val CustomerCities=listOf("თბილისი","ბათუმი","ქუთაისი","რუსთავი","გორი","ზუგდიდი","ფოთი","თელავი","სხვა")
@Composable fun ProfileEditor(onSignOut:()->Unit){
 val user=FirebaseAuth.getInstance().currentUser
 var name by remember(user?.uid){mutableStateOf(user?.displayName.orEmpty())}
 var city by remember{mutableStateOf("თბილისი")}
 var busy by remember{mutableStateOf(false)}
 var message by remember{mutableStateOf("")}
 val db=remember{FirebaseFirestore.getInstance()}
 DisposableEffect(user?.uid){
  val listener=user?.uid?.let{db.collection("pf_members").document(it).addSnapshotListener{doc,e->
   if(e!=null)message="პროფილი ვერ ჩაიტვირთა." else if(doc!=null){name=doc.getString("name").orEmpty();city=doc.getString("city")?:"თბილისი"}
  }}
  onDispose{listener?.remove()}
 }
 Column(verticalArrangement=Arrangement.spacedBy(16.dp)){
  PfHeading("ჩემი პროფილი","PARTFLOW · პირადი ანგარიში")
  PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
   Text("პირადი ინფორმაცია",color=Pf.ink,fontSize=17.sp)
   PfField(name,{name=it.take(100)},label={Text("სახელი და გვარი")},singleLine=true)
   PfChoice("ქალაქი",city,CustomerCities,{city=it})
   Text(user?.email.orEmpty(),color=Pf.muted,fontSize=13.sp)
   Text(if(user?.isEmailVerified==true)"✓ ელფოსტა დადასტურებულია" else "ელფოსტა ჯერ არ არის დადასტურებული",color=Pf.muted,fontSize=11.sp)
   PfButton(enabled=!busy&&name.isNotBlank(),onClick={
    val uid=user?.uid?:return@PfButton
    busy=true;message=""
    db.collection("pf_members").document(uid).update(mapOf("name" to name.trim(),"city" to city)).addOnCompleteListener{result->
     busy=false;message=if(result.isSuccessful)"ცვლილებები შენახულია." else "პროფილის შენახვა ვერ მოხერხდა."
     if(result.isSuccessful)user.updateProfile(UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build())
    }
   }){Text(if(busy)"ინახება…" else "ცვლილებების შენახვა")}
   if(user?.isEmailVerified==false)PfOutlineButton(enabled=!busy,onClick={busy=true;user.sendEmailVerification().addOnCompleteListener{busy=false;message=if(it.isSuccessful)"დადასტურების წერილი გაგზავნილია." else "წერილი ვერ გაიგზავნა."}}){Text("ელფოსტის დადასტურება")}
   PfOutlineButton(enabled=!busy,onClick={val email=user?.email?:return@PfOutlineButton;busy=true;NativeAuth.reset(email){busy=false;message=it?:"პაროლის აღდგენის ბმული გაგზავნილია."}}){Text("პაროლის აღდგენა")}
  }}
  PrivateContact()
  if(message.isNotBlank())Text(message,color=Pf.muted,fontSize=12.sp)
  PfOutlineButton(onSignOut){Text("ანგარიშიდან გასვლა")}
 }
}
@Composable fun OfferConfirmation(offer:CustomerOffer){
 if(!featureEnabled("orders"))return
 var data by remember(offer.id){mutableStateOf<Map<String,Any>?>(null)}
 var error by remember(offer.id){mutableStateOf("")}
 var busy by remember{mutableStateOf(false)}
 var reviewing by remember{mutableStateOf(false)}
 DisposableEffect(offer.id){
  val l=FirebaseFirestore.getInstance().collection("pf_confirmations").document(offer.id).addSnapshotListener{d,e->
   if(e!=null)error="დადასტურების მონაცემები ვერ ჩაიტვირთა." else data=d?.data
  };onDispose{l.remove()}
 }
 val terms=data
 if(terms?.get("status")=="pending"){
  Text("მაღაზია გთავაზობს საბოლოო პირობებს",color=Pf.ink,fontSize=13.sp)
  Text("${terms["price"]} ₾ · ${terms["condition"]} · ${terms["delivery"]}",color=Pf.muted,fontSize=12.sp)
  if(terms["serviceAvailable"]==true)Text("მომსახურება: ${terms["servicePrice"]} ₾",color=Pf.muted,fontSize=12.sp)
  Text(terms["note"]?.toString().orEmpty(),color=Pf.muted,fontSize=12.sp)
  if(reviewing)Text("დადასტურება დახურავს მოთხოვნას და შექმნის შეკვეთას. გადაამოწმე ფასი და პირობები.",color=Pf.ink,fontSize=12.sp)
  PfButton(enabled=!busy,onClick={
   if(!reviewing)reviewing=true else {busy=true;CustomerActions.accept(offer,(terms["version"] as? Number)?.toLong()?:0){busy=false;error=it.orEmpty();reviewing=false}}
  }){Text(if(busy)"მიმდინარეობს…" else if(reviewing)"დიახ, ვადასტურებ" else "პირობების გადამოწმება")}
  if(reviewing)PfTextButton({reviewing=false}){Text("გაუქმება")}
  PfTextButton(enabled=!busy,onClick={
   busy=true
   FirebaseFirestore.getInstance().collection("pf_confirmations").document(offer.id).update(mapOf("status" to "declined","updatedAt" to FieldValue.serverTimestamp())).addOnCompleteListener{busy=false;error=if(it.isSuccessful)"" else "უარის გაგზავნა ვერ მოხერხდა."}
  }){Text("პირობებზე უარის თქმა",color=Pf.muted)}

 }
 if(error.isNotBlank())Text(error,color=Color(0xFFB54730),fontSize=11.sp)
}
