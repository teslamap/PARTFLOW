package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Calendar

private val vehicles=VehicleCatalog
private val categories=listOf("ძრავა და კომპონენტები","გადაცემათა კოლოფი","ძარის ნაწილები","განათება","სავალი ნაწილი","სამუხრუჭე სისტემა","ელექტროობა","სალონი","საბურავები და დისკები","გაგრილება და კონდიცირება","გამონაბოლქვის სისტემა","კლაჩი და გადაბმულობა","მინის ნაწილები და საწმენდები","საწვავის სისტემა","საჭის სისტემა","უსაფრთხოების სისტემა და აირბაგები","ჰიბრიდული და ელექტრო სისტემები","ზეთი, ფილტრები და სითხეები","აქსესუარები და ტიუნინგი")
private val cities=listOf("თბილისი","ბათუმი","ქუთაისი","რუსთავი","გორი","ზუგდიდი","ფოთი","თელავი","სხვა")
@Composable private fun Choose(label:String,options:List<String>,value:String,onChange:(String)->Unit){PfChoice(label,value,options,onChange)}
@Composable private fun Entry(label:String,value:String,onChange:(String)->Unit,numeric:Boolean=false){
 PfField(value=value,onValueChange=onChange,label={Text(label)},modifier=Modifier.fillMaxWidth(),
  keyboardOptions=KeyboardOptions(keyboardType=if(numeric)KeyboardType.Number else KeyboardType.Text),singleLine=true)
}
@Composable fun RequestCreate(onClose:()->Unit,vehicle:GarageVehicle?=null){
 var brand by remember { mutableStateOf(vehicle?.brand.orEmpty()) };var model by remember { mutableStateOf(vehicle?.model.orEmpty()) }
 var year by remember { mutableStateOf(vehicle?.year?.toString().orEmpty()) };var engine by remember { mutableStateOf(vehicle?.engine.orEmpty()) }
 var vin by remember { mutableStateOf(vehicle?.vin.orEmpty()) };var category by remember { mutableStateOf("") }
 var part by remember { mutableStateOf("") };var description by remember { mutableStateOf("") }
 var city by remember { mutableStateOf("") };var condition by remember { mutableStateOf("ნებისმიერი") }
 var budget by remember { mutableStateOf("") };var busy by remember { mutableStateOf(false) }
 var error by remember { mutableStateOf("") }
 var preparingPhotos by remember { mutableStateOf(false) }
 var customCategories by remember { mutableStateOf(emptyList<String>()) }
 DisposableEffect(Unit){
  val l=FirebaseFirestore.getInstance().collection("pf_categories").addSnapshotListener{s,e->if(e==null)customCategories=s?.documents?.mapNotNull{it.getString("name")}.orEmpty()}
  onDispose{l.remove()}
 }
 var photos by remember { mutableStateOf(emptyList<String>()) }
 Column(Modifier.fillMaxWidth().background(Color(0xFFF7F8FA)).verticalScroll(rememberScrollState()).padding(20.dp),
  verticalArrangement=Arrangement.spacedBy(9.dp)){
  PfHeading("ახალი მოთხოვნა","შესაბამისი მაღაზიების შეთავაზებები",onClose)
  Entry("ნაწილის დასახელება",part,{part=it.take(120)})
  Choose("მარკა",vehicles.keys.sorted(),brand){brand=it;model=""}
  Choose("მოდელი",vehicles[brand].orEmpty(),model){model=it}
  Entry("წელი",year,{year=it},true);Entry("ძრავა",engine,{engine=it})
  Entry("VIN (არასავალდებულო)",vin,{vin=it.uppercase().take(17)})
  Choose("კატეგორია",(categories+customCategories).distinct().sorted(),category){category=it}
  Entry("აღწერა",description,{description=it.take(2000)})
  Choose("ქალაქი",cities,city){city=it}
  Choose("მდგომარეობა",listOf("ნებისმიერი","ახალი","მეორადი"),condition){condition=it}
  Entry("ბიუჯეტი ₾ (არასავალდებულო)",budget,{budget=it},true)
  RequestPhotos(photos,{photos=it},{error=it},{preparingPhotos=it})
  if(error.isNotBlank())Text(error,color=Color(0xFFB54730))
  PfButton(enabled=!busy&&!preparingPhotos,onClick={
   val y=year.toIntOrNull();val b=if(budget.isBlank())null else budget.toDoubleOrNull()
   val uid=FirebaseAuth.getInstance().currentUser?.uid
   error=when{
    uid==null->"მოთხოვნის განთავსებისთვის გაიარე ავტორიზაცია."
    brand.isBlank()||model.isBlank()||category.isBlank()||city.isBlank()||part.isBlank()||engine.isBlank()||description.isBlank()->"შეავსე სავალდებულო ველები."
    y==null||y<1950||y>Calendar.getInstance().get(Calendar.YEAR)+1->"წელი არასწორია."
    vin.isNotBlank()&&!Regex("[A-HJ-NPR-Z0-9]{17}").matches(vin)->"VIN უნდა შეიცავდეს 17 სწორ სიმბოლოს."
    budget.isNotBlank()&&(b==null||b<=0||b>1000000)->"ბიუჯეტი არასწორია."
    else->""
   }
   if(error.isBlank()&&uid!=null&&y!=null){
    busy=true
    val data=hashMapOf<String,Any?>("ownerId" to uid,"brand" to brand,"model" to model,
     "year" to y,"engine" to engine.trim(),"vin" to vin,"category" to category,
     "part" to part.trim(),"description" to description.trim(),"city" to city,
     "condition" to condition,"budget" to b,"photos" to photos,
     "status" to "open","previousStatus" to "open","acceptedOfferId" to null,
     "createdAt" to FieldValue.serverTimestamp())
    FirebaseFirestore.getInstance().collection("pf_requests").add(data)
     .addOnCompleteListener { busy=false;if(it.isSuccessful)onClose() else error="მოთხოვნა ვერ შეინახა. გადაამოწმე მონაცემები ან წვდომა." }
   }
  },modifier=Modifier.fillMaxWidth()){Text(if(busy)"იგზავნება..." else "მოთხოვნის გაგზავნა")}
  PfOutlineButton(onClick=onClose,modifier=Modifier.fillMaxWidth()){Text("დახურვა")}
 }
}
