package ge.partflow.customer

import android.graphics.Bitmap
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import java.io.File

class CustomerUiTest {
 @get:Rule val compose=createComposeRule()
 @Before fun init(){NativeAuth.initialize(InstrumentationRegistry.getInstrumentation().targetContext)}
 private fun screenshot(name:String){
  val directory=File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null),"evidence").apply{mkdirs()}
  File(directory,"$name.png").outputStream().use{compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG,100,it)}
 }
 @Test fun garageUsesSearchableBrandedCatalog(){
  compose.setContent{MaterialTheme{GarageCreate({})}}
  compose.onNodeWithText("✎  ხელით დამატება").performClick()
  compose.onAllNodesWithText("აირჩიე")[0].performClick()
  compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextInput("Renault")
  compose.onNode(hasText("Renault") and !hasSetTextAction()).performClick()
  compose.onNodeWithText("Renault").assertIsDisplayed()
  screenshot("garage-manual")
  compose.onNodeWithText("აირჩიე").performClick()
  compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextInput("Duster")
  compose.onNode(hasText("Duster") and !hasSetTextAction()).performClick()
  compose.onNodeWithText("Duster").assertIsDisplayed()
 }
 @Test fun requestPrefillsGarageVehicle(){
  compose.setContent{MaterialTheme{RequestCreate({},GarageVehicle("test","Toyota","Prius",2018,"1.8 ჰიბრიდი","","ჰიბრიდი"))}}
  compose.onNodeWithText("Toyota").assertIsDisplayed()
  compose.onNodeWithText("Prius").assertIsDisplayed()
  compose.onNodeWithText("2018").assertIsDisplayed()
  screenshot("request-prefill")
 }
 @Test fun towingUsesCustomDateAndCityChoices(){
  compose.setContent{MaterialTheme{TowForm({})}}
  compose.onNodeWithText("ქალაქთაშორისი").performClick()
  compose.onAllNodesWithText("ბათუმი")[0].performClick()
  compose.onNode(hasSetTextAction() and hasAnyAncestor(isDialog())).performTextInput("თბილისი")
  compose.onNode(hasText("თბილისი") and !hasSetTextAction()).performClick()
  compose.onNodeWithText("თბილისი").assertIsDisplayed()
  screenshot("towing")
 }
}
