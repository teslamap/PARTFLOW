package com.partflow.nativeapp

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

suspend fun Repository.googleSignIn(context:Context) {
    val option=GetGoogleIdOption.Builder()
        .setServerClientId("429553713786-v323oe8bfu7m313frqsab3rsbmbjh8dr.apps.googleusercontent.com")
        .setFilterByAuthorizedAccounts(false).setAutoSelectEnabled(false).build()
    val result=CredentialManager.create(context).getCredential(context,GetCredentialRequest.Builder().addCredentialOption(option).build())
    val credential=result.credential
    require(credential is CustomCredential && credential.type==GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL){"Google ანგარიშით შესვლა ვერ დასრულდა"}
    val token=GoogleIdTokenCredential.createFrom(credential.data).idToken
    auth.signInWithCredential(GoogleAuthProvider.getCredential(token,null)).await()
}
