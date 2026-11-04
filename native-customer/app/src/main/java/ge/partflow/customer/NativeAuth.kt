package ge.partflow.customer

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.UserProfileChangeRequest

/** Native Firebase client; never store service-account credentials in an APK. */
object NativeAuth {
 fun initialize(context:Context):FirebaseAuth {
  if(FirebaseApp.getApps(context).isEmpty()) {
   val options=FirebaseOptions.Builder()
    .setApplicationId("1:429553713786:android:d48cc58d5f40b8a64db1c3")
    .setApiKey("AIzaSyA5MJFbCbj2IwKDEt23m_FmXYTDnGTQ2u8")
    .setProjectId("menio-8de8f").build()
   FirebaseApp.initializeApp(context,options)
  }
  return FirebaseAuth.getInstance()
 }
 fun ensureMember(){
  val user=FirebaseAuth.getInstance().currentUser?:return
  val ref=com.google.firebase.firestore.FirebaseFirestore.getInstance().collection("pf_members").document(user.uid)
  com.google.firebase.firestore.FirebaseFirestore.getInstance().runTransaction{tx->
   val old=tx.get(ref)
   if(!old.exists())tx.set(ref,mapOf("name" to user.displayName.orEmpty().ifBlank{"მომხმარებელი"},"role" to "customer","createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()))
   null
  }
 }
 fun signIn(email:String,password:String,done:(String?)->Unit) {
  FirebaseAuth.getInstance().signInWithEmailAndPassword(email.trim(),password)
   .addOnCompleteListener { done(if(it.isSuccessful)null else error(it.exception)) }
 }
 fun register(name:String,email:String,password:String,done:(String?)->Unit) {
  FirebaseAuth.getInstance().createUserWithEmailAndPassword(email.trim(),password)
   .addOnCompleteListener { task ->
    if(!task.isSuccessful){done(error(task.exception));return@addOnCompleteListener}
    val update=UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build()
    task.result.user?.updateProfile(update)?.addOnCompleteListener { done(if(it.isSuccessful)null else error(it.exception)) }
     ?:done("ანგარიშის პროფილი ვერ განახლდა.")
   }
 }
 fun reset(email:String,done:(String?)->Unit) {
  FirebaseAuth.getInstance().sendPasswordResetEmail(email.trim())
   .addOnCompleteListener { done(if(it.isSuccessful)null else error(it.exception)) }
 }
 fun signOut()=FirebaseAuth.getInstance().signOut()
 private fun error(e:Exception?):String=when((e as? FirebaseAuthException)?.errorCode){
  "ERROR_INVALID_CREDENTIAL","ERROR_WRONG_PASSWORD","ERROR_USER_NOT_FOUND"->"ელფოსტა ან პაროლი არასწორია."
  "ERROR_EMAIL_ALREADY_IN_USE"->"ეს ელფოსტა უკვე რეგისტრირებულია."
  "ERROR_TOO_MANY_REQUESTS"->"ძალიან ბევრი მცდელობაა. სცადე მოგვიანებით."
  else->"მოქმედება ვერ შესრულდა. შეამოწმე ინტერნეტი."
 }
}
