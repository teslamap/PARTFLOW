package com.partflow.nativeapp

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.*

object MapProjection {
    fun x(lng:Double,z:Int)=(lng+180)/360*(1 shl z)
    fun y(lat:Double,z:Int):Double {val r=Math.toRadians(lat.coerceIn(-85.0511,85.0511));return (1-ln(tan(r)+1/cos(r))/PI)/2*(1 shl z)}
}
private suspend fun tile(context:android.content.Context,z:Int,x:Int,y:Int):ImageBitmap?=withContext(Dispatchers.IO) {
    val directory=File(context.filesDir,"map-tiles").apply{mkdirs()}
    val file=File(directory,"${z}_${x}_$y.png");val meta=File(directory,"${z}_${x}_$y.json")
    val policy=runCatching{JSONObject(meta.readText())}.getOrNull()
    val now=System.currentTimeMillis()
    if(!file.exists() || now>(policy?.optLong("expires")?:0)) {
        runCatching {
            val connection=URL("https://tile.openstreetmap.org/$z/$x/$y.png").openConnection() as HttpURLConnection
            connection.setRequestProperty("User-Agent","PARTFLOW-Android/0.1 (+https://github.com/teslamap/PARTFLOW)")
            connection.connectTimeout=10000;connection.readTimeout=10000
            if(file.exists()){policy?.optString("etag")?.takeIf{it.isNotEmpty()}?.let{connection.setRequestProperty("If-None-Match",it)};policy?.optLong("modified")?.let{connection.ifModifiedSince=it}}
            try {
                val code=connection.responseCode
                require(code==200||code==304)
                if(code==200){val bytes=connection.inputStream.use{it.readBytes()};require(bytes.size<2_000_000);file.writeBytes(bytes)}
                val seconds=Regex("max-age=(\\d+)").find(connection.getHeaderField("Cache-Control").orEmpty())?.groupValues?.get(1)?.toLongOrNull()?:604800
                meta.writeText(JSONObject().put("expires",now+maxOf(604800,seconds)*1000).put("etag",connection.getHeaderField("ETag")?:policy?.optString("etag").orEmpty()).put("modified",connection.lastModified.takeIf{it>0}?:policy?.optLong("modified")?:0).toString())
            } finally {connection.disconnect()}
        }
    }
    runCatching{BitmapFactory.decodeFile(file.absolutePath)?.asImageBitmap()}.getOrNull()
}
@Composable fun NativeMap(rows:List<Record>,modifier:Modifier=Modifier,select:(Record)->Unit) {
    val context=LocalContext.current;val density=LocalDensity.current.density;val tilePixels=256*density
    var z by rememberSaveable{mutableIntStateOf(12)}
    var cx by rememberSaveable{mutableDoubleStateOf(MapProjection.x(44.8,12))}
    var cy by rememberSaveable{mutableDoubleStateOf(MapProjection.y(41.7,12))}
    var width by remember{mutableIntStateOf(1)};var height by remember{mutableIntStateOf(1)}
    var search by rememberSaveable{mutableStateOf("")}
    val visible=rows.filter{(title(it)+" "+it.s("city")).contains(search,true)}
    fun point(row:Record):Offset? {
        val loc=row.data["mapLocation"] as? Map<*,*> ?: return null
        val lat=(loc["lat"] as? Number)?.toDouble()?:return null;val lng=(loc["lng"] as? Number)?.toDouble()?:return null
        if(!lat.isFinite()||!lng.isFinite())return null
        return Offset(((MapProjection.x(lng,z)-cx)*tilePixels+width/2).toFloat(),((MapProjection.y(lat,z)-cy)*tilePixels+height/2).toFloat())
    }
    Column(modifier.fillMaxWidth(),verticalArrangement=Arrangement.spacedBy(6.dp)) {
        OutlinedTextField(search,{search=it},label={Text("ძებნა ჩატვირთულ ბიზნესებში")},modifier=Modifier.fillMaxWidth())
        Row {
            TextButton(onClick={if(z<18){z++;cx*=2;cy*=2}}){Text("+ მიახლოება")}
            TextButton(onClick={if(z>5){z--;cx/=2;cy/=2}}){Text("− დაშორება")}
        }
        Box(Modifier.fillMaxWidth().height(300.dp).clipToBounds().onSizeChanged{width=it.width;height=it.height}
            .pointerInput(z){detectDragGestures{change,pan->change.consume();cx=(cx-pan.x/tilePixels).mod((1 shl z).toDouble());cy=(cy-pan.y/tilePixels).coerceIn(0.0,(1 shl z).toDouble())}}
            .pointerInput(visible,cx,cy,z,width,height){detectTapGestures{tap->visible.mapNotNull{r->point(r)?.let{r to (it-tap).getDistance()}}.filter{it.second<30*density}.minByOrNull{it.second}?.first?.let(select)}}) {
            for(tx in floor(cx).toInt()-1..floor(cx).toInt()+1)for(ty in floor(cy).toInt()-1..floor(cy).toInt()+1) {
                val dx=((tx-cx)*tilePixels+width/2).toInt();val dy=((ty-cy)*tilePixels+height/2).toInt()
                if(ty !in 0 until (1 shl z) || dx>=width || dy>=height || dx+tilePixels<=0 || dy+tilePixels<=0)continue
                val x=tx.mod(1 shl z)
                key(z,x,ty) {
                    val bitmap by produceState<ImageBitmap?>(null,z,x,ty){value=tile(context,z,x,ty)}
                    bitmap?.let{Image(it,null,Modifier.offset{IntOffset(dx,dy)}.size(256.dp))}
                }
            }
            Canvas(Modifier.fillMaxSize()) {
                visible.forEach{row->point(row)?.let{p->drawCircle(Color.White,10*density,p);drawCircle(Color(0xFF087C69),7*density,p)}}
            }
        }
        TextButton(onClick={context.startActivity(Intent(Intent.ACTION_VIEW,Uri.parse("https://www.openstreetmap.org/copyright")))}){Text("© OpenStreetMap contributors")}
        LazyColumn(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            items(visible,key={it.path}){row->Card(onClick={select(row)},modifier=Modifier.fillMaxWidth()){Column(Modifier.padding(12.dp)){Text(title(row));Text(row.s("city")+" · "+row.s("mapAddress"))}}}
        }
    }
}
