package com.partflow.nativeapp

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.firebase.firestore.Source
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import androidx.lifecycle.compose.collectAsStateWithLifecycle

suspend fun Repository.control(v: Map<String,String>, expected: Long, defaults: JSONObject) {
    require(admin)
    val flags=defaults.getJSONObject("flags").keys().asSequence().associateWith{v.getValue(it)}
    require(flags.values.all{it in listOf("OFF","TEST","LIMITED","ON")} && flags["webAuthRequired"]=="ON")
    for((key,needs) in mapOf("phoneRecovery" to listOf("smsOtp"),"loyaltyPoints" to listOf("referrals"),"vouchers" to listOf("loyaltyPoints","partnerPromotions")))if(flags[key]=="ON")require(needs.all{flags[it]=="ON"}) {"ჩართე ფუნქციის წინაპირობები"}
    val message=Domain.text(v["message"],240)
    val r=ref("settings","control")
    db.runTransaction { tx ->
        val current=tx.get(r);val revision=current.getLong("revision")?:0
        require(revision==expected){"კონფიგურაცია შეიცვალა; განაახლე"}
        val previous=(current.get("flags") as? Map<*,*>)?.mapKeys{it.key.toString()}?:defaults.getJSONObject("flags").let{o->o.keys().asSequence().associateWith{o.getString(it)}}
        val before=mapOf("flags" to previous,"message" to (current.getString("message")?:defaults.getString("message")))
        val after=mapOf("flags" to flags,"message" to message)
        tx.set(r,mapOf("schemaVersion" to 1,"flags" to flags,"message" to message,"revision" to revision+1,"updatedBy" to uid,"updatedAt" to now()))
        tx.set(ref("control_audit",(revision+1).toString()),mapOf("action" to "update","revision" to revision+1,"actorId" to uid,"before" to before,"after" to after,"createdAt" to now()))
    }.await()
}
@Composable fun Settings(vm: AppModel,edit: Edit) {
    val context=LocalContext.current
    val defaults=remember { JSONObject(context.assets.open("control.json").bufferedReader().use{it.readText()}) }
    val busy by vm.busy.collectAsStateWithLifecycle()
    Column(Modifier.padding(vertical=12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Button(enabled=!busy,onClick={vm.run({
            val current=vm.repo.ref("settings","control").get(Source.SERVER).await()
            val flags=defaults.getJSONObject("flags");val labels=defaults.getJSONObject("labels")
            val keys=flags.keys().asSequence().toList()
            val initial=keys.associateWith{(current.get("flags") as? Map<*,*>)?.get(it)?.toString()?:flags.getString(it)}+mapOf("message" to (current.getString("message")?:defaults.getString("message")))
            val fields=keys.map{Field(it,labels.optString(it,it),listOf("OFF","TEST","LIMITED","ON"))}+Field("message","ტექნიკური შეტყობინება")
            edit("ფუნქციების მართვა","control:${current.getLong("revision")?:0}",fields,initial){vm.repo.control(it,current.getLong("revision")?:0,defaults)}
        })}){Text("ფუნქციების მართვა")}
        OutlinedButton(enabled=!busy,onClick={edit("ფოტოების შენახვის პოლიტიკა","retention",listOf("requestDays","chatDays","garageDays","logoDays").map{Field(it,mapOf("requestDays" to "მოთხოვნის ფოტოები","chatDays" to "ჩატის ფოტოები","garageDays" to "გარაჟის ფოტოები","logoDays" to "ლოგოები").getValue(it)+" · დღეები")},mapOf("requestDays" to "90","chatDays" to "30","garageDays" to "365","logoDays" to "365")){v->
            val data=listOf("requestDays","chatDays","garageDays","logoDays").associateWith{v.getValue(it).toInt().also{n->require(n in 1..3650)}}
            vm.repo.ref("settings","infrastructure").set(data+mapOf("updatedBy" to vm.repo.uid,"updatedAt" to vm.repo.now())).await()
        }}){Text("შენახვის პოლიტიკა")}
        Text("გარე SMS/AI/Push სერვისი მხოლოდ პარამეტრის ჩართვით არ აქტიურდება.",style=MaterialTheme.typography.bodySmall)
    }
}
