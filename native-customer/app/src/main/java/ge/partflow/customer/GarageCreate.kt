package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val ink=Color(0xFF142332)
private val accent=Color(0xFFF18B51)
private val muted=Color(0xFF737C87)
private val border=Color(0xFFE7EAED)
private val brands=VehicleCatalog.keys.toList()
private val models=VehicleCatalog
@Composable private fun WizardLabel(text:String){Text(text,color=ink,fontSize=13.sp,fontWeight=FontWeight.SemiBold)}
@Composable private fun WizardInput(label:String,value:String,onChange:(String)->Unit,placeholder:String="",numeric:Boolean=false){
 Column(verticalArrangement=Arrangement.spacedBy(6.dp)){
  WizardLabel(label)
  PfField(value=value,onValueChange=onChange,placeholder={Text(placeholder,color=muted)},singleLine=true,modifier=Modifier.fillMaxWidth(),keyboardOptions=KeyboardOptions(keyboardType=if(numeric)KeyboardType.Number else KeyboardType.Text))
 }
}
@Composable private fun WizardChoice(label:String,value:String,options:List<String>,onChange:(String)->Unit){PfChoice(label,value,options,onChange,enabled=options.isNotEmpty())}
@Composable private fun WizardButton(label:String,onClick:()->Unit,enabled:Boolean=true,primary:Boolean=true){
 if(primary)PfButton(onClick,enabled=enabled){Text(label)} else PfOutlineButton(onClick,enabled=enabled){Text(label)}
}
@Composable fun GarageCreate(onClose:()->Unit){
 if(!featureEnabled("garage")){Text("ფუნქცია დროებით გამორთულია.");return}
 var step by remember { mutableIntStateOf(0) }
 var method by remember { mutableStateOf("manual") }
 var brand by remember { mutableStateOf("") }
 var model by remember { mutableStateOf("") }
 var year by remember { mutableStateOf("") }
 var engine by remember { mutableStateOf("") }
 var vin by remember { mutableStateOf("") }
 var trim by remember { mutableStateOf("") }
 var plate by remember { mutableStateOf("") }
 var fuel by remember { mutableStateOf("") }
 var busy by remember { mutableStateOf(false) }
 var error by remember { mutableStateOf("") }
 var confirmed by remember { mutableStateOf(false) }
 val store=remember { GarageData() }
 val context=LocalContext.current
 fun decode(){busy=true;error="";VehicleRecognition.decode(vin){car,message->busy=false;if(car!=null){brand=car.brand;model=car.model;year=car.year;engine=car.engine;trim=car.trim;fuel=car.fuel;step=2;error=if(car.warning)"მონაცემები არასრულია — გადაამოწმე და შეავსე." else ""}else error=message.orEmpty()}}
 val photo=rememberLauncherForActivityResult(ActivityResultContracts.GetContent()){uri->if(uri!=null){busy=true;VehicleRecognition.scan(context,uri){code,message->busy=false;if(code!=null){vin=code;method="vin";step=1;error="VIN ამოცნობილია. გააგრძელე მონაცემების ამოცნობა."}else error=message.orEmpty()}}}

 Column(Modifier.fillMaxWidth().fillMaxHeight().background(Color(0xFFF7F8FA)).verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
  Row(verticalAlignment=Alignment.CenterVertically){
   Column(Modifier.weight(1f)){
    Text("მანქანის დამატება · ${if(step==0)1 else 2} / 2",fontSize=11.sp,color=muted)
    Spacer(Modifier.height(8.dp))
    Text(when(step){0->"როგორ გსურთ ავტომობილის დამატება?";1->"VIN-კოდი";else->"შეამოწმე ავტომობილის მონაცემები"},fontSize=21.sp,fontWeight=FontWeight.Bold,color=ink,lineHeight=28.sp)
   }
   PfTextButton(onClick=onClose,enabled=!busy){Text("✕",color=ink,fontSize=21.sp)}
  }
  HorizontalDivider(color=border)
  when(step){
   0->{
    Text("აირჩიე ავტომობილის დამატების მეთოდი",fontSize=13.sp,color=muted)
    WizardButton("▣  ტექპასპორტის ფოტოდან",onClick={photo.launch("image/*")},enabled=!busy,primary=false)
    Text("VIN ამოიცნობა მოწყობილობაზე; ფოტო არ აიტვირთება. დაფარე სახელი, პირადი ნომერი და მისამართი.",fontSize=11.sp,color=muted)
    WizardButton("⌗  VIN-კოდით დამატება",onClick={method="vin";step=1},primary=false)
    Text("17-სიმბოლოიანი კოდით ავტომობილის ამოცნობა",fontSize=11.sp,color=muted)
    WizardButton("✎  ხელით დამატება",onClick={method="manual";step=2},primary=false)
    Text("მარკა, მოდელი, წელი, ძრავი და სხვა მონაცემები",fontSize=11.sp,color=muted)
   }
   1->{
    WizardInput("VIN-კოდი",vin,{vin=it.uppercase().filter { c->c in '0'..'9'||c in 'A'..'Z' && c !in "IOQ" }.take(17)},"მაგ. JTDBR32E...")
    Text("${vin.length}/17 სიმბოლო",fontSize=11.sp,color=muted)
    WizardButton(if(busy)"მიმდინარეობს..." else "VIN-ით ამოცნობა",onClick={decode()},enabled=!busy&&vin.length==17)
    Text("კოდი გადაიცემა NHTSA vPIC-ს. არასრული პასუხი ხელით გადაამოწმე.",fontSize=11.sp,color=muted)
    WizardButton("ხელით დამატება",onClick={method="manual";step=2},primary=false)
   }
   else->{
    WizardChoice("მარკა",brand,brands){brand=it;model=""}
    WizardChoice("მოდელი",model,models[brand].orEmpty()){model=it}
    WizardInput("გამოშვების წელი",year,{year=it.filter(Char::isDigit).take(4)},"მაგ. 2018",true)
    WizardInput("ძრავი",engine,{engine=it.take(80)},"მაგ. 2.0 დიზელი / უცნობია")
    WizardInput("სახელმწიფო ნომერი",plate,{plate=it.uppercase().filter{c->c in 'A'..'Z'||c in '0'..'9'||c==' '||c=='-'}.take(12)},"არასავალდებულო")
    WizardInput("კომპლექტაცია",trim,{trim=it.take(80)},"არასავალდებულო")
    WizardInput("საწვავი",fuel,{fuel=it.take(50)},"არასავალდებულო")
    WizardInput("VIN-კოდი",vin,{vin=it.uppercase().filter { c->c in '0'..'9'||c in 'A'..'Z' && c !in "IOQ" }.take(17)},"არასავალდებულო · 17 სიმბოლო")
    PfCheck(confirmed,{confirmed=it},"ვადასტურებ, რომ მონაცემები გადავამოწმე.")
    WizardButton(if(busy)"ინახება..." else "✓  მანქანის შენახვა",enabled=!busy&&confirmed,onClick={
     val y=year.toIntOrNull()
     error=when{
      brand.isBlank()||model.isBlank()->"აირჩიე მარკა და მოდელი."
      y==null||y !in 1950..2100->"მიუთითე სწორი გამოშვების წელი."
      engine.isBlank()->"მიუთითე ძრავი ან ჩაწერე უცნობია."
      vin.isNotBlank()&&vin.length!=17->"VIN უნდა შეიცავდეს 17 სიმბოლოს."
      else->""
     }
     if(error.isEmpty()){
      busy=true
      store.add(brand,model,y!!,engine,vin,trim,fuel,plate){message->busy=false;if(message==null)onClose() else error=message}
     }
    })
    WizardButton("← უკან",onClick={step=if(method=="vin")1 else 0},primary=false)
   }
  }
  if(error.isNotBlank())Text(error,color=Color(0xFFB54730),fontSize=12.sp)
 }
}
