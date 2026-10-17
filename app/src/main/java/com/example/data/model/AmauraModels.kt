package com.example.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp

@IgnoreExtraProperties
data class FarmerProfile(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val farmerName: String = "किसान साथी",
    val preferredLanguage: String = "hi",
    val voiceEnabled: Boolean = true,
    val stateName: String = "",
    val districtName: String = "",
    val villageName: String = "",
    val landSizeAcres: Double = 0.0,
    val irrigationType: String = "सिंचाई स्रोत चुनें",
    val soilType: String = "दोमट मिट्टी",
    val consentGiven: Boolean = false,
    val hasAadhaarEkyc: Boolean = false,
    val isIncomeTaxPayer: Boolean = false,
    val hasKccCard: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class CropCycle(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val fieldName: String = "",
    val cropName: String = "",
    val varietyName: String = "",
    val areaAcres: Double = 1.0,
    val season: String = "Rabi",
    val sowingDate: String = "",
    val growthStage: String = "",
    val irrigationMethod: String = "",
    val notes: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class CropCase(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val cropName: String = "",
    val growthStage: String = "",
    val symptoms: String = "",
    val spreadScope: String = "",
    val likelyCauses: String = "",
    val confidenceLevel: String = "MEDIUM",
    val safeNextSteps: String = "",
    val expertStatus: String = "NONE",
    val expertNotes: String = "",
    val photoBase64: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class FarmTransaction(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val txType: String = "EXPENSE",
    val category: String = "",
    val cropName: String = "",
    val fieldName: String = "",
    val title: String = "",
    val amountInr: Double = 0.0,
    val quantityQuintal: Double = 0.0,
    val txDate: String = "",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class FarmReminder(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val cropName: String = "",
    val taskTitle: String = "",
    val whySuggested: String = "",
    val dueDate: String = "",
    val status: String = "PENDING",
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

@IgnoreExtraProperties
data class AssistantMessage(
    @get:Exclude @DocumentId val id: String = "",
    val userId: String = "",
    val role: String = "USER",
    val topic: String = "GENERAL",
    val messageText: String = "",
    val sourceCitation: String = "",
    val flaggedHarmful: Boolean = false,
    @ServerTimestamp val createdAt: Timestamp? = null,
    @ServerTimestamp val updatedAt: Timestamp? = null
)

// Verified Reference Knowledge Base Models (Deterministic Rule Layer — Never AI-Hallucinated)
data class GovernmentSchemeRule(
    val id: String,
    val nameHi: String,
    val nameEn: String,
    val departmentHi: String,
    val scope: String,
    val applicableStates: List<String>,
    val benefitSummaryHi: String,
    val eligibilityCriteria: List<SchemeCriterion>,
    val requiredDocumentsHi: List<String>,
    val applicationStepsHi: List<String>,
    val deadlineHi: String,
    val officialPortalUrl: String,
    val helplineNumber: String,
    val sourceTier: String,
    val lastVerifiedDate: String,
    val exclusionsHi: String
)

data class SchemeCriterion(
    val id: String,
    val labelHi: String,
    val requiresLandOwnership: Boolean = false,
    val maxAcresLimit: Double? = null,
    val exceededLimitNoteHi: String? = null,
    val requiresCropSown: Boolean = false,
    val requiresEkyc: Boolean = false,
    val excludesIncomeTaxPayer: Boolean = false,
    val requiresIrrigationSource: Boolean = false
)

data class MandiReferenceQuote(
    val id: String,
    val cropNameHi: String,
    val varietyGrade: String,
    val mandiNameHi: String,
    val stateNameHi: String,
    val districtNameHi: String,
    val modalPricePerQuintalInr: Double,
    val minPriceInr: Double,
    val maxPriceInr: Double,
    val mspReferenceInr: Double?,
    val mspSeasonLabelHi: String,
    val distanceKmEstimate: Double,
    val observationDate: String,
    val sourceLabel: String
)

data class KnowledgeArticle(
    val id: String,
    val titleHi: String,
    val categoryHi: String,
    val cropHi: String,
    val summaryHi: String,
    val cautiousStepsHi: List<String>,
    val safetyWarningHi: String,
    val sourceOrg: String,
    val sourceTier: String,
    val lastReviewedDate: String,
    val officialUrl: String
)
