package com.example.data.knowledge

import com.example.data.model.CropCycle
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.example.data.model.GovernmentSchemeRule
import com.example.data.model.KnowledgeArticle
import com.example.data.model.MandiReferenceQuote
import com.example.data.model.SchemeCriterion

enum class CriterionCheckStatus(val labelHi: String) {
    LIKELY_MET("संभवतः पात्र (शर्त पूरी)"),
    NEEDS_VERIFICATION("दस्तावेज़ सत्यापन आवश्यक"),
    NOT_MET("शर्त पूरी नहीं")
}

data class EvaluatedCriterion(
    val labelHi: String,
    val status: CriterionCheckStatus,
    val explanationHi: String
)

data class SchemeEvaluationResult(
    val scheme: GovernmentSchemeRule,
    val criteriaResults: List<EvaluatedCriterion>,
    val overallSummaryHi: String,
    val officialDisclaimerHi: String
)

data class MandiComparisonOption(
    val quote: MandiReferenceQuote,
    val quantityQuintals: Double,
    val grossProceedsInr: Double,
    val transportCostInr: Double,
    val mandiHandlingCostInr: Double,
    val estimatedNetProceedsInr: Double,
    val netPerQuintalInr: Double,
    val vsMspDiffPerQuintalInr: Double?
)

data class FarmEconomicsSummary(
    val totalExpensesInr: Double,
    val totalSalesInr: Double,
    val netIncomeInr: Double,
    val totalAcres: Double,
    val costPerAcreInr: Double,
    val totalSoldQuintals: Double,
    val breakEvenPricePerQuintalInr: Double?,
    val expenseByCategory: Map<String, Double>,
    val expenseByField: Map<String, Double> = emptyMap()
)

data class DistrictCoordinates(
    val stateHi: String,
    val districtHi: String,
    val latitude: Double,
    val longitude: Double
)

object AgriculturalKnowledgeBase {

    val supportedLocations: List<DistrictCoordinates> = listOf(
        DistrictCoordinates("उत्तर प्रदेश", "वाराणसी", 25.3176, 82.9739),
        DistrictCoordinates("उत्तर प्रदेश", "लखनऊ", 26.8467, 80.9462),
        DistrictCoordinates("उत्तर प्रदेश", "मेरठ", 28.9845, 77.7064),
        DistrictCoordinates("उत्तर प्रदेश", "गोरखपुर", 26.7606, 83.3732),
        DistrictCoordinates("उत्तर प्रदेश", "आगरा", 27.1767, 78.0081),
        DistrictCoordinates("उत्तर प्रदेश", "झाँसी", 25.4484, 78.5685),
        DistrictCoordinates("उत्तर प्रदेश", "बरेली", 28.3670, 79.4304),
        DistrictCoordinates("उत्तर प्रदेश", "प्रयागराज", 25.4358, 81.8463),
        DistrictCoordinates("मध्य प्रदेश", "सीहोर", 23.2032, 77.0844),
        DistrictCoordinates("मध्य प्रदेश", "इंदौर", 22.7196, 75.8577),
        DistrictCoordinates("मध्य प्रदेश", "भोपाल", 23.2599, 77.4126),
        DistrictCoordinates("मध्य प्रदेश", "उज्जैन", 23.1765, 75.7885),
        DistrictCoordinates("हरियाणा", "करनाल", 29.6857, 76.9905),
        DistrictCoordinates("हरियाणा", "हिसार", 29.1492, 75.7217),
        DistrictCoordinates("पंजाब", "लुधियाना", 30.9010, 75.8573),
        DistrictCoordinates("पंजाब", "बठिंडा", 30.2110, 74.9455),
        DistrictCoordinates("राजस्थान", "बूंदी", 25.4385, 75.6377),
        DistrictCoordinates("राजस्थान", "जयपुर", 26.9124, 75.7873),
        DistrictCoordinates("राजस्थान", "कोटा", 25.2138, 75.8648),
        DistrictCoordinates("बिहार", "पटना", 25.5941, 85.1376),
        DistrictCoordinates("बिहार", "मुजफ्फरपुर", 26.1209, 85.3647),
        DistrictCoordinates("महाराष्ट्र", "नासिक", 19.9975, 73.7898),
        DistrictCoordinates("महाराष्ट्र", "नागपुर", 21.1458, 79.0882),
        DistrictCoordinates("गुजरात", "राजकोट", 22.3039, 70.8022)
    )

    /**
     * Finds matching coordinates for a farmer profile without silently pretending an unconfigured
     * district is Varanasi. Returns null if the district is empty or not in the offline list so the
     * caller can geocode the exact district name via Open-Meteo Geocoding API or prompt the user.
     */
    fun findCoordinatesForDistrictOrNull(districtInput: String, stateInput: String = ""): DistrictCoordinates? {
        val cleanDistrict = districtInput.trim()
        if (cleanDistrict.isEmpty()) return null
        return supportedLocations.find {
            it.districtHi.equals(cleanDistrict, ignoreCase = true) ||
                it.districtHi.contains(cleanDistrict, ignoreCase = true) ||
                cleanDistrict.contains(it.districtHi, ignoreCase = true)
        }
    }

    fun getCoordinatesForProfile(profile: FarmerProfile?): DistrictCoordinates {
        if (profile == null || profile.districtName.isBlank()) {
            return supportedLocations.first()
        }
        return findCoordinatesForDistrictOrNull(profile.districtName, profile.stateName)
            ?: supportedLocations.first()
    }

