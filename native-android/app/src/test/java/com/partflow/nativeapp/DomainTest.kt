package com.partflow.nativeapp

import org.junit.Assert.*
import org.junit.Test

class DomainTest {
    @Test fun vinRejectsInvalidCharacters() {
        assertEquals("1HGCM82633A004352",Domain.vin(" 1hgcm82633a004352 "))
        listOf("IHGCM82633A004352","123","QHGCM82633A004352").forEach { assertTrue(runCatching{Domain.vin(it)}.isFailure) }
    }
    @Test fun priceRejectsNonFiniteAndOutsideBounds() {
        listOf("NaN","Infinity","-1","0","1000001","abc").forEach { assertTrue(it,runCatching{Domain.money(it)}.isFailure) }
        assertEquals(12.5,Domain.money("12.5"),0.0)
    }
    @Test fun customerCannotAdvanceShopFulfillment() {
        assertEquals(listOf("cancelled"),Domain.orderActions("confirmed","none",true,false,false))
        assertEquals(listOf("preparing","cancelled"),Domain.orderActions("confirmed","none",false,true,false))
        assertEquals(listOf("completed"),Domain.orderActions("delivered","none",true,false,false))
        assertEquals(emptyList<String>(),Domain.orderActions("delivered","none",false,true,false))
    }
    @Test fun disputesFreezeParticipantTransitions() {
        assertTrue(Domain.orderActions("preparing","open",true,true,false).isEmpty())
        assertEquals(listOf("shipped","cancelled"),Domain.orderActions("preparing","open",false,false,true))
    }
    @Test fun invalidPhoneAndYearAreRejected() {
        assertTrue(runCatching{Domain.phone("555123456")}.isFailure)
        assertEquals("+995555123456",Domain.phone("+995555123456"))
        assertTrue(runCatching{Domain.year("1949")}.isFailure)
    }
    @Test fun mapProjectionPreservesEquatorAndClampsPoles() {
        assertEquals(16.0,MapProjection.x(0.0,5),0.00001)
        assertEquals(16.0,MapProjection.y(0.0,5),0.00001)
        assertTrue(MapProjection.y(90.0,5).isFinite())
        assertTrue(MapProjection.y(-90.0,5).isFinite())
    }
}
