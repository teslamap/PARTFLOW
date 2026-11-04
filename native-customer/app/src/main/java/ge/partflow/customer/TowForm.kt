package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.Locale

@Composable fun TowForm(onClose:()->Unit){
 var mode by remember { mutableStateOf("sos") }
 var city by remember { mutableStateOf("ბათუმი") }
 var destCity by remember { mutableStateOf("ბათუმი") }
 var origin by remember { mutableStateOf("") }
 var dest by remember { mutableStateOf("") }
 var vehicle by remember { mutableStateOf("") }
 var condition by remember { mutableStateOf("rolls") }
 var notes by remember { mutableStateOf("") }
 var phone by remember { mutableStateOf("") }
 var lat by remember { mutableStateOf("") }
 var lng by remember { mutableStateOf("") }
 var pickup by remember { mutableStateOf("") }
 var error by remember { mutableStateOf("") }
 var busy by remember { mutableStateOf(false) }
 Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
  verticalArrangement=Arrangement.spacedBy(8.dp)){
  Text("ევაკუატორის გამოძახება",style=MaterialTheme.typography.titleLarge)
  Row { FilterChip(mode=="sos",{mode="sos"},label={Text("SOS")});Spacer(Modifier.width(8.dp))
   FilterChip(mode=="intercity",{mode="intercity"},label={Text("ქალაქთაშორისი")}) }
  val cities=listOf("თბილისი","ბათუმი","ქუთაისი","რუსთავი","გორი","ზუგდიდი","ფოთი","თელავი","ქობულეთი","ოზურგეთი","მცხეთა","ახალციხე","სენაკი","ზესტაფონი","წყალტუბო","ხაშური","ბორჯომი","მარტვილი","სამტრედია","ხელვაჩაური","ქედა","შუახევი","ხულო")
  var fromExpanded by remember { mutableStateOf(false) }
  var toExpanded by remember { mutableStateOf(false) }
  ExposedDropdownMenuBox(expanded=fromExpanded,onExpandedChange={fromExpanded=it}){
   OutlinedTextField(value=city,onValueChange={},readOnly=true,label={Text("ქალაქი")},
    trailingIcon={ExposedDropdownMenuDefaults.TrailingIcon(expanded=fromExpanded)},
    modifier=Modifier.menuAnchor().fillMaxWidth())
   ExposedDropdownMenu(expanded=fromExpanded,onDismissRequest={fromExpanded=false}){
    cities.forEach { c->DropdownMenuItem(text={Text(c)},onClick={city=c;fromExpanded=false}) }
   }
  }
  ExposedDropdownMenuBox(expanded=toExpanded,onExpandedChange={toExpanded=it}){
   OutlinedTextField(value=destCity,onValueChange={},readOnly=true,label={Text("დანიშნულების ქალაქი")},
    trailingIcon={ExposedDropdownMenuDefaults.TrailingIcon(expanded=toExpanded)},
    modifier=Modifier.menuAnchor().fillMaxWidth())
   ExposedDropdownMenu(expanded=toExpanded,onDismissRequest={toExpanded=false}){
    cities.forEach { c->DropdownMenuItem(text={Text(c)},onClick={destCity=c;toExpanded=false}) }
   }
  }
  OutlinedTextField(origin,{origin=it},label={Text("საიდან")},modifier=Modifier.fillMaxWidth())
  OutlinedTextField(dest,{dest=it},label={Text("სად")},modifier=Modifier.fillMaxWidth())
  OutlinedTextField(vehicle,{vehicle=it},label={Text("ავტომობილი")},modifier=Modifier.fillMaxWidth())
  OutlinedTextField(phone,{phone=it},label={Text("ტელეფონი +9955XXXXXXXX")},modifier=Modifier.fillMaxWidth())
  Row { listOf("rolls" to "გორავს","blocked" to "დაბლოკილია","accident" to "ავარია").forEach { (v,t)->
   FilterChip(condition==v,{condition=v},label={Text(t)}) } }
  if(mode=="sos"){
   OutlinedTextField(lat,{lat=it},label={Text("Latitude")},modifier=Modifier.fillMaxWidth())
   OutlinedTextField(lng,{lng=it},label={Text("Longitude")},modifier=Modifier.fillMaxWidth())
  } else OutlinedTextField(pickup,{pickup=it},label={Text("თარიღი yyyy-MM-dd HH:mm")},modifier=Modifier.fillMaxWidth())
  OutlinedTextField(notes,{notes=it.take(1000)},label={Text("შენიშვნა")},modifier=Modifier.fillMaxWidth())
  if(error.isNotBlank())Text(error,color=MaterialTheme.colorScheme.error)
  Button(enabled=!busy,onClick={
   val date=try{SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.US).apply{isLenient=false}.parse(pickup)}catch(_:Exception){null}
   busy=true
   TowCreate.submit(mode,city,destCity,origin,dest,vehicle,condition,notes,phone,
    lat.toDoubleOrNull(),lng.toDoubleOrNull(),date){result->
    busy=false;if(result==null)onClose() else error=result
   }
  },modifier=Modifier.fillMaxWidth()){Text(if(busy)"იგზავნება..." else "გამოძახება")}
  TextButton(onClick=onClose){Text("დახურვა")}
 }
}
