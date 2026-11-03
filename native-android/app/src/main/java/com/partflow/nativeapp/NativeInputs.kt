package com.partflow.nativeapp

import android.Manifest
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.location.LocationManager
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.location.LocationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.os.CancellationSignal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

@Composable fun NativeInputs(vm: AppModel,editor: Editor,values: MutableMap<String,String>,busy: Boolean) {
    val context=LocalContext.current
    val photoPicker=rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(4)) { uris ->
        if(uris.isNotEmpty())vm.run({
            val photos=withContext(Dispatchers.IO){uris.take(4).map{compressPhoto(context,it)}}
            values["_photos"]=JSONArray(photos).toString()
        })
    }
    val locationPermission=rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if(granted)vm.run({
            val location=kotlinx.coroutines.withTimeout(15000){currentLocation(context)}
            values["lat"]=location.latitude.toString();values["lng"]=location.longitude.toString()
        }) else vm.notice.value="მდებარეობის უფლება არ არის მინიჭებული; კოორდინატები შეგიძლია ხელით შეავსო."
    }
    if(editor.fields.any{it.key=="lat"})OutlinedButton(enabled=!busy,onClick={locationPermission.launch(Manifest.permission.ACCESS_FINE_LOCATION)}){Text("ჩემი მდებარეობის ჩასმა")}
    if(editor.fields.any{it.key=="vin"})OutlinedButton(enabled=!busy,onClick={vm.run({
        val vin=Domain.vin(values["vin"].orEmpty());require(vin.isNotBlank())
        val result=withContext(Dispatchers.IO){
            val connection=URL("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/$vin?format=json").openConnection() as HttpURLConnection
            connection.connectTimeout=12000;connection.readTimeout=12000
            try { JSONObject(connection.inputStream.bufferedReader().use{it.readText()}).getJSONArray("Results").getJSONObject(0) } finally { connection.disconnect() }
        }
        fun norm(s:String)=s.lowercase().replace(Regex("[^a-z0-9]"),"")
        val brand=vm.repo.brands().find{norm(it)==norm(result.optString("Make")).replace("mercedesbenz","mercedes")} ?: error("VIN ნაწილობრივ ამოიცნო; შეავსე ხელით")
        values["brand"]=brand
        vm.repo.models(brand).find{norm(it)==norm(result.optString("Model"))}?.let{values["model"]=it}
        result.optString("ModelYear").takeIf{it.isNotBlank()}?.let{values["year"]=it}
        result.optString("DisplacementL").takeIf{it.isNotBlank()}?.let{values["engine"]=it+" ლ"}
        values["vin"]=vin
    })}){Text("VIN-ის ამოცნობა")}
    if(editor.key.startsWith("request")) {
        OutlinedButton(enabled=!busy,onClick={photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))}){Text("ფოტოების არჩევა (მაქს. 4)")}
        val photos=values["_photos"]?.let{JSONArray(it)}
        if(photos!=null && photos.length()>0) {
            Text("არჩეული ფოტოები: ${photos.length()}")
            Photo(photos.getString(0))
            TextButton(enabled=!busy,onClick={values.remove("_photos")}){Text("ფოტოების მოცილება")}
        }
    }
}
fun compressPhoto(context:Context,uri:Uri):String {
    val bytes=context.contentResolver.openInputStream(uri)!!.use{ input ->
        val output=ByteArrayOutputStream();val buffer=ByteArray(8192)
        while(output.size()<=4*1024*1024) { val count=input.read(buffer);if(count<0)break;output.write(buffer,0,count) }
        output.toByteArray()
    }
    require(bytes.size<=4*1024*1024){"ფოტოს ზომა მაქს. 4 MB"}
    val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true};BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
    require(bounds.outWidth>0&&bounds.outHeight>0){"ფოტო ვერ წავიკითხე"}
    var sample=1;while(maxOf(bounds.outWidth,bounds.outHeight)/sample>2000)sample*=2
    val bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.size,BitmapFactory.Options().apply{inSampleSize=sample})?:error("ფოტო ვერ წავიკითხე")
    val ratio=minOf(1.0,1000.0/maxOf(bitmap.width,bitmap.height))
    val scaled=Bitmap.createScaledBitmap(bitmap,(bitmap.width*ratio).toInt().coerceAtLeast(1),(bitmap.height*ratio).toInt().coerceAtLeast(1),true)
    try {
        for(quality in 75 downTo 15 step 10) {
            val buffer=ByteArrayOutputStream();scaled.compress(Bitmap.CompressFormat.JPEG,quality,buffer)
            val value="data:image/jpeg;base64,"+Base64.encodeToString(buffer.toByteArray(),Base64.NO_WRAP)
            if(value.length<=180000)return value
        }
        error("ფოტო ძალიან დიდია; აირჩიე უფრო პატარა გამოსახულება")
    } finally { if(scaled!==bitmap)scaled.recycle();bitmap.recycle() }
}
@Composable fun Photo(encoded: String) {
    val image=remember(encoded){runCatching{Base64.decode(encoded.substringAfter(','),Base64.DEFAULT).let{BitmapFactory.decodeByteArray(it,0,it.size)}?.asImageBitmap()}.getOrNull()}
    if(image!=null)Image(image,"მოთხოვნის ფოტო",Modifier.fillMaxWidth().heightIn(max=240.dp))
}
@Suppress("MissingPermission")
suspend fun currentLocation(context: Context):android.location.Location=suspendCancellableCoroutine { continuation ->
    val manager=context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val provider=listOf(LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER).firstOrNull{manager.isProviderEnabled(it)}
    if(provider==null){continuation.resumeWithException(IllegalStateException("ჩართე მოწყობილობის მდებარეობა"));return@suspendCancellableCoroutine}
    val cancel=CancellationSignal();continuation.invokeOnCancellation{cancel.cancel()}
    LocationManagerCompat.getCurrentLocation(manager,provider,cancel,ContextCompat.getMainExecutor(context)) { location ->
        if(continuation.isActive)if(location==null)continuation.resumeWithException(IllegalStateException("მდებარეობა ვერ განისაზღვრა")) else continuation.resume(location)
    }
}
