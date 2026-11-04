package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable fun GarageCreate(onClose:()->Unit){
 var brand by remember { mutableStateOf("") }
 var model by remember { mutableStateOf("") }
 var year by remember { mutableStateOf("") }
 var engine by remember { mutableStateOf("") }
 var vin by remember { mutableStateOf("") }
 var trim by remember { mutableStateOf("") }
 var fuel by remember { mutableStateOf("") }
 var busy by remember { mutableStateOf(false) }
 var error by remember { mutableStateOf("") }
 val store=remember { GarageData() }
 Column(Modifier.fillMaxWidth().background(Color(0xFFF7F8FA)).verticalScroll(rememberScrollState()).padding(20.dp),
 verticalArrangement=Arrangement.spacedBy(10.dp)){
  Text("ავტომობილის დამატება",style=MaterialTheme.typography.titleLarge)
  @Composable fun field(label:String,value:String,change:(String)->Unit){
   OutlinedTextField(value=value,onValueChange=change,label={Text(label)},singleLine=true,modifier=Modifier.fillMaxWidth())
  }
  field("მარკა",brand,{brand=it.take(60)})
  field("მოდელი",model,{model=it.take(80)})
  field("წელი",year,{year=it.filter(Char::isDigit).take(4)})
  field("ძრავა",engine,{engine=it.take(80)})
  field("VIN (არასავალდებულო)",vin,{vin=it.uppercase().take(17)})
  field("კომპლექტაცია",trim,{trim=it.take(80)})
  field("საწვავი",fuel,{fuel=it.take(50)})
  if(error.isNotBlank())Text(error,color=Color(0xFFB54730))
  Button(enabled=!busy,onClick={
   val y=year.toIntOrNull()
   if(y==null)error="მიუთითე სწორი წელი."
   else {
    busy=true;error=""
    store.add(brand,model,y,engine,vin,trim,fuel){message->
     busy=false
     if(message==null)onClose() else error=message
    }
   }
  },modifier=Modifier.fillMaxWidth()){Text(if(busy)"ინახება..." else "ავტომობილის შენახვა")}
  OutlinedButton(onClick=onClose,modifier=Modifier.fillMaxWidth()){Text("დახურვა")}
 }
}
