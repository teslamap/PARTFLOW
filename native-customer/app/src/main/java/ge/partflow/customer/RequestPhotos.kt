package ge.partflow.customer

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.*
import java.io.ByteArrayOutputStream

@Composable fun RequestPhotos(photos:List<String>,onChange:(List<String>)->Unit,onError:(String)->Unit){
 val context=LocalContext.current
 var busy by remember{mutableStateOf(false)}
 val picker=rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()){uris->
  if(photos.size+uris.size>4)onError("შეგიძლია დაამატო მაქსიმუმ 4 ფოტო.")
  else if(uris.isNotEmpty()){
   busy=true
   Thread{
    try{
     val added=uris.map{uri->
      val bytes=context.contentResolver.openInputStream(uri)?.use{it.readBytesLimited(4*1024*1024)}?:throw IllegalArgumentException()
      val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
      check(bounds.outWidth>0&&bounds.outHeight>0)
      var sample=1;while(maxOf(bounds.outWidth,bounds.outHeight)/sample>1200)sample*=2
      val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,BitmapFactory.Options().apply{inSampleSize=sample})?:throw IllegalArgumentException()
      val output=ByteArrayOutputStream();var quality=80
      do{output.reset();bitmap.compress(Bitmap.CompressFormat.JPEG,quality,output);quality-=10}while(output.size()>130000&&quality>=20)
      bitmap.recycle();check(output.size()<=130000)
      "data:image/jpeg;base64,"+Base64.encodeToString(output.toByteArray(),Base64.NO_WRAP)
     }
     Handler(Looper.getMainLooper()).post{busy=false;onChange(photos+added)}
    }catch(_:Exception){Handler(Looper.getMainLooper()).post{busy=false;onError("ფოტო ვერ დამუშავდა. აირჩიე JPG/PNG/WebP მაქს. 4 MB.")}}
   }.start()
  }
 }
 Column(verticalArrangement=Arrangement.spacedBy(10.dp)){
  PfOutlineButton(enabled=!busy,onClick={picker.launch("image/*")}){Text(if(busy)"ფოტოები მზადდება…" else "▣  დაამატე ფოტოები · ${photos.size}/4")}
  Text("ფოტოები აიტვირთება მოთხოვნის გამოქვეყნებისას.",color=Pf.muted,fontSize=11.sp)
  photos.forEachIndexed{i,p->Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){
   val bitmap=remember(p){val bytes=Base64.decode(p.substringAfter(','),Base64.DEFAULT);BitmapFactory.decodeByteArray(bytes,0,bytes.size)}
   if(bitmap!=null)Image(bitmap.asImageBitmap(),"ნაწილის ფოტო ${i+1}",Modifier.size(80.dp))
   PfTextButton({onChange(photos.filterIndexed{n,_->n!=i})}){Text("წაშლა",color=Pf.muted)}
  }}
 }
}
private fun java.io.InputStream.readBytesLimited(max:Int):ByteArray{
 val out=ByteArrayOutputStream();val buffer=ByteArray(8192);var n=read(buffer)
 while(n!=-1){check(out.size()+n<=max);out.write(buffer,0,n);n=read(buffer)}
 return out.toByteArray()
}
