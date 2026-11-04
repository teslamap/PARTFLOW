package ge.partflow.customer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog

private val Ink=Color(0xFF142332)
private val Orange=Color(0xFFF18B51)
private val Bg=Color(0xFFF7F8FA)
private val Line=Color(0xFFE7EAED)
private val Muted=Color(0xFF737C87)
private val White=Color.White
private val menu=listOf("მთავარი","მოთხოვნები","შეთავაზებები","გარაჟი","SOS / დაგეგმილი","მაღაზიების რუკა","ჩატი","არქივი","პროფილი")
class MainActivity:ComponentActivity(){
 override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);NativeAuth.initialize(this);window.statusBarColor=android.graphics.Color.rgb(247,248,250);window.navigationBarColor=android.graphics.Color.WHITE
  setContent { MaterialTheme { CustomerApp() } }
 }
}
@Composable private fun Txt(t:String,size:Int=13,color:Color=Ink,bold:Boolean=false,modifier:Modifier=Modifier){
 Text(t,modifier=modifier,color=color,fontSize=size.sp,fontWeight=if(bold)FontWeight.Bold else FontWeight.Normal,lineHeight=(size*1.55f).sp)
}
@Composable private fun Brand(){
 Column { Row { Txt("PART",24,Ink,true);Txt("FLOW",24,Color(0xFFE87D40),true) }
 Txt("ავტონაწილები შენთვის",10,Muted) }
}
@Composable private fun Action(label:String,onClick:()->Unit,filled:Boolean=true){
 Box(Modifier.fillMaxWidth().padding(top=8.dp).clip(RoundedCornerShape(12.dp))
  .background(if(filled)Orange else White).border(if(filled)0.dp else 1.dp,Line,RoundedCornerShape(12.dp))
  .clickable(onClick=onClick).padding(16.dp)){
  Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){
   Txt(label,13,Ink,true);Txt("↗",17,Ink,true)
  }
 }
}
@Composable private fun Panel(content:@Composable ColumnScope.()->Unit){
 Column(Modifier.fillMaxWidth().padding(bottom=12.dp).clip(RoundedCornerShape(17.dp))
  .background(White).border(1.dp,Line,RoundedCornerShape(17.dp)).padding(17.dp),content=content)
}
@Composable private fun CustomerApp(){
 var logged by remember { mutableStateOf(com.google.firebase.auth.FirebaseAuth.getInstance().currentUser!=null) }
 var authBusy by remember { mutableStateOf(false) }
 var live by remember { mutableStateOf(CustomerSnapshot()) }
 var garage by remember { mutableStateOf(emptyList<GarageVehicle>()) }
 var garageError by remember { mutableStateOf<String?>(null) }
 var towRequests by remember { mutableStateOf(emptyList<TowRequest>()) }
 var towError by remember { mutableStateOf<String?>(null) }
 var towActionError by remember { mutableStateOf("") }
 val towStore=remember { TowingData() }
 val garageStore=remember { GarageData() }
 val store=remember { CustomerData() }
 val uid=if(logged)com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.uid else null
 DisposableEffect(uid) {
  if(uid!=null){store.observe(uid){live=it};garageStore.observe(uid){cars,error->garage=cars;garageError=error};towStore.observe { rows,error->towRequests=rows;towError=error }} else {live=CustomerSnapshot();garage=emptyList();garageError=null}
  onDispose { store.close();garageStore.close();towStore.close() }
 }
 var authError by remember { mutableStateOf("") }
 var email by remember { mutableStateOf("") }
 var password by remember { mutableStateOf("") }
 var name by remember { mutableStateOf("") }
 DisposableEffect(Unit) {
  val auth=com.google.firebase.auth.FirebaseAuth.getInstance()
  val listener=com.google.firebase.auth.FirebaseAuth.AuthStateListener { logged=it.currentUser!=null }
  auth.addAuthStateListener(listener)
  onDispose { auth.removeAuthStateListener(listener) }
 }
 var demo by remember { mutableStateOf(false) }
 var page by remember { mutableStateOf("მთავარი") }
 var drawer by remember { mutableStateOf(false) }
 var mode by remember { mutableStateOf("შესვლა") }
 var detail by remember { mutableStateOf(false) }
 var garageCreate by remember { mutableStateOf(false) }
 var towCreate by remember { mutableStateOf(false) }
 var selectedShopChat by remember { mutableStateOf<CustomerOffer?>(null) }
 BackHandler(drawer||detail||garageCreate||towCreate||selectedShopChat!=null||page!="მთავარი"){when{drawer->drawer=false;selectedShopChat!=null->selectedShopChat=null;towCreate->towCreate=false;detail->detail=false;garageCreate->garageCreate=false;else->page="მთავარი"}}
 Box(Modifier.fillMaxSize().background(Bg)){
 Column {
  Row(Modifier.fillMaxWidth().background(White).border(1.dp,Line).padding(horizontal=22.dp,vertical=18.dp),
   verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(13.dp)){
   if(logged||demo) Box(Modifier.size(44.dp).clip(RoundedCornerShape(13.dp)).border(1.dp,Line,RoundedCornerShape(13.dp)).clickable{drawer=true},contentAlignment=Alignment.Center){Txt("☰",22)}
   Brand()
   Spacer(Modifier.weight(1f))
   if(logged||demo)Txt(page,10,Muted)
  }
  Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal=22.dp,vertical=26.dp)){
   if(!logged&&!demo){
    Txt("შენი ავტომობილი. შენი ნაწილი.",10,Muted)
    Spacer(Modifier.height(14.dp))
    Txt("იპოვე ნაწილი,",29,Ink,true)
    Txt("ზედმეტი ძებნის გარეშე.",27,Color(0xFFC56C37),true)
    Spacer(Modifier.height(16.dp))
    Txt("განათავსე მოთხოვნა და მიიღე შეთავაზებები შესაბამისი ავტომაღაზიებისგან.",13,Muted)
    Spacer(Modifier.height(28.dp))
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color(0xFFE9EDF1)).padding(4.dp)){
     listOf("შესვლა","რეგისტრაცია").forEach { m->
      Box(Modifier.weight(1f).clip(RoundedCornerShape(10.dp)).background(if(mode==m)White else Color.Transparent).clickable{mode=m}.padding(12.dp),contentAlignment=Alignment.Center){Txt(m,12,Ink,mode==m)}
     }
    }
    Spacer(Modifier.height(20.dp))
    if(mode=="რეგისტრაცია")Field("სახელი",name,{name=it},false)
    Field("ელფოსტა",email,{email=it},false)
    if(mode!="აღდგენა")Field("პაროლი",password,{password=it},true)
    if(authError.isNotBlank())Txt(authError,11,Color(0xFFB54730))
    Action(if(authBusy)"მიმდინარეობს..." else when(mode){"რეგისტრაცია"->"ანგარიშის შექმნა";"აღდგენა"->"აღდგენის ბმულის გაგზავნა";else->"შესვლა"},{
     if(!authBusy) {
      authError=""
      if(email.isBlank()||(mode!="აღდგენა"&&password.length<8)||(mode=="რეგისტრაცია"&&name.isBlank())) authError="შეავსე ველები. პაროლი მინიმუმ 8 სიმბოლოა."
      else {
       authBusy=true
       val done:(String?)->Unit={ error->authBusy=false;authError=error?:"";if(error==null&&mode=="აღდგენა")authError="აღდგენის ბმული გაგზავნილია." }
       when(mode) {
        "რეგისტრაცია"->NativeAuth.register(name,email,password,done)
        "აღდგენა"->NativeAuth.reset(email,done)
        else->NativeAuth.signIn(email,password,done)
       }
      }
     }
    })
    Spacer(Modifier.height(14.dp))
    Box(Modifier.fillMaxWidth().clickable{mode="აღდგენა"},contentAlignment=Alignment.Center){Txt("პაროლი დაგავიწყდა?",11,Color(0xFFBB642F))}
    Spacer(Modifier.height(18.dp))
    Box(Modifier.fillMaxWidth().clickable{demo=true},contentAlignment=Alignment.Center){Txt("ჯერ დაათვალიერე აპი →",12)}
    Spacer(Modifier.height(22.dp));HorizontalDivider(color=Line)
    Spacer(Modifier.height(20.dp));Txt("✓  ერთი მოთხოვნა — შესაბამისი მაღაზიების შეთავაზებები",10,Muted)
    Txt("Firebase ავტორიზაცია დაკავშირებულია; მონაცემების ეკრანები ჯერ სატესტოა.",10,Muted)
   } else {
    if(demo) { Txt("დემო ვერსია",11,Muted);Spacer(Modifier.height(12.dp)) }
    when(page){
     "მთავარი"->HomePage({if(!demo)detail=true},{page="გარაჟი"},live,if(demo)"დემო მომხმარებელი" else com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.displayName.orEmpty())
     "მოთხოვნები"->{
      Txt("ჩემი მოთხოვნები",23,Ink,true);Spacer(Modifier.height(16.dp))
      if(live.error!=null)Txt(live.error!!,11,Color(0xFFB54730))
      if(live.requests.isEmpty())Panel { Txt("მოთხოვნები ჯერ არ გაქვს",14,Ink,true);Txt("ახალი მოთხოვნის დამატება ამჟამად მუშავდება.",11,Muted) }
      live.requests.forEach { req->
       Panel {
        Txt(listOf(req.brand,req.model,req.year).filter { it.isNotBlank() }.joinToString(" · "),11,Muted)
        Txt(req.part,15,Ink,true)
        Spacer(Modifier.height(10.dp))
        Txt("${req.status} · ${req.city} · ${live.offers.count { it.requestId==req.id }} შეთავაზება",11,Muted)
       }
      }
      Action("+ ახალი მოთხოვნა",{if(!demo)detail=true})
     }
     "შეთავაზებები"->{
      Txt("შეთავაზებები",23,Ink,true);Spacer(Modifier.height(16.dp))
      if(live.offers.isEmpty())Panel { Txt("შეთავაზებები ჯერ არ არის",13,Muted) }
      live.offers.forEach { offer->Panel {
       Txt(offer.shopName,14,Ink,true)
       Txt(live.requests.find { it.id==offer.requestId }?.part.orEmpty(),11,Muted)
       Spacer(Modifier.height(10.dp));Txt("${offer.price} ₾",20,Color(0xFFB9602E),true)
       Txt("${offer.condition} · ${offer.delivery}",11,Muted)
       Action("მაღაზიასთან ჩატი",{if(!demo)selectedShopChat=offer},false)
      } }
     }
     "გარაჟი"->{
      Txt("ჩემი გარაჟი",23,Ink,true);Spacer(Modifier.height(16.dp))
      if(garageError!=null)Txt(garageError!!,11,Color(0xFFB54730))
      if(garage.isEmpty())Panel { Txt("ავტომობილი ჯერ არ დაგიმატებია",13,Muted) }
      garage.forEach { car->Panel {
       Txt("${car.brand} ${car.model} · ${car.year}",15,Ink,true)
       Txt(listOf(car.engine,car.fuel,car.vin).filter { it.isNotBlank() }.joinToString(" · "),11,Muted)
      } }
      Action("+ ავტომობილის დამატება",{if(!demo)garageCreate=true})
     }
     "ჩატი"->{SupportChat()}
     "SOS / დაგეგმილი"->{
      Txt("ევაკუატორი",23,Ink,true);Spacer(Modifier.height(16.dp))
      Action("+ გამოძახება",{if(!demo)towCreate=true})
      if(towError!=null)Txt(towError!!,11,Color(0xFFB54730))
      if(towActionError.isNotBlank())Txt(towActionError,11,Color(0xFFB54730))
      if(towRequests.isEmpty())Panel { Txt("გამოძახებები ჯერ არ არის",13,Muted) }
      towRequests.forEach { tow->Panel {
       Txt(if(tow.mode=="sos")"SOS გამოძახება" else "ქალაქთაშორისი",15,Ink,true)
       Txt("${tow.origin} → ${tow.destination}",12,Muted)
       Txt("სტატუსი: ${tow.status}",12,Ink)
       if(tow.price.isNotBlank())Txt("ფასი: ${tow.price} ₾",12,Ink,true)
       if(tow.status=="offered")Action("შეთავაზების დადასტურება",{
        towStore.changeStatus(tow.id,"confirmed"){towActionError=it.orEmpty()}
       })
       if(tow.status=="searching"||tow.status=="offered"||tow.status=="confirmed")
        Action("გამოძახების გაუქმება",{
         towStore.changeStatus(tow.id,"cancelled"){towActionError=it.orEmpty()}
        },false)
       if(tow.mode=="sos"&&tow.scope=="city"&&tow.status=="searching"&&
        tow.createdAt>0L&&System.currentTimeMillis()-tow.createdAt>=900000L)
        Action("ძებნის გაფართოება სხვა ქალაქებში",{
         towStore.expand(tow.id){towActionError=it.orEmpty()}
        },false)
      } }
     }
     "არქივი"->{
      Txt("არქივი",23,Ink,true);Spacer(Modifier.height(16.dp))
      val archived=live.requests.filter { it.status in listOf("closed","completed","cancelled","hidden","archived") }
      if(archived.isEmpty())Panel { Txt("დაარქივებული მოთხოვნები ჯერ არ არის",13,Muted) }
      archived.forEach { req->Panel {
       Txt(req.part,15,Ink,true)
       Txt(listOf(req.brand,req.model,req.year).filter { it.isNotBlank() }.joinToString(" · "),11,Muted)
       Txt("სტატუსი: ${req.status} · ${req.city}",11,Muted)
      } }
     }
     "პროფილი"->{Txt("პროფილი",23,Ink,true);Spacer(Modifier.height(16.dp));Panel{Txt(if(demo)"დემო მომხმარებელი" else com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.displayName?.ifBlank { "მომხმარებელი" }?:"მომხმარებელი",16,Ink,true);Txt(if(demo)"სატესტო რეჟიმი" else com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.email.orEmpty(),11,Muted);Action(if(demo)"დემოდან გამოსვლა" else "ანგარიშიდან გასვლა",{if(!demo)NativeAuth.signOut();demo=false;page="მთავარი"},false)}}
     else->{Txt(page,23,Ink,true);Spacer(Modifier.height(16.dp));Panel{Txt("ამ განყოფილების სრული Native ფუნქციონალი ჯერ დასამუშავებელია.",12,Muted)}}
    }
   }
  }
 }
 if(drawer){
  Row(Modifier.fillMaxSize().background(Color(0x88122332))){
   Column(Modifier.fillMaxHeight().fillMaxWidth(.82f).background(White).verticalScroll(rememberScrollState()).padding(14.dp)){
    Row(Modifier.fillMaxWidth().padding(vertical=14.dp),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){
     Column{Txt("PARTFLOW",10,Orange,true);Txt(if(demo)"დემო ანგარიში" else "მომხმარებელი",14,Ink,true)}
     Box(Modifier.size(44.dp).clickable{drawer=false},contentAlignment=Alignment.Center){Txt("✕",20)}
    }
    HorizontalDivider(color=Line);Spacer(Modifier.height(20.dp));Txt("მომხმარებლის სივრცე",10,Muted)
    menu.forEach { item->
     Spacer(Modifier.height(6.dp))
     Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(11.dp)).background(if(page==item)Color(0xFFFFF0E8)else White).clickable{page=item;drawer=false}.padding(13.dp)){
      Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Txt(item,13,if(page==item)Color(0xFFB75D2D) else Ink,page==item);Txt("›",18,Muted)}
     }
    }
    Spacer(Modifier.height(30.dp));HorizontalDivider(color=Line);Txt("შენი ავტომობილი. შენი ნაწილი.",10,Muted)
   }
   Spacer(Modifier.weight(1f).fillMaxHeight().clickable{drawer=false})
  }
 }
 if(selectedShopChat!=null&&!demo&&logged) Dialog(onDismissRequest={selectedShopChat=null}) {
  Box(Modifier.fillMaxWidth().fillMaxHeight(.88f).clip(RoundedCornerShape(20.dp)).background(Bg)) {
   ShopChat(selectedShopChat!!,onClose={selectedShopChat=null})
  }
 }
 if(towCreate&&!demo&&logged) Dialog(onDismissRequest={towCreate=false}) {
  Box(Modifier.fillMaxWidth().fillMaxHeight(.88f).clip(RoundedCornerShape(20.dp)).background(Bg)) { TowForm(onClose={towCreate=false}) }
 }
 if(garageCreate&&!demo&&logged) Dialog(onDismissRequest={garageCreate=false}) {
  Box(Modifier.fillMaxWidth().fillMaxHeight(.88f).clip(RoundedCornerShape(20.dp)).background(Bg)){
   GarageCreate(onClose={garageCreate=false})
  }
 }
 if(detail&&!demo&&logged) Dialog(onDismissRequest={detail=false}) {
  Box(Modifier.fillMaxWidth().fillMaxHeight(.88f).clip(RoundedCornerShape(20.dp)).background(Bg)){
   RequestCreate(onClose={detail=false})
  }
 }
 }
}
@Composable private fun Field(label:String,value:String,onValueChange:(String)->Unit,secret:Boolean){
 Column(Modifier.fillMaxWidth().padding(bottom=17.dp)){
  Txt(label,11,Color(0xFF596570));Spacer(Modifier.height(8.dp))
  OutlinedTextField(value=value,onValueChange=onValueChange,singleLine=true,
   visualTransformation=if(secret)PasswordVisualTransformation() else VisualTransformation.None,
   modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(10.dp),
   colors=OutlinedTextFieldDefaults.colors(focusedBorderColor=Orange,unfocusedBorderColor=Color(0xFFDFE4E8),focusedContainerColor=White,unfocusedContainerColor=White))
 }
}
@Composable private fun HomePage(requests:()->Unit,garage:()->Unit,live:CustomerSnapshot,name:String){
 Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Column{Txt("მოგესალმები,",10,Muted);Txt(name.ifBlank { "მომხმარებელი" },20,Ink,true)};Txt("✦",18,Orange)}
 Spacer(Modifier.height(20.dp))
 Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(23.dp)).background(Ink).padding(23.dp)){
  Txt("შენი ავტომობილი. შენი ნაწილი.",10,Color(0xFFF4AA7D))
  Spacer(Modifier.height(14.dp));Txt("იპოვე საჭირო ნაწილი",27,White,true)
  Spacer(Modifier.height(8.dp));Txt("განათავსე მოთხოვნა და მიიღე შეთავაზებები ავტომაღაზიებისგან.",12,Color(0xFFACB8C4))
  Spacer(Modifier.height(20.dp));Action("+ ახალი მოთხოვნა",requests)
 }
 Spacer(Modifier.height(18.dp))
 Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){
  Box(Modifier.weight(1f)){Stat(live.requests.size.toString(),"ჩემი მოთხოვნები",requests)}
  Box(Modifier.weight(1f)){Stat(live.offers.size.toString(),"შეთავაზებები",requests)}
 }
 Spacer(Modifier.height(24.dp));Txt("ბოლო მოთხოვნები",18,Ink,true);Spacer(Modifier.height(12.dp))
 if(live.requests.isEmpty())Panel { Txt("მოთხოვნები ჯერ არ გაქვს",12,Muted) }
 live.requests.take(3).forEach { req->Panel {
  Txt("${req.brand} ${req.model} · ${req.year}",11,Muted)
  Txt(req.part,15,Ink,true);Spacer(Modifier.height(12.dp))
  Txt("${req.status} · ${live.offers.count { it.requestId==req.id }} შეთავაზება",11,Color(0xFF3E7D52))
 } }
 Action("ჩემი გარაჟი",garage,false)
}
@Composable private fun Stat(number:String,label:String,onClick:()->Unit){
 Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(White).border(1.dp,Line,RoundedCornerShape(16.dp)).clickable{onClick()}.padding(16.dp)){
  Txt(number,30,Ink,true);Spacer(Modifier.height(9.dp));Txt(label,10,Muted)
 }
}
