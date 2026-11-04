package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

@Composable fun RequestDetails(request:CustomerRequest,offers:List<CustomerOffer>,onChat:(CustomerOffer)->Unit,onClose:()->Unit){
 var error by remember{mutableStateOf("")};var confirmClose by remember{mutableStateOf(false)};var busy by remember{mutableStateOf(false)}
 Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
  PfHeading(request.part,"${request.brand} ${request.model} · ${request.year}",onClose)
  Text(request.description,color=Pf.ink,fontSize=14.sp,lineHeight=23.sp)
  Text(listOf(request.engine,request.category,request.city,request.vin).filter{it.isNotBlank()}.joinToString(" · "),color=Pf.muted,fontSize=12.sp)
  Text(if(request.status=="open")"აქტიური" else if(request.acceptedOfferId!=null)"დადასტურებული" else "დახურული",color=Pf.muted,fontSize=12.sp)
  ShopMap(request)
  Text("შეთავაზებები",color=Pf.ink,fontSize=18.sp)
  offers.filter{it.requestId==request.id}.forEach{offer->PfCard(Modifier.fillMaxWidth()){Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(10.dp)){
   Text(offer.shopName,color=Pf.ink,fontSize=16.sp);Text("${offer.price} ₾ · ${offer.condition}",color=Pf.ink,fontSize=19.sp)
   Text(offer.delivery,color=Pf.muted,fontSize=12.sp);Text(offer.note,color=Pf.muted,fontSize=12.sp)
   if(request.acceptedOfferId==offer.id)Text("✓ არჩეული შეთავაზება",color=Pf.ink,fontSize=12.sp)
   OfferConfirmation(offer);PfOutlineButton({onChat(offer)}){Text("მაღაზიასთან ჩატი")}
  }}}
  if(request.status=="open"){
   if(confirmClose)Text("ნამდვილად გსურს მოთხოვნის დახურვა?",color=Pf.ink,fontSize=13.sp)
   PfOutlineButton(enabled=!busy,onClick={
    if(!confirmClose)confirmClose=true else {busy=true;CustomerActions.close(request.id){busy=false;error=it.orEmpty();if(it==null)onClose()}}
   }){Text(if(confirmClose)"დიახ, დახურე" else "მოთხოვნის დახურვა")}
  }
  PfOutlineButton(enabled=!busy,onClick={busy=true;CustomerActions.archive("requests",request.id,request.part){busy=false;error=it.orEmpty();if(it==null)onClose()}}){Text("არქივში გადატანა")}
  if(error.isNotBlank())Text(error,color=Pf.muted,fontSize=12.sp)
 }
}
@Composable fun GarageDelete(car:GarageVehicle,onError:(String?)->Unit){
 var confirm by remember(car.id){mutableStateOf(false)};var busy by remember{mutableStateOf(false)}
 PfTextButton(enabled=!busy,onClick={
  if(!confirm)confirm=true else {
   val uid=FirebaseAuth.getInstance().currentUser?.uid?:return@PfTextButton
   busy=true;FirebaseFirestore.getInstance().collection("pf_garage").document(uid).collection("vehicles").document(car.id).delete()
    .addOnCompleteListener{busy=false;confirm=false;onError(if(it.isSuccessful)null else "ავტომობილი ვერ წაიშალა.")}
  }
 }){Text(if(confirm)"დაადასტურე ავტომობილის წაშლა" else "ავტომობილის წაშლა",color=Pf.muted,fontSize=12.sp)}
 if(confirm)PfTextButton({confirm=false}){Text("გაუქმება",color=Pf.muted)}
}
