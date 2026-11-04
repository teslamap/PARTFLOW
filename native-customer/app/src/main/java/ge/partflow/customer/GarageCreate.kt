package ge.partflow.customer

import androidx.compose.foundation.*
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
private val brands=listOf("Audi","BMW","Chevrolet","Ford","Honda","Hyundai","Jeep","Kia","Lexus","Mazda","Mercedes","Mitsubishi","Nissan","Opel","Subaru","Tesla","Toyota","Volkswagen","Volvo")
private val models=mapOf("Tesla" to listOf("Model 3","Model S","Model X","Model Y","Cybertruck"),"Toyota" to listOf("Prius","Camry","Corolla","RAV4","Land Cruiser"),"BMW" to listOf("3 Series","5 Series","X3","X5"),"Mercedes" to listOf("C-Class","E-Class","GLC","GLE"),"Nissan" to listOf("Bluebird","Note","Leaf","X-Trail"))
@Composable private fun WizardLabel(text:String){Text(text,color=ink,fontSize=13.sp,fontWeight=FontWeight.SemiBold)}
@Composable private fun WizardInput(label:String,value:String,onChange:(String)->Unit,placeholder:String="",numeric:Boolean=false){
 Column(verticalArrangement=Arrangement.spacedBy(6.dp)){
  WizardLabel(label)
  OutlinedTextField(value=value,onValueChange=onChange,placeholder={Text(placeholder,color=muted)},singleLine=true,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(12.dp),keyboardOptions=KeyboardOptions(keyboardType=if(numeric)KeyboardType.Number else KeyboardType.Text),colors=OutlinedTextFieldDefaults.colors(focusedBorderColor=accent,unfocusedBorderColor=border,focusedContainerColor=Color.White,unfocusedContainerColor=Color.White))
 }
}
@Composable private fun WizardChoice(label:String,value:String,options:List<String>,onChange:(String)->Unit){
 var expanded by remember { mutableStateOf(false) }
 Column(verticalArrangement=Arrangement.spacedBy(6.dp)){
  WizardLabel(label)
  Box {
   OutlinedButton(onClick={expanded=true},modifier=Modifier.fillMaxWidth().height(54.dp),shape=RoundedCornerShape(12.dp),colors=ButtonDefaults.outlinedButtonColors(containerColor=Color.White,contentColor=ink),border=BorderStroke(1.dp,border)){
    Text(value.ifBlank { "აირჩიე" },modifier=Modifier.weight(1f),maxLines=1)
    Text("⌄")
   }
   DropdownMenu(expanded=expanded,onDismissRequest={expanded=false},modifier=Modifier.heightIn(max=320.dp).background(Color.White)){
    options.forEach { option->DropdownMenuItem(text={Text(option,color=ink)},onClick={onChange(option);expanded=false}) }
   }
  }
 }
}
@Composable private fun WizardButton(label:String,onClick:()->Unit,enabled:Boolean=true,primary:Boolean=true){
 Button(onClick=onClick,enabled=enabled,modifier=Modifier.fillMaxWidth().height(52.dp),shape=RoundedCornerShape(12.dp),colors=ButtonDefaults.buttonColors(containerColor=if(primary)accent else Color.White,contentColor=ink),border=if(primary)null else BorderStroke(1.dp,border)){Text(label,fontWeight=FontWeight.Bold)}
}
@Composable fun GarageCreate(onClose:()->Unit){
 var step by remember { mutableIntStateOf(0) }
 var method by remember { mutableStateOf("manual") }
 var brand by remember { mutableStateOf("") }
 var model by remember { mutableStateOf("") }
 var year by remember { mutableStateOf("") }
 var engine by remember { mutableStateOf("") }
 var vin by remember { mutableStateOf("") }
 var trim by remember { mutableStateOf("") }
 var fuel by remember { mutableStateOf("") }
 var busy by remember { mutableStateOf(false) }
 var error by remember { mutableStateOf("") }
 var confirmed by remember { mutableStateOf(false) }
 val store=remember { GarageData() }
 Column(Modifier.fillMaxWidth().fillMaxHeight().background(Color(0xFFF7F8FA)).verticalScroll(rememberScrollState()).padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
  Row(verticalAlignment=Alignment.CenterVertically){
   Column(Modifier.weight(1f)){
    Text("მანქანის დამატება · ${if(step==0)1 else 2} / 2",fontSize=11.sp,color=muted)
    Spacer(Modifier.height(8.dp))
    Text(when(step){0->"როგორ გსურთ ავტომობილის დამატება?";1->"VIN-კოდი";else->"შეამოწმე ავტომობილის მონაცემები"},fontSize=21.sp,fontWeight=FontWeight.Bold,color=ink,lineHeight=28.sp)
   }
   TextButton(onClick=onClose,enabled=!busy){Text("✕",color=ink,fontSize=21.sp)}
  }
  HorizontalDivider(color=border)
  when(step){
   0->{
    Text("აირჩიე ავტომობილის დამატების მეთოდი",fontSize=13.sp,color=muted)
    WizardButton("▣  ტექპასპორტის ფოტოდან",onClick={error="ფოტოდან ამოცნობა Native ვერსიაში ჯერ არ არის ჩართული. აირჩიე VIN ან ხელით დამატება."},primary=false)
    WizardButton("⌗  VIN-კოდით დამატება",onClick={method="vin";step=1},primary=false)
    Text("17-სიმბოლოიანი კოდით ავტომობილის ამოცნობა",fontSize=11.sp,color=muted)
    WizardButton("✎  ხელით დამატება",onClick={method="manual";step=2},primary=false)
    Text("მარკა, მოდელი, წელი, ძრავი და სხვა მონაცემები",fontSize=11.sp,color=muted)
   }
   1->{
    WizardInput("VIN-კოდი",vin,{vin=it.uppercase().filter { c->c.isDigit()||c in 'A'..'Z' }.take(17)},"მაგ. JTDBR32E...")
    Text("${vin.length}/17 სიმბოლო",fontSize=11.sp,color=muted)
    WizardButton("მონაცემების გადამოწმება",onClick={step=2;error="VIN-ის ავტომატური ამოცნობა ჯერ არ არის ჩართული. შეავსე და გადაამოწმე მონაცემები ხელით."},enabled=vin.length==17)
    WizardButton("ხელით დამატება",onClick={method="manual";step=2},primary=false)
   }
   else->{
    WizardChoice("მარკა",brand,brands){brand=it;model=""}
    WizardChoice("მოდელი",model,models[brand].orEmpty().ifEmpty { listOf("სხვა") }){model=it}
    WizardInput("გამოშვების წელი",year,{year=it.filter(Char::isDigit).take(4)},"მაგ. 2018",true)
    WizardInput("ძრავი",engine,{engine=it.take(80)},"მაგ. 2.0 დიზელი / უცნობია")
    WizardInput("კომპლექტაცია",trim,{trim=it.take(80)},"არასავალდებულო")
    WizardInput("საწვავი",fuel,{fuel=it.take(50)},"არასავალდებულო")
    WizardInput("VIN-კოდი",vin,{vin=it.uppercase().filter { c->c.isDigit()||c in 'A'..'Z' }.take(17)},"არასავალდებულო · 17 სიმბოლო")
    Row(verticalAlignment=Alignment.CenterVertically){
     Checkbox(checked=confirmed,onCheckedChange={confirmed=it},colors=CheckboxDefaults.colors(checkedColor=accent))
     Text("ვადასტურებ, რომ მონაცემები გადავამოწმე.",fontSize=12.sp,color=ink)
    }
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
      store.add(brand,model,y!!,engine,vin,trim,fuel){message->busy=false;if(message==null)onClose() else error=message}
     }
    })
    WizardButton("← უკან",onClick={step=if(method=="vin")1 else 0},primary=false)
   }
  }
  if(error.isNotBlank())Text(error,color=Color(0xFFB54730),fontSize=12.sp)
 }
}
