package com.partflow.nativeapp

import java.time.Year

object Domain {
    val towNext = mapOf("confirmed" to "en_route", "en_route" to "transporting")
    fun text(value: String?, max: Int): String = value.orEmpty().trim().also { require(it.isNotEmpty() && it.length <= max) { "შეამოწმე სავალდებულო ველები (მაქს. $max)" } }
    fun money(value: String): Double = value.toDoubleOrNull().let { require(it != null && it.isFinite() && it > 0 && it <= 1_000_000) { "ფასი არასწორია" }; it }
    fun year(value: String): Int = value.toIntOrNull().let { require(it != null && it in 1950..Year.now().value + 1) { "წელი არასწორია" }; it }
    fun vin(value: String) = value.trim().uppercase().also { require(it.isEmpty() || it.matches(Regex("[A-HJ-NPR-Z0-9]{17}"))) { "VIN: 17 სიმბოლო (I, O, Q აკრძალულია)" } }
    fun phone(value: String) = value.trim().also { require(it.matches(Regex("\\+9955[0-9]{8}"))) { "ნომერი: +9955XXXXXXXX" } }
    fun orderActions(status: String, dispute: String, owner: Boolean, shop: Boolean, admin: Boolean): List<String> {
        if (dispute == "open" && !admin) return emptyList()
        val next = mapOf("confirmed" to "preparing", "preparing" to "shipped", "shipped" to "delivered", "delivered" to "completed")[status]
        return buildList {
            if (next != null && (admin || if (next == "completed") owner else shop)) add(next)
            if (status in listOf("confirmed", "preparing") && (owner || shop || admin) || admin && status in listOf("shipped", "delivered")) add("cancelled")
        }
    }
}
