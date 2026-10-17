package com.example.data.repository

import com.example.base.FirestoreEmulatorTestBase
import com.example.data.model.AssistantMessage
import com.example.data.model.CropCase
import com.example.data.model.CropCycle
import com.example.data.model.FarmReminder
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.google.firebase.firestore.FirebaseFirestoreException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AmauraRepositoryRuleTest : FirestoreEmulatorTestBase() {

    @Test
    fun saveAndGetFarmerProfile_authenticatedOwner_succeeds() = runBlocking {
        val uid = signInTestUser(ALICE_EMAIL)
        val repository = AmauraRepository(firestore, auth)

        val profile = FarmerProfile(
            userId = uid,
            farmerName = "रामेश्वर सिंह",
            preferredLanguage = "hi",
            voiceEnabled = true,
            stateName = "उत्तर प्रदेश",
            districtName = "वाराणसी",
            villageName = "रामपुर",
            landSizeAcres = 3.5,
            irrigationType = "नहर और ट्यूबवेल",
            soilType = "दोमट मिट्टी",
            consentGiven = true,
            hasAadhaarEkyc = true,
            isIncomeTaxPayer = false,
            hasKccCard = true
        )

        val saveResult = withTimeout(DEFAULT_TIMEOUT_MS) { repository.saveFarmerProfile(profile) }
        assertTrue("Profile save should succeed: ${saveResult.exceptionOrNull()}", saveResult.isSuccess)

        val loaded = withTimeout(DEFAULT_TIMEOUT_MS) { repository.getFarmerProfile(uid).getOrThrow() }
        assertNotNull(loaded)
        assertEquals("रामेश्वर सिंह", loaded?.farmerName)
        assertTrue(loaded?.hasAadhaarEkyc == true)
    }

    @Test
    fun addAndObserveCropCycles_authenticatedOwner_emitsRealtimeUpdates() = runBlocking {
        val uid = signInTestUser(ALICE_EMAIL)
        val repository = AmauraRepository(firestore, auth)

        val cycle = CropCycle(
            userId = uid,
            fieldName = "पूर्वी खेत",
            cropName = "गेहूँ (Wheat)",
            varietyName = "HD-2967",
            areaAcres = 2.0,
            season = "Rabi",
            sowingDate = "2026-10-02",
            growthStage = "कल्ले निकलना",
            irrigationMethod = "ट्यूबवेल",
            notes = "स्वस्थ फसल"
        )

        val cycleId = withTimeout(DEFAULT_TIMEOUT_MS) { repository.addCropCycle(cycle).getOrThrow() }
        assertTrue(cycleId.isNotEmpty())

        val emitted = withTimeout(FLOW_TIMEOUT_MS) {
            repository.observeCropCycles(uid).first { list -> list.any { it.id == cycleId } }
        }
        assertTrue(emitted.any { it.id == cycleId })
    }

    @Test
    fun addAndObserveTransactionsRemindersAndCasesWithPhoto_authenticatedOwner_succeeds() = runBlocking {
        val uid = signInTestUser(ALICE_EMAIL)
        val repository = AmauraRepository(firestore, auth)

        val txId = withTimeout(DEFAULT_TIMEOUT_MS) {
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = uid,
                    txType = "EXPENSE",
                    fieldName = "पूर्वी खेत #1",
                    category = "बीज (Seed)",
                    cropName = "गेहूँ (Wheat)",
                    title = "HD-2967 बीज",
                    amountInr = 2800.0,
                    quantityQuintal = 1.0,
                    txDate = "2026-10-10"
                )
            ).getOrThrow()
        }
        assertTrue(txId.isNotEmpty())

        val remId = withTimeout(DEFAULT_TIMEOUT_MS) {
            repository.addReminder(
                FarmReminder(
                    userId = uid,
                    cropName = "गेहूँ (Wheat)",
                    taskTitle = "पहली सिंचाई (21 दिन)",
                    whySuggested = "CRI अवस्था पर जड़ विकास हेतु आवश्यक",
                    dueDate = "2026-10-23",
                    status = "PENDING"
                )
            ).getOrThrow()
        }
        assertTrue(remId.isNotEmpty())

        val caseId = withTimeout(DEFAULT_TIMEOUT_MS) {
            repository.addCropCase(
                CropCase(
                    userId = uid,
                    cropName = "गेहूँ (Wheat)",
                    growthStage = "कल्ले निकलना",
                    symptoms = "निचली पत्तियों का पीला पड़ना",
                    spreadScope = "कुछ हिस्सों में",
                    likelyCauses = "नाइट्रोजन की कमी या अधिक नमी",
                    confidenceLevel = "HIGH",
                    safeNextSteps = "खेत में जल निकासी देखें और पत्ते के दोनों तरफ जाँच करें",
                    expertStatus = "NONE",
                    expertNotes = "",
                    photoBase64 = "dGVzdF9waG90b19iYXNlNjQ="
                )
            ).getOrThrow()
        }
        assertTrue(caseId.isNotEmpty())
    }

    @Test
    fun deleteFarmerProfile_removesProfileAndAllFiveSubcollections() = runBlocking {
        val uid = signInTestUser(ALICE_EMAIL)
        val repository = AmauraRepository(firestore, auth)

        withTimeout(DEFAULT_TIMEOUT_MS) {
            repository.saveFarmerProfile(FarmerProfile(userId = uid, farmerName = "रामेश्वर", consentGiven = true)).getOrThrow()
            repository.addCropCycle(CropCycle(userId = uid, fieldName = "खेत 1", cropName = "गेहूँ")).getOrThrow()
            repository.addFarmTransaction(FarmTransaction(userId = uid, txType = "EXPENSE", title = "खाद", amountInr = 500.0)).getOrThrow()
            repository.addReminder(FarmReminder(userId = uid, cropName = "गेहूँ", taskTitle = "सिंचाई", dueDate = "2026-10-20")).getOrThrow()
            repository.addCropCase(CropCase(userId = uid, cropName = "गेहूँ", symptoms = "पीलापन")).getOrThrow()
            repository.addMessage(AssistantMessage(userId = uid, role = "USER", messageText = "सवाल")).getOrThrow()
            Unit
        }

        val deleteResult = withTimeout(DEFAULT_TIMEOUT_MS) { repository.deleteFarmerProfile() }
        assertTrue("Full account data deletion should succeed: ${deleteResult.exceptionOrNull()}", deleteResult.isSuccess)

        val deletedProfile = withTimeout(DEFAULT_TIMEOUT_MS) { repository.getFarmerProfile(uid).getOrThrow() }
        assertNull("Profile document must be deleted", deletedProfile)
    }

    @Test
    fun getFarmerProfile_crossUserAccess_failsWithPermissionDenied() = runBlocking {
        signInTestUser(BOB_EMAIL)
        delay(100)
        val bobRepo = AmauraRepository(firestore, auth)
        val crossResult = withTimeout(DEFAULT_TIMEOUT_MS) {
            bobRepo.getFarmerProfile("other_farmer_uid_999")
        }
        assertTrue(crossResult.isFailure)
        val ex = crossResult.exceptionOrNull() as? FirebaseFirestoreException
        assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, ex?.code)
    }

    @Test
    fun unauthenticatedUser_accessFailsWithPermissionDenied() = runBlocking {
        auth.signOut()
        delay(100)
        val repository = AmauraRepository(firestore, auth)

        val unauthResult = withTimeout(DEFAULT_TIMEOUT_MS) {
            repository.getFarmerProfile("unauthenticated_test_uid_777")
        }
        assertTrue(unauthResult.isFailure)
        val firestoreEx = unauthResult.exceptionOrNull() as? FirebaseFirestoreException
        assertEquals(FirebaseFirestoreException.Code.PERMISSION_DENIED, firestoreEx?.code)
    }

    private companion object {
        const val ALICE_EMAIL = "alice.farmer@test.com"
        const val BOB_EMAIL = "bob.farmer@test.com"
        const val DEFAULT_TIMEOUT_MS = 5000L
        const val FLOW_TIMEOUT_MS = 3000L
    }
}
