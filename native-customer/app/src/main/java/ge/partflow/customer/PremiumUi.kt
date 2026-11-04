package ge.partflow.customer

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

object Pf {
 val ink=Color(0xFF142332);val orange=Color(0xFFF18B51);val bg=Color(0xFFF7F8FA)
 val line=Color(0xFFE7EAED);val muted=Color(0xFF737C87);val soft=Color(0xFFFFF0E8)
}
@Composable fun PfField(value:String,onValueChange:(String)->Unit,modifier:Modifier=Modifier,
 label:(@Composable ()->Unit)?=null,placeholder:(@Composable ()->Unit)?=null,
 singleLine:Boolean=false,visualTransformation:VisualTransformation=VisualTransformation.None,
 keyboardOptions:KeyboardOptions=KeyboardOptions.Default,enabled:Boolean=true){
 var focused by remember { mutableStateOf(false) }
 Column(modifier,verticalArrangement=Arrangement.spacedBy(8.dp)){
  if(label!=null) androidx.compose.runtime.CompositionLocalProvider(androidx.compose.material3.LocalTextStyle provides TextStyle(color=Pf.muted,fontSize=11.sp)){label()}
  BasicTextField(value,onValueChange,enabled=enabled,singleLine=singleLine,
   visualTransformation=visualTransformation,keyboardOptions=keyboardOptions,
   textStyle=TextStyle(color=Pf.ink,fontSize=15.sp,lineHeight=23.sp),
   cursorBrush=SolidColor(Pf.orange),
   modifier=Modifier.fillMaxWidth().onFocusChanged{focused=it.isFocused}
    .clip(RoundedCornerShape(12.dp)).background(Color.White)
    .border(if(focused)2.dp else 1.dp,if(focused)Pf.orange else Pf.line,RoundedCornerShape(12.dp))
    .defaultMinSize(minHeight=52.dp).padding(horizontal=14.dp,vertical=14.dp),
   decorationBox={inner->Box {if(value.isEmpty()&&placeholder!=null)placeholder();inner()}})
 }
}
@Composable fun PfButton(onClick:()->Unit,modifier:Modifier=Modifier,enabled:Boolean=true,
 content:@Composable RowScope.()->Unit){
 Row(modifier.fillMaxWidth().defaultMinSize(minHeight=52.dp).clip(RoundedCornerShape(12.dp))
  .background(if(enabled)Pf.orange else Pf.line).clickable(enabled=enabled,role=Role.Button,onClick=onClick)
  .padding(15.dp),horizontalArrangement=Arrangement.Center,verticalAlignment=Alignment.CenterVertically){
  androidx.compose.runtime.CompositionLocalProvider(androidx.compose.material3.LocalContentColor provides Pf.ink,
   androidx.compose.material3.LocalTextStyle provides TextStyle(fontSize=13.sp,fontWeight=FontWeight.Bold)){content()}
 }
}
@Composable fun PfOutlineButton(onClick:()->Unit,modifier:Modifier=Modifier,enabled:Boolean=true,content:@Composable RowScope.()->Unit){
 Row(modifier.fillMaxWidth().defaultMinSize(minHeight=50.dp).clip(RoundedCornerShape(12.dp)).background(Color.White)
  .border(1.dp,Pf.line,RoundedCornerShape(12.dp)).clickable(enabled=enabled,role=Role.Button,onClick=onClick).padding(14.dp),
  horizontalArrangement=Arrangement.Center,verticalAlignment=Alignment.CenterVertically){
  androidx.compose.runtime.CompositionLocalProvider(androidx.compose.material3.LocalContentColor provides if(enabled)Pf.ink else Pf.muted,
   androidx.compose.material3.LocalTextStyle provides TextStyle(fontSize=13.sp)){content()}
 }
}
@Composable fun PfTextButton(onClick:()->Unit,modifier:Modifier=Modifier,enabled:Boolean=true,content:@Composable RowScope.()->Unit){
 Row(modifier.defaultMinSize(minHeight=48.dp).clip(RoundedCornerShape(10.dp)).clickable(enabled=enabled,role=Role.Button,onClick=onClick).padding(12.dp),
  horizontalArrangement=Arrangement.Center,verticalAlignment=Alignment.CenterVertically,content=content)
}
@Composable fun PfCard(modifier:Modifier=Modifier,content:@Composable ColumnScope.()->Unit){
 Column(modifier.clip(RoundedCornerShape(17.dp)).background(Color.White).border(1.dp,Pf.line,RoundedCornerShape(17.dp)),content=content)
}
@Composable fun PfChip(selected:Boolean,onClick:()->Unit,label:@Composable ()->Unit){
 Box(Modifier.defaultMinSize(minHeight=44.dp).clip(RoundedCornerShape(11.dp)).background(if(selected)Pf.ink else Color.White)
  .border(1.dp,if(selected)Pf.ink else Pf.line,RoundedCornerShape(11.dp)).clickable(role=Role.RadioButton,onClick=onClick).padding(12.dp)){
  androidx.compose.runtime.CompositionLocalProvider(androidx.compose.material3.LocalContentColor provides if(selected)Color.White else Pf.ink,
   androidx.compose.material3.LocalTextStyle provides TextStyle(fontSize=12.sp)){label()}
 }
}
@Composable fun PfChoice(label:String,value:String,options:List<String>,onChange:(String)->Unit,enabled:Boolean=true){
 var open by remember { mutableStateOf(false) };var query by remember { mutableStateOf("") }
 Column(verticalArrangement=Arrangement.spacedBy(8.dp)){
  Text(label,color=Pf.muted,fontSize=11.sp)
  Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Color.White).border(1.dp,Pf.line,RoundedCornerShape(12.dp))
   .clickable(enabled=enabled,role=Role.Button){query="";open=true}.padding(15.dp),verticalAlignment=Alignment.CenterVertically){
   Text(value.ifBlank{"აირჩიე"},Modifier.weight(1f),color=if(value.isBlank())Pf.muted else Pf.ink,fontSize=14.sp)
   Text("⌄",color=Pf.orange,fontSize=20.sp)
  }
 }
 if(open) Dialog(onDismissRequest={open=false},properties=DialogProperties(usePlatformDefaultWidth=false)){
  Column(Modifier.fillMaxWidth().padding(16.dp).heightIn(max=600.dp).clip(RoundedCornerShape(24.dp)).background(Pf.bg).padding(20.dp),
   verticalArrangement=Arrangement.spacedBy(14.dp)){
   Row(verticalAlignment=Alignment.CenterVertically){Text(label,Modifier.weight(1f),fontSize=20.sp,fontWeight=FontWeight.Bold,color=Pf.ink);PfTextButton({open=false}){Text("✕",color=Pf.ink)}}
   PfField(query,{query=it},placeholder={Text("ძებნა…",color=Pf.muted)},singleLine=true)
   LazyColumn(Modifier.weight(1f,false),verticalArrangement=Arrangement.spacedBy(8.dp)){
    val filtered=options.filter{it.contains(query,ignoreCase=true)}
    if(filtered.isEmpty())item{Text("შედეგი ვერ მოიძებნა",color=Pf.muted)}
    items(filtered){option->
     Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if(option==value)Pf.soft else Color.White)
      .border(1.dp,if(option==value)Pf.orange else Pf.line,RoundedCornerShape(12.dp))
      .clickable(role=Role.RadioButton){onChange(option);open=false}.padding(16.dp)){
      Text(option,Modifier.weight(1f),fontSize=14.sp,color=Pf.ink)
      if(option==value)Text("✓",color=Pf.ink)
     }
    }
   }
  }
 }
}
@Composable fun PfCheck(checked:Boolean,onCheckedChange:(Boolean)->Unit,label:String){
 Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Pf.soft)
  .clickable(role=Role.Checkbox){onCheckedChange(!checked)}.padding(14.dp),verticalAlignment=Alignment.CenterVertically){
  Box(Modifier.size(24.dp).clip(RoundedCornerShape(7.dp)).background(if(checked)Pf.orange else Color.White)
   .border(1.dp,Pf.orange,RoundedCornerShape(7.dp)),contentAlignment=Alignment.Center){if(checked)Text("✓",color=Pf.ink)}
  Spacer(Modifier.width(12.dp));Text(label,fontSize=12.sp,color=Pf.ink)
 }
}
@Composable fun PfHeading(title:String,subtitle:String="",onClose:(()->Unit)?=null){
 Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
  Column(Modifier.weight(1f)){if(subtitle.isNotEmpty())Text(subtitle,color=Pf.muted,fontSize=11.sp);Text(title,color=Pf.ink,fontSize=22.sp,fontWeight=FontWeight.Bold,lineHeight=30.sp)}
  if(onClose!=null)PfTextButton(onClose){Text("✕",color=Pf.ink,fontSize=20.sp)}
 }
}
@Composable fun ChatBubble(mine:Boolean,sender:String,body:String){
 Row(Modifier.fillMaxWidth(),horizontalArrangement=if(mine)Arrangement.End else Arrangement.Start){
  Column(Modifier.fillMaxWidth(.9f).clip(RoundedCornerShape(16.dp,16.dp,if(mine)4.dp else 16.dp,if(mine)16.dp else 4.dp))
   .background(if(mine)Pf.ink else Color.White).border(1.dp,if(mine)Pf.ink else Pf.line,RoundedCornerShape(16.dp)).padding(14.dp)){
   Text(sender,color=if(mine)Pf.orange else Pf.muted,fontSize=10.sp)
   Spacer(Modifier.height(5.dp));Text(body,color=if(mine)Color.White else Pf.ink,fontSize=14.sp,lineHeight=22.sp)
  }
 }
}
