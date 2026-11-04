package ge.partflow.customer

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class DecodedCar(val brand:String,val model:String,val year:String,val engine:String,val trim:String,val fuel:String,val warning:Boolean)
object VehicleRecognition {
 fun decode(vin:String,done:(DecodedCar?,String?)->Unit){
  if(!Regex("[A-HJ-NPR-Z0-9]{17}").matches(vin)){done(null,"შეამოწმე VIN-კოდი.");return}
  Thread {
   var connection:HttpURLConnection?=null
   try{
    connection=URL("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/$vin?format=json").openConnection() as HttpURLConnection
    connection.connectTimeout=12000;connection.readTimeout=12000
    check(connection.responseCode==200)
    val data=JSONObject(connection.inputStream.bufferedReader().use{it.readText()}).getJSONArray("Results").getJSONObject(0)
    fun normalized(v:String)=v.lowercase().replace(Regex("[^a-z0-9]"),"")
    val raw=data.optString("Make")
    val alias=mapOf("mercedesbenz" to "Mercedes","vw" to "Volkswagen","landrover" to "Land Rover")
    val brand=alias[normalized(raw)]?:VehicleCatalog.keys.find{normalized(it)==normalized(raw)}.orEmpty()
    val model=VehicleCatalog[brand]?.find{normalized(it)==normalized(data.optString("Model"))}.orEmpty()
    val year=data.optString("ModelYear").takeIf{(it.toIntOrNull()?:0) in 1950..java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)+1}.orEmpty()
    check(raw.isNotBlank()||model.isNotBlank()||year.isNotBlank())
    val engine=listOf(data.optString("DisplacementL").takeIf{it.isNotBlank()}?.let{"$it ლ"},data.optString("EngineCylinders").takeIf{it.isNotBlank()}?.let{"$it ცილ."}).filterNotNull().joinToString(" ").ifBlank{"უცნობია"}
    val decoded=DecodedCar(brand,model,year,engine,data.optString("Trim").take(80),data.optString("FuelTypePrimary").take(50),brand.isBlank()||model.isBlank()||data.optString("ErrorCode")!="0")
    Handler(Looper.getMainLooper()).post{done(decoded,null)}
   }catch(_:Exception){Handler(Looper.getMainLooper()).post{done(null,"VIN ვერ ამოიცნო. სცადე ხელახლა ან შეავსე ხელით.")}}
   finally{connection?.disconnect()}
  }.start()
 }
 /** Local Latin OCR extracts only VIN. Certificate image and raw OCR text never leave the device. */
 fun scan(context:Context,uri:Uri,done:(String?,String?)->Unit){
  val recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  try{
   recognizer.process(InputImage.fromFilePath(context,uri)).addOnSuccessListener { result->
    val text=result.text.uppercase()
    val found=Regex("(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])").find(text)?.value
    done(found,if(found==null)"ფოტოზე VIN ვერ მოიძებნა. შეიყვანე კოდი ან მონაცემები ხელით." else null)
   }.addOnFailureListener{done(null,"ფოტოს ამოცნობა ვერ მოხერხდა.")}.addOnCompleteListener{recognizer.close()}
  }catch(_:Exception){recognizer.close();done(null,"ფოტოს წაკითხვა ვერ მოხერხდა.")}
 }
}
