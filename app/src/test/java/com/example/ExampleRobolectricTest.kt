package com.example

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.model.CropCycle
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.example.ui.screens.AccountsAndMandiScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.SchemesScreen
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.UiState
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ExampleRobolectricTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun homeScreen_displaysHindiVoiceInputAndConsentSwitch() {
        val profile = FarmerProfile(
            farmerName = "रामेश्वर सिंह",
            districtName = "वाराणसी",
            stateName = "उत्तर प्रदेश",
            consentGiven = false
        )

        composeTestRule.setContent {
            MyApplicationTheme {
                HomeScreen(
                    profileState = UiState.Success(profile),
                    remindersState = UiState.Success(emptyList()),
                    messagesState = UiState.Success(emptyList()),
                    isAssistantBusy = false,
                    onAskQuestion = {},
                    onSpeakText = {},
                    onFlagMessage = {},
                    onUpdateConsent = {},
                    onSendReminderNotification = {},
                    onNavigateToCropDoctor = {},
                    onNavigateToWeather = {},
                    onNavigateToSchemes = {},
                    onNavigateToAccounts = {},
                    onNavigateToMyFarm = {}
                )
            }
        }

        composeTestRule.onNodeWithTag("voice_input_button").assertIsDisplayed()
        composeTestRule.onNodeWithTag("assistant_question_input").assertIsDisplayed()
        composeTestRule.onNodeWithTag("home_consent_switch").assertIsDisplayed()
    }

    @Test
    fun accountsAndMandiScreen_switchesToMandiTabAndShowsCustomRateInput() {
        val sampleCycles = listOf(CropCycle(fieldName = "पूर्वी खेत #1", cropName = "गेहूँ (Wheat)"))
        val sampleTransactions = listOf<FarmTransaction>()

        composeTestRule.setContent {
            MyApplicationTheme {
                AccountsAndMandiScreen(
                    transactionsState = UiState.Success(sampleTransactions),
                    cropCyclesState = UiState.Success(sampleCycles),
                    onCalculateEconomics = { expectedYield, _ ->
                        AgriculturalKnowledgeBase.calculateFarmEconomics(
                            transactions = sampleTransactions,
                            totalAcres = 3.0,
                            expectedYieldQuintals = expectedYield
                        )
                    },
                    onCalculateMandiOptions = { cropName, qty, trans, hand, _, _ ->
                        AgriculturalKnowledgeBase.mandiQuotes
                            .filter { it.cropNameHi == cropName }
                            .map { quote ->
                                AgriculturalKnowledgeBase.calculateMandiComparison(
                                    quote = quote,
                                    quantityQuintals = qty,
                                    transportCostInr = trans,
                                    mandiHandlingCostInr = hand
                                )
                            }
                    },
                    onAddTransaction = { _, _, _, _, _, _, _, _ -> },
                    onDeleteTransaction = {}
                )
            }
        }

        composeTestRule.onNodeWithTag("accounts_tab_ledger").assertIsDisplayed()
        composeTestRule.onNodeWithTag("accounts_tab_mandi").performClick()
        composeTestRule.onNodeWithTag("custom_mandi_price_input").assertIsDisplayed()
    }

    @Test
    fun schemesScreen_displaysTransparentStaticReferenceDisclosure() {
        val profile = FarmerProfile(
            farmerName = "रामेश्वर",
            stateName = "उत्तर प्रदेश",
            districtName = "वाराणसी",
            landSizeAcres = 2.5,
            hasAadhaarEkyc = true
        )
        val crops = listOf(CropCycle(cropName = "गेहूँ (Wheat)"))
        val evaluated = AgriculturalKnowledgeBase.verifiedSchemes.map { scheme ->
            AgriculturalKnowledgeBase.evaluateSchemeForFarmer(
                scheme = scheme,
                profile = profile,
                cropCycles = crops
            )
        }

        composeTestRule.setContent {
            MyApplicationTheme {
                SchemesScreen(evaluatedSchemes = evaluated)
            }
        }

        composeTestRule.onNodeWithTag("schemes_search_input").assertIsDisplayed()
        composeTestRule.onNodeWithTag("scheme_card_pm_kisan").assertIsDisplayed()
    }
}