    // Tier-1 Government Schemes (Static Reference Snapshot with Multi-Condition Rules)
    val verifiedSchemes: List<GovernmentSchemeRule> = listOf(
        GovernmentSchemeRule(
            id = "pm_kisan",
            nameHi = "प्रधानमंत्री किसान सम्मान निधि (PM-KISAN)",
            nameEn = "PM-KISAN Samman Nidhi",
            departmentHi = "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
            scope = "केंद्र सरकार (सभी राज्य)",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "पात्र किसान परिवारों को ₹6,000 प्रति वर्ष (₹2,000 की तीन समान किस्तों में सीधे आधार-लिंक्ड बैंक खाते में DBT के माध्यम से)।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "land_record",
                    labelHi = "कृषि योग्य भूमि किसान के नाम पर दर्ज होनी चाहिए (AgriStack / भूलेख)",
                    requiresLandOwnership = true
                ),
                SchemeCriterion(
                    id = "ekyc",
                    labelHi = "आधार e-KYC और बैंक खाते में NPCI/DBT सीडिंग सक्रिय होनी चाहिए",
                    requiresEkyc = true
                ),
                SchemeCriterion(
                    id = "tax_exclusion",
                    labelHi = "परिवार का कोई सदस्य आयकर दाता या संवैधानिक/सरकारी पद पर न हो",
                    excludesIncomeTaxPayer = true
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड (मोबाइल नंबर से जुड़ा हुआ)",
                "खतौनी / भूमि स्वामित्व प्रमाण (Farmer Registry / खसरा-खतौनी)",
                "आधार-सीडेड बैंक पासबुक"
            ),
            applicationStepsHi = listOf(
                "1. आधिकारिक पोर्टल pmkisan.gov.in या नजदीकी जन सेवा केंद्र (CSC) पर जाएँ।",
                "2. 'New Farmer Registration' चुनें और आधार व राज्य विवरण दर्ज करें।",
                "3. भूमि विवरण (खतौनी) अपलोड करें और OTP द्वारा e-KYC पूर्ण करें।",
                "4. 'Know Your Status' सेक्शन में पंजीकरण संख्या से स्थिति जांचें।"
            ),
            deadlineHi = "वर्ष भर खुला (अगली किस्त से पहले e-KYC और भूलेख सत्यापन अनिवार्य)",
            officialPortalUrl = "https://pmkisan.gov.in",
            helplineNumber = "155261 / 011-24300606",
            sourceTier = "आधिकारिक पोर्टल संदर्भ (pmkisan.gov.in)",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26 (पोर्टल से पुष्टि करें)",
            exclusionsHi = "संस्थागत भूमिधारक, आयकर दाता, और ₹10,000/माह से अधिक पेंशनभोगी अपात्र हैं।"
        ),
        GovernmentSchemeRule(
            id = "pmfby",
            nameHi = "प्रधानमंत्री फसल बीमा योजना (PMFBY)",
            nameEn = "Pradhan Mantri Fasal Bima Yojana",
            departmentHi = "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
            scope = "केंद्र एवं राज्य सरकार",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "प्राकृतिक आपदा, सूखा, बाढ़, ओलावृष्टि, या कीट/रोग से फसल नुकसान पर बीमा सुरक्षा। किसान प्रीमियम: खरीफ 2%, रबी 1.5%, व्यावसायिक/बागवानी 5%।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "crop_sown",
                    labelHi = "अधिसूचित क्षेत्र में अधिसूचित फसल की बुवाई की गई हो",
                    requiresCropSown = true
                ),
                SchemeCriterion(
                    id = "land_or_tenant",
                    labelHi = "भूमि स्वामी और बटाईदार/किरायेदार किसान (राज्य नियमों के अनुसार) दोनों पात्र",
                    requiresLandOwnership = true
                ),
                SchemeCriterion(
                    id = "cutoff_date",
                    labelHi = "बुवाई के बाद निर्धारित अंतिम तिथि (Cut-off Date) के भीतर आवेदन"
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड और बैंक खाता पासबुक",
                "खतौनी / भू-अभिलेख या बटाईदार सहमति पत्र",
                "फसल बुवाई प्रमाण पत्र (पटवारी/लेखपाल या स्व-घोषणा)"
            ),
            applicationStepsHi = listOf(
                "1. बुवाई के तुरंत बाद pmfby.gov.in, KCC बैंक शाखा, या CSC केंद्र पर संपर्क करें।",
                "2. अपनी अधिसूचित फसल और खेत का रकबा दर्ज कर प्रीमियम जमा करें।",
                "3. फसल नुकसान होने पर 72 घंटे के भीतर क्रॉप इंश्योरेंस ऐप या हेल्पलाइन 14447 पर सूचना दें।"
            ),
            deadlineHi = "रबी सीजन: प्रायः 31 दिसंबर तक; खरीफ सीजन: प्रायः 31 जुलाई तक (राज्य अधिसूचना देखें)",
            officialPortalUrl = "https://pmfby.gov.in",
            helplineNumber = "14447",
            sourceTier = "आधिकारिक पोर्टल संदर्भ (pmfby.gov.in)",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26 (पोर्टल से पुष्टि करें)",
            exclusionsHi = "युद्ध, परमाणु जोखिम या जानबूझकर किए गए नुकसान शामिल नहीं हैं; नुकसान की सूचना 72 घंटे के भीतर देना अनिवार्य है।"
        ),
        GovernmentSchemeRule(
            id = "kcc_credit",
            nameHi = "किसान क्रेडिट कार्ड (KCC एवं ब्याज सहायता)",
            nameEn = "Kisan Credit Card (Modified Interest Subvention)",
            departmentHi = "वित्तीय सेवाएं विभाग एवं नाबार्ड (NABARD)",
            scope = "केंद्र सरकार (सभी राज्य)",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "फसल उत्पादन, खाद-बीज और पशुपालन/मत्स्य पालन हेतु सस्ता ऋण। समय पर भुगतान करने पर ₹3 लाख तक के फसल ऋण पर प्रभावी ब्याज दर मात्र 4% प्रति वर्ष।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "active_farmer",
                    labelHi = "व्यक्तिगत/संयुक्त किसान, बटाईदार या स्वयं सहायता समूह",
                    requiresLandOwnership = true
                ),
                SchemeCriterion(
                    id = "ekyc_bank",
                    labelHi = "आधार KYC और सक्रिय बैंक खाता उपलब्ध हो",
                    requiresEkyc = true
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड, पैन कार्ड एवं पासपोर्ट साइज फोटो",
                "भूमि अभिलेख (खसरा-खतौनी) और फसल विवरण",
                "बैंक शाखा का भरा हुआ KCC आवेदन प्रपत्र"
            ),
            applicationStepsHi = listOf(
                "1. अपने नजदीकी राष्ट्रीयकृत/ग्रामीण बैंक शाखा या pmkisan.gov.in से KCC फॉर्म प्राप्त करें।",
                "2. पीएम-किसान लाभार्थियों के लिए 1-पृष्ठ का सरल KCC फॉर्म उपलब्ध है।",
                "3. बैंक द्वारा भूमि रकबा और फसल लागत मानक (Scale of Finance) के आधार पर सीमा तय की जाती है।"
            ),
            deadlineHi = "पूरे वर्ष बैंक शाखाओं में आवेदन खुला",
            officialPortalUrl = "https://pmkisan.gov.in",
            helplineNumber = "1800-180-1551",
            sourceTier = "RBI / NABARD आधिकारिक संदर्भ",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26 (बैंक से पुष्टि करें)",
            exclusionsHi = "3% अतिरिक्त ब्याज छूट केवल 1 वर्ष के भीतर समय पर ऋण चुकाने वाले किसानों को मिलती है।"
        ),
        GovernmentSchemeRule(
            id = "pmksy_micro",
            nameHi = "प्रधानमंत्री कृषि सिंचाई योजना (Per Drop More Crop)",
            nameEn = "PMKSY Micro Irrigation (Drip & Sprinkler)",
            departmentHi = "कृषि एवं किसान कल्याण विभाग",
            scope = "केंद्र एवं राज्य साझा योजना",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "ड्रिप और स्प्रिंकलर सिंचाई संयंत्र लगाने पर लघु एवं सीमांत किसानों को 55% तथा अन्य किसानों को 45% सरकारी अनुदान (राज्य अतिरिक्त टॉप-अप दे सकते हैं)।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "land_water",
                    labelHi = "किसान के पास कृषि भूमि और सिंचाई जल स्रोत उपलब्ध हो",
                    requiresLandOwnership = true,
                    requiresIrrigationSource = true
                ),
                SchemeCriterion(
                    id = "small_marginal",
                    labelHi = "5 एकड़ तक के लघु एवं सीमांत किसानों को उच्च अनुदान (55%)",
                    maxAcresLimit = 5.0,
                    exceededLimitNoteHi = "आपकी भूमि 5 एकड़ से अधिक है, इसलिए लघु/सीमांत (55%) के स्थान पर सामान्य श्रेणी (45%) का अनुदान लागू हो सकता है।"
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड और बैंक खाता विवरण",
                "खतौनी / भूमि नक्शा और सिंचाई स्रोत प्रमाण",
                "पंजीकृत विक्रेता का कोटेशन एवं मृदा/जल विवरण"
            ),
            applicationStepsHi = listOf(
                "1. pmksy.gov.in या अपने राज्य के कृषि/बागवानी पोर्टल (जैसे upagriculture.com) पर पंजीकरण करें।",
                "2. अनुमोदित कंपनी का चयन करें और भौतिक सत्यापन के बाद अनुदान प्राप्त करें।"
            ),
            deadlineHi = "राज्य कृषि विभाग के वार्षिक लक्ष्य एवं टोकन जारी होने के अनुसार",
            officialPortalUrl = "https://pmksy.gov.in",
            helplineNumber = "1800-180-1551",
            sourceTier = "PMKSY आधिकारिक पोर्टल संदर्भ",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26 (पोर्टल से पुष्टि करें)",
            exclusionsHi = "एक ही भूमि पर 7 वर्षों के भीतर दोबारा समान संयंत्र पर अनुदान देय नहीं होता।"
        ),
        GovernmentSchemeRule(
            id = "up_agristack_kusum",
            nameHi = "फार्मर रजिस्ट्री एवं पीएम-कुसुम सोलर पंप (AgriStack & PM-KUSUM)",
            nameEn = "Farmer Registry & PM-KUSUM Solar Pump",
            departmentHi = "कृषि विभाग एवं नवीन और नवीकरणीय ऊर्जा मंत्रालय (MNRE)",
            scope = "केंद्र एवं राज्य कृषि विभाग",
            applicableStates = listOf("उत्तर प्रदेश", "ALL"),
            benefitSummaryHi = "AgriStack फार्मर आईडी से सरकारी योजनाओं का त्वरित लाभ, तथा पीएम-कुसुम के अंतर्गत 2 HP से 10 HP सोलर पंप पर 60% तक सरकारी अनुदान।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "up_registry",
                    labelHi = "AgriStack पोर्टल पर किसान रजिस्ट्री (Farmer ID) और भूलेख लिंक होना चाहिए",
                    requiresLandOwnership = true,
                    requiresEkyc = true
                ),
                SchemeCriterion(
                    id = "solar_water",
                    labelHi = "सोलर पंप हेतु सिंचाई/बोरिंग जल स्रोत होना चाहिए",
                    requiresIrrigationSource = true
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड एवं आधार से लिंक मोबाइल नंबर",
                "खतौनी की फर्द (गाटा संख्या सहित)",
                "किसान पंजीकरण संख्या (राज्य कृषि पोर्टल)"
            ),
            applicationStepsHi = listOf(
                "1. फार्मर आईडी हेतु upfr.agristack.gov.in या पंचायत कैंप/CSC में आधार व खतौनी लिंक कराएँ।",
                "2. सोलर पंप बुकिंग हेतु pmkusum.mnre.gov.in या राज्य कृषि पोर्टल पर टोकन जनरेट करें।"
            ),
            deadlineHi = "फार्मर रजिस्ट्री अभियान चालू; सोलर पंप बुकिंग मंडलवार तिथियों के अनुसार",
            officialPortalUrl = "https://pmkusum.mnre.gov.in",
            helplineNumber = "1800-180-3333",
            sourceTier = "MNRE / AgriStack आधिकारिक संदर्भ",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26 (पोर्टल से पुष्टि करें)",
            exclusionsHi = "बिना आधिकारिक टोकन जनरेट किए किसी निजी एजेंट या अनधिकृत वेबसाइट को भुगतान न करें।"
        ),
        GovernmentSchemeRule(
            id = "soil_health_card",
            nameHi = "मृदा स्वास्थ्य कार्ड योजना (Soil Health Card)",
            nameEn = "Soil Health Card Scheme",
            departmentHi = "कृषि एवं किसान कल्याण मंत्रालय, भारत सरकार",
            scope = "केंद्र एवं राज्य सरकार",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "खेत की मिट्टी में 12 प्रमुख पोषक तत्वों (N, P, K, pH, ऑर्गेनिक कार्बन, जिंक, सल्फर आदि) की जाँच और फसल-वार संतुलित खाद की सिफारिश।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "active_plot",
                    labelHi = "किसान के पास खेती योग्य खेत या जोत उपलब्ध हो",
                    requiresLandOwnership = true
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड और मोबाइल नंबर",
                "खेत का खसरा/गाटा संख्या और मिट्टी का नमूना"
            ),
            applicationStepsHi = listOf(
                "1. बुवाई से पहले खेत के 4-5 कोनों से 'V' आकार का 15 सेमी गहरा गड्ढा खोदकर 500 ग्राम मिट्टी का नमूना लें।",
                "2. नजदीकी मृदा परीक्षण प्रयोगशाला (Soil Testing Lab) या कृषि विज्ञान केंद्र (KVK) में जमा करें।",
                "3. soilhealth.dac.gov.in पोर्टल से अपना मृदा स्वास्थ्य कार्ड डाउनलोड करें।"
            ),
            deadlineHi = "बुवाई से 1 माह पूर्व (रबी और खरीफ से पहले)",
            officialPortalUrl = "https://soilhealth.dac.gov.in",
            helplineNumber = "1800-180-1551",
            sourceTier = "आधिकारिक पोर्टल संदर्भ (soilhealth.dac.gov.in)",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26",
            exclusionsHi = "खाद डालने के तुरंत बाद या मेड़ के ठीक पास से मिट्टी का नमूना न लें।"
        ),
        GovernmentSchemeRule(
            id = "enam_market",
            nameHi = "राष्ट्रीय कृषि बाजार (e-NAM डिजिटल मंडी)",
            nameEn = "National Agriculture Market (e-NAM)",
            departmentHi = "लघु कृषक कृषि व्यापार संघ (SFAC), कृषि मंत्रालय",
            scope = "केंद्र सरकार (सभी राज्य)",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "देश भर की 1,300+ जुड़ी हुई मंडियों में पारदर्शी ऑनलाइन बोली, उपज की गुणवत्ता जाँच (Assaying) और सीधे बैंक खाते में भुगतान।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "crop_produce",
                    labelHi = "बिक्री योग्य कृषि उपज और आधार-लिंक्ड बैंक खाता",
                    requiresCropSown = true,
                    requiresEkyc = true
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड और बैंक पासबुक (IFSC सहित)",
                "सक्रिय मोबाइल नंबर"
            ),
            applicationStepsHi = listOf(
                "1. enam.gov.in वेबसाइट, e-NAM मोबाइल ऐप या अपनी मंडी के गेट पर निःशुल्क पंजीकरण करें।",
                "2. मंडी में अपनी उपज की गुणवत्ता जाँच (Lot generation & Assaying) कराएँ।",
                "3. ऑनलाइन बोली स्वीकार करने के बाद सीधे बैंक खाते में भुगतान प्राप्त करें।"
            ),
            deadlineHi = "पूरे वर्ष चालू",
            officialPortalUrl = "https://enam.gov.in",
            helplineNumber = "1800-270-0224",
            sourceTier = "आधिकारिक पोर्टल संदर्भ (enam.gov.in)",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26",
            exclusionsHi = "उपज को साफ और सुखाकर (FAQ मानक के अनुसार) मंडी ले जाने पर बेहतर बोली मिलती है।"
        ),
        GovernmentSchemeRule(
            id = "pkvy_organic",
            nameHi = "परम्परागत कृषि विकास योजना (PKVY जैविक खेती)",
            nameEn = "Paramparagat Krishi Vikas Yojana",
            departmentHi = "कृषि एवं किसान कल्याण मंत्रालय",
            scope = "केंद्र एवं राज्य साझा योजना",
            applicableStates = listOf("ALL"),
            benefitSummaryHi = "जैविक खेती (Organic Farming) क्लस्टर में जुड़ने पर 3 वर्षों में ₹31,500 प्रति हेक्टेयर तक की सहायता (जैविक बीज, जीवामृत, वर्मीकम्पोस्ट और प्रमाणीकरण हेतु)।",
            eligibilityCriteria = listOf(
                SchemeCriterion(
                    id = "organic_land",
                    labelHi = "किसान के पास कृषि भूमि हो और क्लस्टर समूह में जुड़ने की सहमति हो",
                    requiresLandOwnership = true,
                    maxAcresLimit = 5.0,
                    exceededLimitNoteHi = "PKVY के तहत सहायता अधिकतम 2 हेक्टेयर (लगभग 5 एकड़) की सीमा तक देय होती है।"
                )
            ),
            requiredDocumentsHi = listOf(
                "आधार कार्ड और बैंक खाता पासबुक",
                "भूमि खतौनी / खसरा नकल"
            ),
            applicationStepsHi = listOf(
                "1. अपने ब्लॉक के कृषि कार्यालय या pgsindia-ncof.gov.in पोर्टल के माध्यम से 20+ किसानों के क्लस्टर में पंजीकरण करें।",
                "2. PGS-India जैविक प्रमाणीकरण मानकों का पालन करें और DBT से अनुदान प्राप्त करें।"
            ),
            deadlineHi = "राज्य कृषि विभाग के क्लस्टर चयन के अनुसार",
            officialPortalUrl = "https://pgsindia-ncof.gov.in",
            helplineNumber = "1800-180-1551",
            sourceTier = "NCOF / कृषि मंत्रालय संदर्भ",
            lastVerifiedDate = "संदर्भ संकलन: 2025-26",
            exclusionsHi = "रासायनिक कीटनाशक और सिंथेटिक उर्वरकों का प्रयोग वर्जित है।"
        )
    )

    // Deterministic Scheme Eligibility Evaluator (Multi-Condition Rule Engine)
    fun evaluateSchemeForFarmer(
        scheme: GovernmentSchemeRule,
        profile: FarmerProfile?,
        cropCycles: List<CropCycle>
    ): SchemeEvaluationResult {
        val landAcres = profile?.landSizeAcres ?: 0.0
        val hasCrops = cropCycles.isNotEmpty()
        val hasIrrigation = profile != null &&
            profile.irrigationType.isNotBlank() &&
            !profile.irrigationType.contains("सिंचाई स्रोत चुनें") &&
            !profile.irrigationType.contains("वर्षा आधारित", ignoreCase = true)

        val criteriaResults = scheme.eligibilityCriteria.map { crit ->
            when {
                crit.excludesIncomeTaxPayer && profile?.isIncomeTaxPayer == true -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NOT_MET,
                    explanationHi = "आपकी प्रोफ़ाइल में 'आयकर दाता' हाँ दर्ज है। योजना नियमों के अनुसार आयकर दाता परिवार पात्र नहीं हैं।"
                )
                crit.requiresLandOwnership && landAcres <= 0.0 -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NOT_MET,
                    explanationHi = "आपकी प्रोफ़ाइल में कृषि भूमि 0 एकड़ दर्ज है। कृपया 'मेरी खेती' में अपना भूमि रकबा अपडेट करें।"
                )
                crit.maxAcresLimit != null && landAcres > crit.maxAcresLimit -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NEEDS_VERIFICATION,
                    explanationHi = crit.exceededLimitNoteHi
                        ?: "आपकी भूमि (${landAcres} एकड़) निर्धारित सीमा (${crit.maxAcresLimit} एकड़) से अधिक है; कृपया योजना के श्रेणी नियम देखें।"
                )
                crit.requiresCropSown && !hasCrops -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NEEDS_VERIFICATION,
                    explanationHi = "'मेरी खेती' में अभी कोई सक्रिय फसल दर्ज नहीं है। आवेदन के समय बुवाई विवरण आवश्यक होगा।"
                )
                crit.requiresIrrigationSource && !hasIrrigation -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NEEDS_VERIFICATION,
                    explanationHi = "इस योजना के लिए सिंचाई जल स्रोत (बोरवेल/कुआँ/नहर) का विवरण आवश्यक है। कृपया प्रोफ़ाइल में सिंचाई स्रोत अपडेट करें।"
                )
                crit.requiresEkyc && profile?.hasAadhaarEkyc == true -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.LIKELY_MET,
                    explanationHi = "आपने प्रोफ़ाइल में आधार e-KYC और बैंक DBT सीडिंग पूर्ण बताई है।"
                )
                crit.requiresEkyc && profile?.hasAadhaarEkyc != true -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NEEDS_VERIFICATION,
                    explanationHi = "कृपया आधिकारिक पोर्टल या बैंक में अपना आधार e-KYC और NPCI DBT सीडिंग सत्यापित करें।"
                )
                crit.excludesIncomeTaxPayer && profile?.isIncomeTaxPayer == false -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.LIKELY_MET,
                    explanationHi = "प्रोफ़ाइल के अनुसार आप आयकर अपवाद श्रेणी में नहीं आते।"
                )
                crit.requiresLandOwnership && landAcres > 0.0 -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.LIKELY_MET,
                    explanationHi = "प्रोफ़ाइल के अनुसार ${landAcres} एकड़ भूमि दर्ज है (खतौनी/AgriStack सत्यापन आवश्यक)।"
                )
                crit.requiresCropSown && hasCrops -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.LIKELY_MET,
                    explanationHi = "'मेरी खेती' में सक्रिय फसल (${cropCycles.joinToString { it.cropName }}) दर्ज है।"
                )
                else -> EvaluatedCriterion(
                    labelHi = crit.labelHi,
                    status = CriterionCheckStatus.NEEDS_VERIFICATION,
                    explanationHi = "आधिकारिक पोर्टल पर विभागीय समय-सीमा और शर्तों की पुष्टि करें।"
                )
            }
        }

        val anyNotMet = criteriaResults.any { it.status == CriterionCheckStatus.NOT_MET }
        val overallSummaryHi = if (anyNotMet) {
            "प्राथमिक जाँच: कुछ शर्तें अभी पूरी नहीं दिख रही हैं। कृपया अपनी भूमि/प्रोफ़ाइल जानकारी अपडेट करें या आधिकारिक पोर्टल देखें।"
        } else {
            "प्राथमिक जाँच: आपकी प्रोफ़ाइल के आधार पर आप प्राथमिक शर्तों के अनुकूल दिखते हैं, किंतु अंतिम पात्रता केवल आधिकारिक सरकारी पोर्टल द्वारा ही तय होती है।"
        }

        return SchemeEvaluationResult(
            scheme = scheme,
            criteriaResults = criteriaResults,
            overallSummaryHi = overallSummaryHi,
            officialDisclaimerHi = "महत्वपूर्ण सूचना: अमौरा (Amaura) कोई सरकारी स्वीकृति नहीं देता और ये नियम ऑफ़लाइन संदर्भ स्नैपशॉट हैं। अंतिम पात्रता, किस्त या लाभ की पुष्टि केवल आधिकारिक सरकारी पोर्टल (${scheme.officialPortalUrl}) से ही करें।"
        )
    }

    // Offline Benchmark Mandi Reference Quotes & Official MSP Standards (Transparently labelled as Offline Reference)
    val mandiQuotes: List<MandiReferenceQuote> = listOf(
        MandiReferenceQuote(
            id = "wheat_vns",
            cropNameHi = "गेहूँ (Wheat)",
            varietyGrade = "दारा / FAQ (HD-2967)",
            mandiNameHi = "पहड़िया मंडी, वाराणसी (संदर्भ उदाहरण)",
            stateNameHi = "उत्तर प्रदेश",
            districtNameHi = "वाराणसी",
            modalPricePerQuintalInr = 2510.0,
            minPriceInr = 2425.0,
            maxPriceInr = 2580.0,
            mspReferenceInr = 2425.0,
            mspSeasonLabelHi = "रबी विपणन सीजन (RMS 2025-26) MSP: ₹2,425/क्विंटल",
            distanceKmEstimate = 14.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क (लाइव भाव हेतु agmarknet.gov.in देखें या ऊपर अपना स्थानीय भाव दर्ज करें)"
        ),
        MandiReferenceQuote(
            id = "wheat_lko",
            cropNameHi = "गेहूँ (Wheat)",
            varietyGrade = "शरबती / FAQ",
            mandiNameHi = "सीतापुर रोड मंडी, लखनऊ (संदर्भ उदाहरण)",
            stateNameHi = "उत्तर प्रदेश",
            districtNameHi = "लखनऊ",
            modalPricePerQuintalInr = 2565.0,
            minPriceInr = 2460.0,
            maxPriceInr = 2630.0,
            mspReferenceInr = 2425.0,
            mspSeasonLabelHi = "रबी विपणन सीजन (RMS 2025-26) MSP: ₹2,425/क्विंटल",
            distanceKmEstimate = 42.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क (लाइव भाव हेतु agmarknet.gov.in देखें)"
        ),
        MandiReferenceQuote(
            id = "wheat_knl",
            cropNameHi = "गेहूँ (Wheat)",
            varietyGrade = "FAQ ग्रेड-A",
            mandiNameHi = "करनाल अनाज मंडी (संदर्भ उदाहरण)",
            stateNameHi = "हरियाणा",
            districtNameHi = "करनाल",
            modalPricePerQuintalInr = 2490.0,
            minPriceInr = 2425.0,
            maxPriceInr = 2540.0,
            mspReferenceInr = 2425.0,
            mspSeasonLabelHi = "रबी विपणन सीजन (RMS 2025-26) MSP: ₹2,425/क्विंटल",
            distanceKmEstimate = 25.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क (e-NAM / AgmarkNet मानक)"
        ),
        MandiReferenceQuote(
            id = "paddy_vns",
            cropNameHi = "धान (Paddy)",
            varietyGrade = "सामान्य (Common FAQ)",
            mandiNameHi = "पहड़िया मंडी, वाराणसी (संदर्भ उदाहरण)",
            stateNameHi = "उत्तर प्रदेश",
            districtNameHi = "वाराणसी",
            modalPricePerQuintalInr = 2320.0,
            minPriceInr = 2210.0,
            maxPriceInr = 2385.0,
            mspReferenceInr = 2300.0,
            mspSeasonLabelHi = "खरीफ विपणन सीजन (KMS 2024-25/25-26) संदर्भ MSP: ₹2,300/क्विंटल",
            distanceKmEstimate = 14.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क (लाइव भाव हेतु agmarknet.gov.in देखें)"
        ),
        MandiReferenceQuote(
            id = "paddy_bundi",
            cropNameHi = "धान (Paddy)",
            varietyGrade = "बासमती / 1509",
            mandiNameHi = "कुंवारती कृषि उपज मंडी, बूंदी (संदर्भ उदाहरण)",
            stateNameHi = "राजस्थान",
            districtNameHi = "बूंदी",
            modalPricePerQuintalInr = 3150.0,
            minPriceInr = 2850.0,
            maxPriceInr = 3380.0,
            mspReferenceInr = 2300.0,
            mspSeasonLabelHi = "सामान्य धान MSP संदर्भ: ₹2,300/क्विंटल",
            distanceKmEstimate = 30.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क"
        ),
        MandiReferenceQuote(
            id = "mustard_jpr",
            cropNameHi = "सरसों (Mustard)",
            varietyGrade = "काली सरसों (42% तेल)",
            mandiNameHi = "कूकरखेड़ा मंडी, जयपुर (संदर्भ उदाहरण)",
            stateNameHi = "राजस्थान",
            districtNameHi = "जयपुर",
            modalPricePerQuintalInr = 5980.0,
            minPriceInr = 5720.0,
            maxPriceInr = 6150.0,
            mspReferenceInr = 5950.0,
            mspSeasonLabelHi = "रबी विपणन सीजन (RMS 2025-26) MSP: ₹5,950/क्विंटल",
            distanceKmEstimate = 22.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क"
        ),
        MandiReferenceQuote(
            id = "gram_sehore",
            cropNameHi = "चना (Chickpea)",
            varietyGrade = "देसी FAQ",
            mandiNameHi = "सीहोर कृषि उपज मंडी (संदर्भ उदाहरण)",
            stateNameHi = "मध्य प्रदेश",
            districtNameHi = "सीहोर",
            modalPricePerQuintalInr = 5740.0,
            minPriceInr = 5500.0,
            maxPriceInr = 5910.0,
            mspReferenceInr = 5650.0,
            mspSeasonLabelHi = "रबी विपणन सीजन (RMS 2025-26) MSP: ₹5,650/क्विंटल",
            distanceKmEstimate = 18.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क"
        ),
        MandiReferenceQuote(
            id = "potato_lko",
            cropNameHi = "आलू (Potato)",
            varietyGrade = "कुफरी ज्योति / सफेद",
            mandiNameHi = "दुबग्गा मंडी, लखनऊ (संदर्भ उदाहरण)",
            stateNameHi = "उत्तर प्रदेश",
            districtNameHi = "लखनऊ",
            modalPricePerQuintalInr = 1680.0,
            minPriceInr = 1450.0,
            maxPriceInr = 1820.0,
            mspReferenceInr = null,
            mspSeasonLabelHi = "MSP लागू नहीं (बागवानी फसल)",
            distanceKmEstimate = 28.0,
            observationDate = "ऐतिहासिक संदर्भ बेंचमार्क",
            sourceLabel = "ऑफ़लाइन संदर्भ बेंचमार्क"
        )
    )

    // Deterministic Selling Proceeds Calculator (Section 4.C & Section 7)
    fun calculateMandiComparison(
        quote: MandiReferenceQuote,
        quantityQuintals: Double,
        transportCostInr: Double,
        mandiHandlingCostInr: Double
    ): MandiComparisonOption {
        val safeQty = quantityQuintals.coerceAtLeast(0.0)
        val gross = safeQty * quote.modalPricePerQuintalInr
        val totalCost = transportCostInr.coerceAtLeast(0.0) + mandiHandlingCostInr.coerceAtLeast(0.0)
        val net = gross - totalCost
        val netPerQuintal = if (safeQty > 0.0) net / safeQty else 0.0
        val vsMsp = quote.mspReferenceInr?.let { netPerQuintal - it }
        return MandiComparisonOption(
            quote = quote,
            quantityQuintals = safeQty,
            grossProceedsInr = gross,
            transportCostInr = transportCostInr,
            mandiHandlingCostInr = mandiHandlingCostInr,
            estimatedNetProceedsInr = net,
            netPerQuintalInr = netPerQuintal,
            vsMspDiffPerQuintalInr = vsMsp
        )
    }

    // Deterministic Farm Accounts & Break-Even Calculator with Per-Field Tracking
    fun calculateFarmEconomics(
        transactions: List<FarmTransaction>,
        totalAcres: Double,
        expectedYieldQuintals: Double
    ): FarmEconomicsSummary {
        val expenses = transactions.filter { it.txType == "EXPENSE" }
        val sales = transactions.filter { it.txType == "SALE" }

        val totalExpenses = expenses.sumOf { it.amountInr }
        val totalSales = sales.sumOf { it.amountInr }
        val netIncome = totalSales - totalExpenses

        val safeAcres = if (totalAcres > 0.0) totalAcres else 1.0
        val costPerAcre = totalExpenses / safeAcres

        val soldQuintals = sales.sumOf { it.quantityQuintal }
        val divisorQuintals = when {
            soldQuintals > 0.0 -> soldQuintals
            expectedYieldQuintals > 0.0 -> expectedYieldQuintals
            else -> 0.0
        }
        val breakEvenPrice = if (divisorQuintals > 0.0) totalExpenses / divisorQuintals else null

        val byCategory = expenses.groupBy { it.category.ifBlank { "अन्य (Other)" } }
            .mapValues { (_, list) -> list.sumOf { it.amountInr } }

        val byField = expenses.groupBy { it.fieldName.ifBlank { it.cropName.ifBlank { "सामान्य खेत" } } }
            .mapValues { (_, list) -> list.sumOf { it.amountInr } }

        return FarmEconomicsSummary(
            totalExpensesInr = totalExpenses,
            totalSalesInr = totalSales,
            netIncomeInr = netIncome,
            totalAcres = safeAcres,
            costPerAcreInr = costPerAcre,
            totalSoldQuintals = soldQuintals,
            breakEvenPricePerQuintalInr = breakEvenPrice,
            expenseByCategory = byCategory,
            expenseByField = byField
        )
    }

    // Verified ICAR / KVK Crop Guidance & Cautious Diagnosis Reference Library (8 Articles)
    val cropGuidanceLibrary: List<KnowledgeArticle> = listOf(
        KnowledgeArticle(
            id = "wheat_yellowing",
            titleHi = "गेहूँ में पत्तियों का पीला पड़ना: नाइट्रोजन की कमी बनाम पीला रतुआ (Yellow Rust)",
            categoryHi = "रोग एवं पोषण पहचान",
            cropHi = "गेहूँ (Wheat)",
            summaryHi = "गेहूँ की पत्तियाँ पीली होने के 3 मुख्य कारण हो सकते हैं: (1) निचली पुरानी पत्तियों का पीला होना अक्सर नाइट्रोजन की कमी या अधिक सिंचाई से जड़ में ऑक्सीजन की कमी दर्शाता है; (2) पत्ते पर पीले रंग का पाउडर जो उंगलियों पर लगे, वह 'पीला रतुआ (Yellow Rust)' हो सकता है; (3) नई पत्तियों का बीच से सफेद/पीला होना जिंक की कमी का संकेत है।",
            cautiousStepsHi = listOf(
                "सबसे पहले प्रभावित पत्ती को उंगली से छूकर देखें — क्या पीला पाउडर हाथ में लग रहा है?",
                "निचली पत्तियाँ पीली हैं या ऊपर की नई पत्तियाँ? यह देखें कि समस्या पूरे खेत में है या केवल निचले जलभराव वाले हिस्से में।",
                "यदि खेत में पानी भरा है, तो तुरंत जल निकासी करें और बिना पुष्टि के कोई तेज़ फफूंदनाशक या कीटनाशक न मिलाएँ।",
                "पीला पाउडर दिखने पर नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर (1800-180-1551) से सम्पर्क करें।"
            ),
            safetyWarningHi = "केवल फोटो से पीला रतुआ और पोषक तत्व की कमी में 100% अंतर करना संभव नहीं है। बिना जाँच के दो रसायनों को मिलाकर छिड़काव कभी न करें।",
            sourceOrg = "ICAR - भारतीय गेहूँ एवं जौ अनुसंधान संस्थान (IIWBR) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय (ICAR IIWBR मानक पर आधारित)",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://iiwbr.icar.gov.in"
        ),
        KnowledgeArticle(
            id = "wheat_cri_irrigation",
            titleHi = "गेहूँ में पहली सिंचाई (CRI अवस्था - बुवाई के 20-22 दिन बाद)",
            categoryHi = "सिंचाई एवं फसल कैलेंडर",
            cropHi = "गेहूँ (Wheat)",
            summaryHi = "गेहूँ में मुकुट जड़ (Crown Root Initiation - CRI) अवस्था बुवाई के 20 से 22 दिन बाद आती है। इस समय सिंचाई में देरी होने से कल्ले कम निकलते हैं और पैदावार सीधे प्रभावित होती है।",
            cautiousStepsHi = listOf(
                "बुवाई के 20-22 दिन बाद हल्की सिंचाई करें ताकि खेत में जलभराव न हो।",
                "सिंचाई के 2-3 दिन बाद जब पैर न धँसे (ओट आने पर) ही यूरिया की टॉप-ड्रेसिंग करें।",
                "तेज हवा या भारी बारिश की संभावना होने पर सिंचाई 2 दिन टालें ताकि फसल गिरे नहीं।"
            ),
            safetyWarningHi = "खड़े पानी में यूरिया न डालें, इससे नाइट्रोजन का नुकसान (लीचिंग) होता है।",
            sourceOrg = "ICAR एवं कृषि विज्ञान केंद्र (KVK) मानक सस्य क्रियाएँ",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://icar.org.in"
        ),
        KnowledgeArticle(
            id = "paddy_stem_borer",
            titleHi = "धान में तना छेदक (Stem Borer) और झुलसा की पहचान",
            categoryHi = "कीट एवं रोग प्रबंधन",
            cropHi = "धान (Paddy)",
            summaryHi = "यदि धान की बीच वाली गोभ (गाभा) सूखकर आसानी से खिंच आती है ('डेड हार्ट'), तो यह तना छेदक कीट का लक्षण हो सकता है। यदि पत्तियों के किनारे ऊपर से नीचे की ओर सूख रहे हैं, तो यह जीवाणु झुलसा (BLB) हो सकता है।",
            cautiousStepsHi = listOf(
                "सूखी गोभ को धीरे से खींचकर देखें — यदि आधार सड़ा हुआ और छेद युक्त है, तो तना छेदक की संभावना है।",
                "खेत में फेरोमोन ट्रैप या प्रकाश प्रपंश लगाकर कीट की संख्या का आकलन करें।",
                "जीवाणु झुलसा दिखने पर खेत से अतिरिक्त पानी निकालें और नाइट्रोजन खाद (यूरिया) का प्रयोग अस्थायी रूप से रोकें।"
            ),
            safetyWarningHi = "प्रारंभिक अवस्था में अनावश्यक ब्रॉड-स्पेक्ट्रम कीटनाशक के छिड़काव से मित्र कीट (मकड़ी, लेडीबर्ड) नष्ट हो जाते हैं।",
            sourceOrg = "ICAR-राष्ट्रीय चावल अनुसंधान संस्थान (NRRI) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://icar-nrri.in"
        ),
        KnowledgeArticle(
            id = "mustard_aphid",
            titleHi = "सरसों में माहू (Aphid / चेपा) की निगरानी एवं सुरक्षित नियंत्रण",
            categoryHi = "कीट प्रबंधन",
            cropHi = "सरसों (Mustard)",
            summaryHi = "ठंड और बादल छाए रहने पर सरसों की फलियों और कोमल टहनियों पर छोटे हरे-पीले माहू कीट रस चूसते हैं, जिससे फलियाँ कमजोर रह जाती हैं।",
            cautiousStepsHi = listOf(
                "खेत के चारों कोनों और बीच में 10-12 पौधों की ऊपरी टहनियों का निरीक्षण करें।",
                "शुरुआती अवस्था में केवल प्रभावित टहनियों को तोड़कर नष्ट करने से फैलाव रुकता है।",
                "खेत में पीले चिपचिपे ट्रैप (Yellow Sticky Traps) लगाएँ और नीम तेल (Azadirachtin) आधारित सुरक्षित विकल्पों को प्राथमिकता दें।"
            ),
            safetyWarningHi = "मधुमक्खियों की सुरक्षा के लिए फूल खिलने की अवस्था में सुबह के समय कभी भी रसायन का छिड़काव न करें; आवश्यकता होने पर केवल शाम 4 बजे के बाद ही कृषि विशेषज्ञ की सलाह लें।",
            sourceOrg = "ICAR-DRMR (सरसों अनुसंधान निदेशालय, भरतपुर) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://www.drmr.res.in"
        ),
        KnowledgeArticle(
            id = "cotton_whitefly",
            titleHi = "कपास में सफेद मक्खी (Whitefly) और पत्ती मरोड़ समस्या",
            categoryHi = "कीट एवं विषाणु निगरानी",
            cropHi = "कपास (Cotton)",
            summaryHi = "कपास की पत्तियों के निचले हिस्से में सफेद छोटे कीट और पत्तियों पर चिपचिपा पदार्थ (हनीड्यू) सफेद मक्खी का संकेत है, जो लीफ कर्ल वायरस भी फैला सकती है।",
            cautiousStepsHi = listOf(
                "सुबह के समय पत्ती को पलटकर देखें और खेत के मेड़ों से खरपतवार (विशेषकर कांगनी/पीली बूटी) हटाएँ।",
                "अत्यधिक यूरिया के प्रयोग से बचें क्योंकि अधिक कोमल पत्तियाँ रस चूसक कीटों को आकर्षित करती हैं।",
                "सिंथेटिक पायरेथ्रॉइड के अंधाधुंध प्रयोग से सफेद मक्खी का प्रकोप बढ़ सकता है — KVK विशेषज्ञ से जाँच कराएँ।"
            ),
            safetyWarningHi = "कपास में दो कीटनाशकों का मनमाना मिश्रण (Tank Mix) फसल और किसान के स्वास्थ्य के लिए गंभीर जोखिम है।",
            sourceOrg = "ICAR-CICR (केंद्रीय कपास अनुसंधान संस्थान, नागपुर) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://cicr.org.in"
        ),
        KnowledgeArticle(
            id = "potato_late_blight",
            titleHi = "आलू में पछेती झुलसा (Late Blight) की प्रारंभिक पहचान एवं बचाव",
            categoryHi = "रोग प्रबंधन",
            cropHi = "आलू (Potato)",
            summaryHi = "कोहरे, बादल और अधिक नमी (80% से ऊपर) में आलू की निचली पत्तियों के किनारों पर भूरे-काले जले हुए धब्बे दिखते हैं और पत्ती के नीचे सफेद फफूंद की परत बनती है।",
            cautiousStepsHi = listOf(
                "कोहरे के दिनों में प्रतिदिन सुबह खेत के निचले व छायादार हिस्सों का निरीक्षण करें।",
                "झुलसा के लक्षण दिखने पर तुरंत सिंचाई रोकें और मेड़ों पर मिट्टी चढ़ाए रखें ताकि कंद खुले न रहें।",
                "रोग तेजी से फैलने पर नजदीकी KVK या उद्यान विभाग से अनुमोदित फफूंदनाशक की जानकारी लें।"
            ),
            safetyWarningHi = "बारिश या ओस से भीगी पत्तियों पर छिड़काव न करें, क्योंकि दवा पत्तियों पर टिकती नहीं है।",
            sourceOrg = "ICAR-CPRI (केंद्रीय आलू अनुसंधान संस्थान, शिमला) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://cpri.icar.gov.in"
        ),
        KnowledgeArticle(
            id = "chickpea_wilt_podborer",
            titleHi = "चना में उकठा रोग (Wilt) और फली छेदक (Pod Borer) प्रबंधन",
            categoryHi = "समेकित कीट एवं रोग प्रबंधन (IPM)",
            cropHi = "चना (Chickpea)",
            summaryHi = "उकठा रोग में पूरा पौधा सूख जाता है और जड़ को चीरकर देखने पर अंदर काली धारी दिखती है। फली बनते समय हरी इल्ली (Helicoverpa) फलियों में छेद कर दाने खा जाती है।",
            cautiousStepsHi = listOf(
                "उकठा से बचाव हेतु बुवाई से पूर्व ट्राइकोडर्मा (Trichoderma) से बीज उपचार करें और गहरी जुताई करें।",
                "फली छेदक की निगरानी के लिए खेत में फेरोमोन ट्रैप और पक्षियों के बैठने हेतु 'T' आकार की खूँटियाँ (Bird Perches) लगाएँ।",
                "फूल आने से पहले चने की ऊपरी कोंपलों की चुटाई (Nipping) करने से शाखाएँ अधिक निकलती हैं।"
            ),
            safetyWarningHi = "चना में फूल खिलते समय अनावश्यक सिंचाई करने से पौधे बढ़ जाते हैं और फलियाँ कम लगती हैं।",
            sourceOrg = "ICAR-IIPR (भारतीय दलहन अनुसंधान संस्थान, कानपुर) संदर्भ सारांश",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://iipr.icar.gov.in"
        ),
        KnowledgeArticle(
            id = "safe_spray_ppe_protocol",
            titleHi = "कृषि रक्षा रसायनों के सुरक्षित उपयोग और व्यक्तिगत सुरक्षा (PPE) नियम",
            categoryHi = "किसान स्वास्थ्य एवं सुरक्षा",
            cropHi = "सभी फसलें",
            summaryHi = "किसी भी कृषि रसायन का उपयोग केबल अंतिम विकल्प (Last Resort) के रूप में और कृषि विशेषज्ञ की लिखित सलाह के बाद ही करना चाहिए।",
            cautiousStepsHi = listOf(
                "दवा के डिब्बे पर बने रंग के तिकोन (लाल = अत्यंत विषैला, पीला = अत्यधिक विषैला, नीला = मध्यम, हरा = कम विषैला) को अवश्य देखें।",
                "छिड़काव करते समय दस्ताने, मास्क, चश्मा और पूरी बाँह के कपड़े पहनें; हवा की उल्टी दिशा में कभी छिड़काव न करें।",
                "खाली डिब्बों को तीन बार धोकर (Triple Rinse) पंचर कर दें और कभी भी घरेलू काम या अनाज रखने में उपयोग न करें।"
            ),
            safetyWarningHi = "चक्कर आने, आँखों में जलन या उल्टी होने पर तुरंत काम रोकें, साफ पानी से धोएँ और दवा के लेबल के साथ नजदीकी स्वास्थ्य केंद्र जाएँ।",
            sourceOrg = "CIBRC एवं ICAR सुरक्षा मानक",
            sourceTier = "ऐप स्थानीय संदर्भ पुस्तकालय",
            lastReviewedDate = "संदर्भ संकलन: 2025-26",
            officialUrl = "https://ppqs.gov.in"
        )
    )

    // Cautious local diagnostic matcher with dynamic confidence scoring
    fun buildCautiousCropDiagnosis(
        cropName: String,
        growthStage: String,
        symptoms: String,
        spreadScope: String,
        hasPhoto: Boolean = false
    ): Triple<String, String, String> {
        val lowerCrop = cropName.lowercase()
        val lowerSymp = symptoms.lowercase()

        val computedConfidence = when {
            symptoms.trim().length < 12 && !hasPhoto -> "LOW"
            hasPhoto && symptoms.trim().length >= 20 && growthStage.isNotBlank() -> "HIGH"
            else -> "MEDIUM"
        }

        return when {
            lowerCrop.contains("गेहूँ") || lowerCrop.contains("wheat") -> {
                val causes = "1. संभावित कारण A: नाइट्रोजन या जिंक पोषक तत्व की कमी अथवा सिंचाई के बाद जलभराव से जड़ों में तनाव।\n" +
                    "2. संभावित कारण B: यदि पत्तियों पर पीली धारियाँ और उंगली पर लगने वाला पीला पाउडर है, तो पीला रतुआ (Yellow Rust) की शुरुआती संभावना।\n" +
                    "3. क्या जानकारी अधूरी है: केवल फोटो या विवरण से रतुआ और पोषण की कमी में पक्का अंतर नहीं किया जा सकता (आत्मविश्वास स्तर: $computedConfidence)।"
                val steps = "• प्रभावित पत्ती को छूकर देखें कि पीला पाउडर हाथ पर लगता है या नहीं।\n" +
                    "• खेत में जलभराव हो तो तुरंत पानी निकालें।\n" +
                    "• बिना पुष्टि के दो रसायनों का मिश्रण (Tank Mix) कभी न करें; समस्या बढ़ने पर नीचे दिए बटन से KVK केस सारांश तैयार करें या 1800-180-1551 पर बात करें।"
                Triple(causes, computedConfidence, steps)
            }
            lowerCrop.contains("सरसों") || lowerCrop.contains("mustard") || lowerSymp.contains("माहू") -> {
                val causes = "1. संभावित कारण A: सरसों का माहू (Aphid / चेपा) रस चूसक कीट का प्रकोप (विशेषकर बादल वाले मौसम में)।\n" +
                    "2. संभावित कारण B: गंधक (Sulphur) की कमी या तना गलन (White Rust / Sclerotinia) की प्रारंभिक अवस्था।\n" +
                    "3. क्या जानकारी अधूरी है: प्रति 10 सेमी टहनी पर कीटों की संख्या (ETL स्तर) की खेत में सीधी जाँच आवश्यक है (आत्मविश्वास स्तर: $computedConfidence)।"
                val steps = "• शुरुआती अवस्था में केवल प्रभावित ऊपरी टहनियों को तोड़कर खेत से बाहर नष्ट करें।\n" +
                    "• पीले चिपचिपे ट्रैप (Yellow Sticky Traps) लगाएँ और नीम आधारित (Azadirachtin) सुरक्षित उपाय अपनाएँ।\n" +
                    "• मधुमक्खियों की सुरक्षा हेतु फूल अवस्था में सुबह रसायन का छिड़काव बिल्कुल न करें।"
                Triple(causes, computedConfidence, steps)
            }
            lowerCrop.contains("धान") || lowerCrop.contains("paddy") -> {
                val causes = "1. संभावित कारण A: तना छेदक (Stem Borer) यदि बीच की गोभ सूख रही है, या भूरा फुदका (BPH) यदि पौधे गोलाई में जल रहे हैं।\n" +
                    "2. संभावित कारण B: जीवाणु पत्ती झुलसा (Bacterial Leaf Blight) या जिंक की कमी (खैरा रोग)।\n" +
                    "3. क्या जानकारी अधूरी है: पौधे के निचले तने के पास कीट या सड़न की प्रत्यक्ष जाँच आवश्यक है (आत्मविश्वास स्तर: $computedConfidence)।"
                val steps = "• पौधे के निचले हिस्से को हटाकर देखें और खेत से अतिरिक्त खड़ा पानी कुछ दिन के लिए निकालें।\n" +
                    "• झुलसा दिखने पर यूरिया (नाइट्रोजन) की मात्रा तुरंत रोकें।\n" +
                    "• पूरे खेत में फैलाव होने पर तुरंत KVK विशेषज्ञ के लिए केस सारांश साझा करें।"
                Triple(causes, computedConfidence, steps)
            }
            lowerCrop.contains("आलू") || lowerCrop.contains("potato") -> {
                val causes = "1. संभावित कारण A: पछेती झुलसा (Late Blight) या अगेती झुलसा (Early Blight) यदि पत्तियों पर काले-भूरे धब्बे हैं।\n" +
                    "2. संभावित कारण B: पाले (Frost) का असर या विषाणु जनित पत्ती मोड़क रोग।\n" +
                    "3. क्या जानकारी अधूरी है: पत्ती की निचली सतह पर सफेद फफूंद की उपस्थिति की जाँच आवश्यक है (आत्मविश्वास स्तर: $computedConfidence)।"
                val steps = "• सुबह के समय पत्ती के निचले हिस्से को देखें; झुलसा दिखने पर सिंचाई नियंत्रित करें।\n" +
                    "• कंदों को ढकने के लिए मेड़ों पर मिट्टी चढ़ाएँ।\n" +
                    "• बिना कृषि विशेषज्ञ की सलाह के रसायनों का मिश्रण न करें।"
                Triple(causes, computedConfidence, steps)
            }
            else -> {
                val causes = "1. संभावित कारण A: मौसम के उतार-चढ़ाव, नमी असंतुलन या सूक्ष्म पोषक तत्वों की कमी।\n" +
                    "2. संभावित कारण B: प्रारंभिक फफूंद/जीवाणु संक्रमण या रस चूसक कीट का असर।\n" +
                    "3. क्या जानकारी अधूरी है: पत्ती के निचले हिस्से, जड़ की स्थिति और खेत के इतिहास की सीधी जाँच आवश्यक है (आत्मविश्वास स्तर: $computedConfidence)।"
                val steps = "• खेत के 4-5 अलग-अलग स्थानों पर पौधों के पत्ते के दोनों तरफ और जड़ का निरीक्षण करें।\n" +
                    "• बिना सटीक पहचान के कोई तेज़ रासायनिक कीटनाशक न डालें।\n" +
                    "• नीचे 'KVK विशेषज्ञ के लिए केस सारांश तैयार करें' दबाएँ या किसान कॉल सेंटर 1800-180-1551 पर संपर्क करें।"
                Triple(causes, computedConfidence, steps)
            }
        }
    }
}
