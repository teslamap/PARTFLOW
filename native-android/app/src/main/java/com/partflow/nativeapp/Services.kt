package com.partflow.nativeapp

import com.google.firebase.Timestamp
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneOffset

val weekdays=listOf("ორშაბათი","სამშაბათი","ოთხშაბათი","ხუთშაბათი","პარასკევი","შაბათი","კვირა")
fun weekFields()=weekdays.mapIndexed{i,name->Field("day$i","$name: 09:00-18:00 ან closed")}
fun weekDefaults()=(0..6).associate{"day$it" to if(it<5)"09:00-18:00" else "closed"}
fun week(v: Map<String,String>)=(0..6).map { i ->
    val value=v.getValue("day$i").trim()
    if(value=="closed")mapOf("open" to false,"start" to 0,"end" to 0)
    else {
        require(value.matches(Regex("[0-2][0-9]:[0-5][0-9]-[0-2][0-9]:[0-5][0-9]"))) { "საათის ფორმატი: 09:00-18:00" }
        val p=value.split('-',':').map{it.toInt()};require(p[0]<=23 && p[2]<=23)
        val start=p[0]*60+p[1];val end=p[2]*60+p[3];require(end>start)
        mapOf("open" to true,"start" to start,"end" to end)
    }
}
suspend fun Repository.serviceRecord(businessId: String,kind: String,v: Map<String,String>,id: String?=null) {
    val value: Map<String,Any?> = when(kind) {
        "hours" -> mapOf("timezone" to "Asia/Tbilisi","days" to week(v))
        "staff" -> mapOf("name" to Domain.text(v["name"],100),"specialty" to v["specialty"].orEmpty().take(200),"serviceIds" to listOf(v.getValue("serviceId")),"days" to week(v),"active" to true)
        "catalog" -> {
            val duration=v.getValue("duration").toInt();require(duration in 15..480&&duration%15==0)
            mapOf("name" to Domain.text(v["name"],100),"description" to v["description"].orEmpty().take(1000),"durationMinutes" to duration,"active" to true)
        }
        "closures" -> {
            val date=LocalDate.parse(v.getValue("date"));require(date.year in 2020..2100)
            mapOf("date" to date.toString(),"day" to Timestamp(java.util.Date.from(date.atStartOfDay().toInstant(ZoneOffset.UTC))),"staffId" to v["staffId"].orEmpty(),"active" to true)
        }
        else -> error("უცნობი ტიპი")
    }
    val recordId=id?:when(kind){"hours"->"weekly";"closures"->"${v.getValue("date")}_${v["staffId"].orEmpty().let{if(it.isEmpty())"all" else "staff_$it"}}";else->v.getValue("_id")}
    val ref=ref("shops",businessId).collection(kind).document(recordId)
    db.runTransaction { tx -> val old=tx.get(ref);tx.set(ref,value+mapOf("createdAt" to (old.getTimestamp("createdAt")?:now()),"updatedAt" to now())) }.await()
}
