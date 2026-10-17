package com.example

import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.knowledge.CriterionCheckStatus
import com.example.data.model.CropCycle
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.example.data.model.MandiReferenceQuote
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExampleUnitTest {

    @Test
    fun newFarmerProfile_hasHonestEmptyDefaults_andConsentFalse() {
        val defaultProfile = FarmerProfile()
        assertFalse("Consent must default to false until explicitly accepted", defaultProfile.consentGiven)
        assertEquals("District must default to empty string, not Varanasi", "", defaultProfile.districtName)
        assertEquals("Land size must default to 0.0, not 2.5", 0.0, defaultProfile.landSizeAcres, 0.001)
        assertNull(
            "Unconfigured district must return null coordinates instead of silently falling back to Varanasi",
            AgriculturalKnowledgeBase.findCoordinatesForDistrictOrNull(defaultProfile.districtName)
        )
    }

    @Test
    fun mandiNetProceedsCalculator_deductsTransportAndHandlingAccurately() {
        val quote = MandiReferenceQuote(
            id = "wheat_vns",
            cropNameHi = "गेहूँ (Wheat)",
            varietyGrade = "दारा / FAQ",
            mandiNameHi = "वाराणसी मंडी",
            stateNameHi = "उत्तर प्रदेश",
            districtNameHi = "वाराणसी",
            modalPricePerQuintalInr = 2540.0,
            minPriceInr = 2460.0,
            maxPriceInr = 2610.0,
            mspReferenceInr = 2425.0,
            mspSeasonLabelHi = "RMS 2025-26 MSP: ₹2,425/क्विंटल",
            distanceKmEstimate = 20.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क"
        )

        val result = AgriculturalKnowledgeBase.calculateMandiComparison(
            quote = quote,
            quantityQuintals = 10.0,
            transportCostInr = 400.0,
            mandiHandlingCostInr = 250.0
        )

        assertEquals(25400.0, result.grossProceedsInr, 0.01)
        assertEquals(400.0, result.transportCostInr, 0.01)
        assertEquals(250.0, result.mandiHandlingCostInr, 0.01)
        assertEquals(24750.0, result.estimatedNetProceedsInr, 0.01)
        assertEquals(2475.0, result.netPerQuintalInr, 0.01)
        assertEquals(50.0, result.vsMspDiffPerQuintalInr ?: 0.0, 0.01)
    }

    @Test
    fun farmEconomicsCalculator_computesCostBreakEvenAndPerFieldBreakdown() {
        val transactions = listOf(
            FarmTransaction(
                txType = "EXPENSE",
                fieldName = "पूर्वी खेत #1",
                cropName = "गेहूँ (Wheat)",
                amountInr = 4000.0
            ),
            FarmTransaction(
                txType = "EXPENSE",
                fieldName = "पश्चिमी खेत #2",
                cropName = "चना (Gram)",
                amountInr = 2000.0
            ),
            FarmTransaction(
                txType = "SALE",
                fieldName = "पूर्वी खेत #1",
                cropName = "गेहूँ (Wheat)",
                amountInr = 15000.0,
                quantityQuintal = 12.0
            )
        )

        val summary = AgriculturalKnowledgeBase.calculateFarmEconomics(
            transactions = transactions,
            totalAcres = 3.0,
            expectedYieldQuintals = 12.0
        )

        assertEquals(6000.0, summary.totalExpensesInr, 0.01)
        assertEquals(15000.0, summary.totalSalesInr, 0.01)
        assertEquals(9000.0, summary.netIncomeInr, 0.01)
        assertEquals(2000.0, summary.costPerAcreInr, 0.01)
        assertEquals(500.0, summary.breakEvenPricePerQuintalInr ?: 0.0, 0.01)
        assertEquals(4000.0, summary.expenseByField["पूर्वी खेत #1"] ?: 0.0, 0.01)
        assertEquals(2000.0, summary.expenseByField["पश्चिमी खेत #2"] ?: 0.0, 0.01)
    }

    @Test
    fun schemeEvaluator_checksIncomeTaxEkycLandAndStateAccurately() {
        val pmKisanRule = AgriculturalKnowledgeBase.verifiedSchemes.first { it.id == "pm_kisan" }
        val crops = listOf(CropCycle(cropName = "गेहूँ (Wheat)", areaAcres = 2.0))

        val taxPayingFarmer = FarmerProfile(
            farmerName = "अमित",
            stateName = "उत्तर प्रदेश",
            districtName = "वाराणसी",
            landSizeAcres = 2.0,
            hasAadhaarEkyc = true,
            isIncomeTaxPayer = true
        )

        val evaluatedForTaxPayer = AgriculturalKnowledgeBase.evaluateSchemeForFarmer(
            scheme = pmKisanRule,
            profile = taxPayingFarmer,
            cropCycles = crops
        )
        assertTrue(
            "Income tax payer must be marked NOT_MET on PM-KISAN exclusion criterion",
            evaluatedForTaxPayer.criteriaResults.any { it.status == CriterionCheckStatus.NOT_MET }
        )

        val eligibleSmallFarmer = FarmerProfile(
            farmerName = "रामेश्वर",
            stateName = "उत्तर प्रदेश",
            districtName = "वाराणसी",
            landSizeAcres = 2.5,
            hasAadhaarEkyc = true,
            isIncomeTaxPayer = false
        )
        val evaluatedEligible = AgriculturalKnowledgeBase.evaluateSchemeForFarmer(
            scheme = pmKisanRule,
            profile = eligibleSmallFarmer,
            cropCycles = crops
        )
        assertTrue(
            "Eligible farmer with eKYC and non-tax-payer status should have all PM-KISAN criteria LIKELY_MET",
            evaluatedEligible.criteriaResults.all { it.status == CriterionCheckStatus.LIKELY_MET }
        )
    }

    @Test
    fun cautiousCropDoctor_variesConfidenceDynamicallyByEvidenceQuality() {
        val (_, lowConfidence, _) = AgriculturalKnowledgeBase.buildCautiousCropDiagnosis(
            cropName = "गेहूँ (Wheat)",
            growthStage = "",
            symptoms = "पीला",
            spreadScope = "1-2 पौधे",
            hasPhoto = false
        )
        assertEquals("Short symptoms without photo or stage must produce LOW confidence", "LOW", lowConfidence)

        val (_, highConfidence, steps) = AgriculturalKnowledgeBase.buildCautiousCropDiagnosis(
            cropName = "गेहूँ (Wheat)",
            growthStage = "कल्ले निकलना (20-45 दिन)",
            symptoms = "निचली पत्तियों पर पीले रंग की धारियाँ दिख रही हैं और छूने पर पीला पाउडर हाथ में लग रहा है",
            spreadScope = "खेत के कुछ हिस्सों में (10-25%)",
            hasPhoto = true
        )
        assertEquals("Detailed symptoms with photo and stage must produce HIGH confidence", "HIGH", highConfidence)
        assertTrue(steps.isNotBlank())
    }
}
