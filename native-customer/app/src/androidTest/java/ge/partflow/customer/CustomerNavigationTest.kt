package ge.partflow.customer

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import java.io.File

class CustomerNavigationTest {
 @get:Rule val compose=createAndroidComposeRule<MainActivity>()
 private fun screenshot(name:String){
  val dir=File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null),"evidence").apply{mkdirs()}
  File(dir,"$name.png").outputStream().use{compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG,100,it)}
 }
 @Test fun loginAndEveryCustomerDestinationOpen(){
  compose.onNodeWithText("იპოვე ნაწილი,").assertIsDisplayed()
  screenshot("login")
  compose.onNodeWithText("ჯერ დაათვალიერე აპი →").performScrollTo().performClick()
  compose.onNodeWithText("იპოვე საჭირო ნაწილი").assertIsDisplayed()
  screenshot("home")
  val pages=listOf("მოთხოვნები","შეთავაზებები","გარაჟი","SOS / დაგეგმილი","მაღაზიების რუკა","ჩატი","არქივი","პროფილი")
  pages.forEachIndexed{i,page->
   compose.onNodeWithText("☰").performClick()
   compose.onNodeWithText(page).performScrollTo().performClick()
   compose.onAllNodesWithText(page)[0].assertIsDisplayed()
   screenshot("navigation-$i")
  }
 }
}
