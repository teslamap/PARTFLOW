package com.partflow.nativeapp

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class NativeScreenTest {
    @get:Rule val screen=createAndroidComposeRule<MainActivity>()
    @Test fun opensNativeSignInWithoutBrowser() {
        screen.onNodeWithText("შედი PARTFLOW-ში").assertIsDisplayed()
        screen.onNodeWithText("შესვლა").assertIsDisplayed()
        screen.onNodeWithText("პაროლის აღდგენა").assertIsDisplayed()
    }
}
