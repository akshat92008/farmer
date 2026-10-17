package com.example.ui.viewmodel

import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.knowledge.FarmEconomicsSummary
import com.example.data.knowledge.MandiComparisonOption
import com.example.data.knowledge.SchemeEvaluationResult
import com.example.data.model.AssistantMessage
import com.example.data.model.CropCase
import com.example.data.model.CropCycle
import com.example.data.model.FarmReminder
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.example.data.model.MandiReferenceQuote
import com.example.data.remote.FarmWeatherAdvisory
import com.example.data.remote.WeatherAndAiService
import com.example.data.repository.AmauraRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

class AmauraViewModel(
    private val repository: AmauraRepository,
    private val currentUserId: String
) : ViewModel() {

    val profileState: StateFlow<UiState<FarmerProfile?>> = repository.observeFarmerProfile(currentUserId)
        .map<FarmerProfile?, UiState<FarmerProfile?>> { profile ->
            if (profile != null && profile.districtName.isNotBlank() && _weatherState.value is UiState.Error) {
                refreshWeather(profile.districtName)
            }
            UiState.Success(profile)
        }
        .catch { e ->
            Log.w(TAG, "Error observing profile", e)
            emit(UiState.Error(e.localizedMessage ?: "प्रोफ़ाइल लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val cropCyclesState: StateFlow<UiState<List<CropCycle>>> = repository.observeCropCycles(currentUserId)
        .map<List<CropCycle>, UiState<List<CropCycle>>> { UiState.Success(it) }
        .catch { e ->
            Log.w(TAG, "Error observing crop cycles", e)
            emit(UiState.Error(e.localizedMessage ?: "फसल चक्र लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val cropCasesState: StateFlow<UiState<List<CropCase>>> = repository.observeCropCases(currentUserId)
        .map<List<CropCase>, UiState<List<CropCase>>> { UiState.Success(it) }
        .catch { e ->
            Log.w(TAG, "Error observing crop cases", e)
            emit(UiState.Error(e.localizedMessage ?: "फसल डॉक्टर केस लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val transactionsState: StateFlow<UiState<List<FarmTransaction>>> = repository.observeFarmTransactions(currentUserId)
        .map<List<FarmTransaction>, UiState<List<FarmTransaction>>> { UiState.Success(it) }
        .catch { e ->
            Log.w(TAG, "Error observing transactions", e)
            emit(UiState.Error(e.localizedMessage ?: "हिसाब लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val remindersState: StateFlow<UiState<List<FarmReminder>>> = repository.observeReminders(currentUserId)
        .map<List<FarmReminder>, UiState<List<FarmReminder>>> { UiState.Success(it) }
        .catch { e ->
            Log.w(TAG, "Error observing reminders", e)
            emit(UiState.Error(e.localizedMessage ?: "कैलेंडर कार्य लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    val messagesState: StateFlow<UiState<List<AssistantMessage>>> = repository.observeMessages(currentUserId)
        .map<List<AssistantMessage>, UiState<List<AssistantMessage>>> { UiState.Success(it) }
        .catch { e ->
            Log.w(TAG, "Error observing messages", e)
            emit(UiState.Error(e.localizedMessage ?: "संदेश इतिहास लोड करने में त्रुटि"))
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), UiState.Loading)

    private val _weatherState = MutableStateFlow<UiState<FarmWeatherAdvisory>>(
        UiState.Error("अपने जिले का लाइव मौसम देखने के लिए कृपया ऊपर अपना जिला/गाँव खोजें या 'मेरी खेती' में प्रोफ़ाइल जिला चुनें।")
    )
    val weatherState: StateFlow<UiState<FarmWeatherAdvisory>> = _weatherState.asStateFlow()

    private val _isAssistantBusy = MutableStateFlow(false)
    val isAssistantBusy: StateFlow<Boolean> = _isAssistantBusy.asStateFlow()

    private val _isCropDoctorBusy = MutableStateFlow(false)
    val isCropDoctorBusy: StateFlow<Boolean> = _isCropDoctorBusy.asStateFlow()

    private val _statusBanner = MutableStateFlow<String?>(null)
    val statusBanner: StateFlow<String?> = _statusBanner.asStateFlow()

    private val _latestSpokenReply = MutableStateFlow<String?>(null)
    val latestSpokenReply: StateFlow<String?> = _latestSpokenReply.asStateFlow()

    fun clearStatusBanner() {
        _statusBanner.value = null
    }

    fun clearSpokenReply() {
        _latestSpokenReply.value = null
    }

    private fun currentProfileOrNull(): FarmerProfile? {
        return (profileState.value as? UiState.Success)?.data
    }

    private fun currentCropsList(): List<CropCycle> {
        return (cropCyclesState.value as? UiState.Success)?.data ?: emptyList()
    }

    fun refreshWeather(customDistrictQuery: String? = null) {
        viewModelScope.launch {
            val profile = currentProfileOrNull()
            val targetDistrict = customDistrictQuery?.trim()?.takeIf { it.isNotBlank() }
                ?: profile?.districtName?.trim().orEmpty()

            if (targetDistrict.isBlank()) {
                _weatherState.value = UiState.Error(
                    "अभी कोई जिला चयनित नहीं है। किसी अन्य जिले का मौसम दिखाने के बजाय हम आपसे अनुरोध करते हैं कि ऊपर अपना वास्तविक जिला/तहसील लिखकर 'मौसम खोजें' दबाएँ या 'मेरी खेती' में अपना जिला चुनें।"
                )
                return@launch
            }

            _weatherState.value = UiState.Loading
            val coordsResult = WeatherAndAiService.resolveDistrictCoordinates(
                districtName = targetDistrict,
                stateName = profile?.stateName.orEmpty()
            )
            coordsResult.fold(
                onSuccess = { coords ->
                    val result = WeatherAndAiService.fetchLiveWeatherAdvisory(coords, currentCropsList())
                    result.fold(
                        onSuccess = { advisory ->
                            _weatherState.value = UiState.Success(advisory)
                        },
                        onFailure = { err ->
                            _weatherState.value = UiState.Error(
                                "लाइव मौसम सेवा अभी उपलब्ध नहीं है (${err.localizedMessage ?: "नेटवर्क जाँचें"})। पुराने या अनुमानित पूर्वानुमान को वर्तमान न मानें।"
                            )
                        }
                    )
                },
                onFailure = { geoErr ->
                    _weatherState.value = UiState.Error(
                        geoErr.localizedMessage ?: "इस जिले के निर्देशांक नहीं मिले — कृपया जिले का नाम हिंदी या अंग्रेजी में जांचें।"
                    )
                }
            )
        }
    }

    fun saveProfile(profile: FarmerProfile) {
        viewModelScope.launch {
            repository.saveFarmerProfile(profile).fold(
                onSuccess = {
                    _statusBanner.value = "किसान प्रोफ़ाइल और सहमति सेटिंग सुरक्षित रूप से सहेजी गई।"
                    if (profile.districtName.isNotBlank()) {
                        refreshWeather(profile.districtName)
                    }
                },
                onFailure = { e ->
                    _statusBanner.value = "प्रोफ़ाइल सहेजने में त्रुटि: ${e.localizedMessage}"
                }
            )
        }
    }

    fun updateConsent(consentGiven: Boolean) {
        val existing = currentProfileOrNull() ?: FarmerProfile(userId = currentUserId)
        saveProfile(
            existing.copy(
                userId = currentUserId,
                farmerName = existing.farmerName.ifBlank { "किसान साथी" },
                irrigationType = existing.irrigationType.ifBlank { "सिंचाई स्रोत चुनें" },
                soilType = existing.soilType.ifBlank { "दोमट मिट्टी" },
                consentGiven = consentGiven
            )
        )
    }

    fun deleteProfile() {
        viewModelScope.launch {
            repository.deleteFarmerProfile().fold(
                onSuccess = {
                    _statusBanner.value = "आपकी प्रोफ़ाइल, सभी फसल रिकॉर्ड, केस इतिहास, कैलेंडर और बातचीत पूरी तरह हटा दिए गए हैं।"
                },
                onFailure = { e ->
                    _statusBanner.value = "डेटा हटाने में त्रुटि: ${e.localizedMessage}"
                }
            )
        }
    }

    fun askQuestion(question: String, speakOutLoud: Boolean = true) {
        if (question.isBlank()) return
        viewModelScope.launch {
            _isAssistantBusy.value = true
            val topic = detectTopic(question)
            repository.addMessage(
                AssistantMessage(
                    userId = currentUserId,
                    role = "USER",
                    topic = topic,
                    messageText = question.trim(),
                    sourceCitation = "किसान प्रश्न",
                    flaggedHarmful = false
                )
            )
            val outcome = WeatherAndAiService.askHindiAssistant(
                question = question.trim(),
                profile = currentProfileOrNull(),
                cropCycles = currentCropsList()
            )
            repository.addMessage(
                AssistantMessage(
                    userId = currentUserId,
                    role = "ASSISTANT",
                    topic = topic,
                    messageText = outcome.replyText,
                    sourceCitation = outcome.sourceCitation,
                    flaggedHarmful = false
                )
            )
            if (!outcome.fallbackNoticeHi.isNullOrBlank()) {
                _statusBanner.value = outcome.fallbackNoticeHi
            }
            _isAssistantBusy.value = false
            val voicePref = currentProfileOrNull()?.voiceEnabled ?: true
            if (speakOutLoud && voicePref) {
                _latestSpokenReply.value = outcome.replyText
            }
        }
    }

    fun flagMessage(msg: AssistantMessage) {
        viewModelScope.launch {
            repository.flagMessageHarmful(msg, !msg.flaggedHarmful).onSuccess {
                _statusBanner.value = if (!msg.flaggedHarmful) {
                    "यह उत्तर आपके ऑडिट लॉग में संदिग्ध के रूप में चिह्नित किया गया है। कृपया इस पर अमल न करें और 1800-180-1551 (किसान कॉल सेंटर) से पुष्टि करें।"
                } else {
                    "चिह्न हटाया गया।"
                }
            }
        }
    }

    fun submitCropDoctorCase(
        cropName: String,
        growthStage: String,
        symptoms: String,
        spreadScope: String,
        photoBitmap: Bitmap?
    ) {
        if (cropName.isBlank() || symptoms.isBlank()) {
            _statusBanner.value = "कृपया फसल का नाम और अपने खेत में दिख रहे वास्तविक लक्षण लिखें या चुनें।"
            return
        }
        viewModelScope.launch {
            _isCropDoctorBusy.value = true
            val outcome = WeatherAndAiService.analyzeCropProblem(
                cropName = cropName.trim(),
                growthStage = growthStage.ifBlank { "वानस्पतिक अवस्था" }.trim(),
                symptoms = symptoms.trim(),
                spreadScope = spreadScope.ifBlank { "कुछ पौधों में" }.trim(),
                photoBitmap = photoBitmap,
                profile = currentProfileOrNull()
            )
            repository.addCropCase(
                CropCase(
                    userId = currentUserId,
                    cropName = cropName.trim(),
                    growthStage = growthStage.ifBlank { "वानस्पतिक अवस्था" }.trim(),
                    symptoms = symptoms.trim(),
                    spreadScope = spreadScope.ifBlank { "कुछ पौधों में" }.trim(),
                    likelyCauses = outcome.likelyCauses,
                    confidenceLevel = outcome.confidenceLevel,
                    safeNextSteps = outcome.safeNextSteps,
                    expertStatus = "NONE",
                    expertNotes = "",
                    photoBase64 = outcome.photoThumbnailBase64
                )
            ).fold(
                onSuccess = {
                    _statusBanner.value = outcome.fallbackNoticeHi
                        ?: "फसल डॉक्टर विश्लेषण पूर्ण हुआ (आत्मविश्वास स्तर: ${outcome.confidenceLevel})। सुरक्षित अगले कदम नीचे देखें।"
                },
                onFailure = { e ->
                    _statusBanner.value = "केस सहेजने में त्रुटि: ${e.localizedMessage}"
                }
            )
            _isCropDoctorBusy.value = false
        }
    }

    fun escalateCaseToExpert(cropCase: CropCase, farmerConsentNote: String) {
        viewModelScope.launch {
            repository.escalateCropCaseToExpert(
                cropCase,
                "KVK परामर्श हेतु केस सारांश तैयार (${farmerConsentNote.ifBlank { "किसान नोट" }}) — कृपया WhatsApp/SMS से साझा करें या 1800-180-1551 पर कॉल करें",
                newStatus = "ESCALATED"
            ).fold(
                onSuccess = {
                    _statusBanner.value = "KVK परामर्श सारांश तैयार हो गया है। ऐप स्वयं किसी बाहरी विशेषज्ञ को स्वतः संदेश नहीं भेजता — कृपया शेयर विकल्प से इसे अपने KVK विशेषज्ञ को भेजें या 1800-180-1551 पर कॉल करें।"
                },
                onFailure = { e ->
                    _statusBanner.value = "केस अपडेट करने में त्रुटि: ${e.localizedMessage}"
                }
            )
        }
    }

    fun resolveCaseWithAdminNote(cropCase: CropCase, reviewNote: String) {
        viewModelScope.launch {
            repository.escalateCropCaseToExpert(
                cropCase,
                reviewNote.ifBlank { "समीक्षा पूर्ण: किसान कॉल सेंटर / KVK मार्गदर्शन दर्ज" },
                newStatus = "RESOLVED"
            ).onSuccess {
                _statusBanner.value = "केस पर विशेषज्ञ/समीक्षा टिप्पणी सहेजी गई।"
            }
        }
    }

    fun addCropCycle(
        fieldName: String,
        cropName: String,
        varietyName: String,
        areaAcres: Double,
        season: String,
        sowingDate: String,
        growthStage: String,
        irrigationMethod: String,
        notes: String
    ) {
        if (fieldName.isBlank() || cropName.isBlank()) return
        viewModelScope.launch {
            val todayFormatted = formatDaysAgo(0)
            repository.addCropCycle(
                CropCycle(
                    userId = currentUserId,
                    fieldName = fieldName.trim(),
                    cropName = cropName.trim(),
                    varietyName = varietyName.ifBlank { "प्रमाणित किस्म" }.trim(),
                    areaAcres = areaAcres.coerceIn(0.1, 10000.0),
                    season = season,
                    sowingDate = sowingDate.ifBlank { todayFormatted }.trim(),
                    growthStage = growthStage.ifBlank { "बुवाई / अंकुरण" }.trim(),
                    irrigationMethod = irrigationMethod.ifBlank { "ट्यूबवेल / नहर" }.trim(),
                    notes = notes.trim()
                )
            ).onSuccess {
                repository.addReminder(
                    FarmReminder(
                        userId = currentUserId,
                        cropName = cropName.trim(),
                        taskTitle = "${cropName.trim()} (${fieldName.trim()}): नमी और प्रारंभिक पोषण निरीक्षण",
                        whySuggested = "बुवाई (${sowingDate.ifBlank { todayFormatted }}) के बाद उचित अंकुरण और जड़ विकास सुनिश्चित करने हेतु सस्य सलाह।",
                        dueDate = "बुवाई से 21 दिन पर",
                        status = "PENDING"
                    )
                )
                _statusBanner.value = "नई फसल और खेती कैलेंडर कार्य जोड़ा गया।"
            }
        }
    }

    fun deleteCropCycle(cycleId: String) {
        viewModelScope.launch {
            repository.deleteCropCycle(cycleId)
        }
    }

    fun addReminder(cropName: String, taskTitle: String, whySuggested: String, dueDate: String) {
        if (cropName.isBlank() || taskTitle.isBlank()) return
        viewModelScope.launch {
            repository.addReminder(
                FarmReminder(
                    userId = currentUserId,
                    cropName = cropName.trim(),
                    taskTitle = taskTitle.trim(),
                    whySuggested = whySuggested.ifBlank { "फसल की अवस्था और मौसम के अनुसार आवश्यक कार्य" }.trim(),
                    dueDate = dueDate.ifBlank { "इस सप्ताह" }.trim(),
                    status = "PENDING"
                )
            ).onSuccess {
                _statusBanner.value = "कैलेंडर में नया कार्य जोड़ा गया।"
            }
        }
    }

    fun updateReminderStatus(reminder: FarmReminder, newStatus: String) {
        viewModelScope.launch {
            repository.updateReminderStatus(reminder, newStatus)
        }
    }

    fun addTransaction(
        txType: String,
        category: String,
        cropName: String,
        fieldName: String,
        title: String,
        amountInr: Double,
        quantityQuintal: Double,
        txDate: String
    ) {
        if (title.isBlank() || amountInr <= 0.0) return
        viewModelScope.launch {
            val todayFormatted = formatDaysAgo(0)
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = currentUserId,
                    txType = txType,
                    category = category.ifBlank { "बीज (Seed)" },
                    cropName = cropName.ifBlank { "गेहूँ (Wheat)" }.trim(),
                    fieldName = fieldName.ifBlank { "मुख्य खेत" }.trim().take(80),
                    title = title.trim(),
                    amountInr = amountInr.coerceIn(1.0, 100000000.0),
                    quantityQuintal = quantityQuintal.coerceIn(0.0, 100000.0),
                    txDate = txDate.ifBlank { todayFormatted }.trim()
                )
            ).onSuccess {
                _statusBanner.value = if (txType == "EXPENSE") {
                    "खेत '${fieldName.ifBlank { "मुख्य खेत" }}' के लिए खर्च का हिसाब जोड़ा गया।"
                } else {
                    "उपज बिक्री का हिसाब जोड़ा गया।"
                }
            }
        }
    }

    fun deleteTransaction(txId: String) {
        viewModelScope.launch {
            repository.deleteFarmTransaction(txId)
        }
    }

    private fun formatDaysAgo(daysAgo: Int): String {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -daysAgo)
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
    }

    fun seedStarterFarmData() {
        viewModelScope.launch {
            val wheatSownDate = formatDaysAgo(21) // Exactly 21 days ago to match CRI 21-day stage!
            val mustardSownDate = formatDaysAgo(32)
            val txDateSeed = formatDaysAgo(21)
            val txDateFert = formatDaysAgo(18)

            repository.saveFarmerProfile(
                FarmerProfile(
                    userId = currentUserId,
                    farmerName = "रामेश्वर सिंह (उदाहरण प्रोफ़ाइल)",
                    preferredLanguage = "hi",
                    voiceEnabled = true,
                    stateName = "उत्तर प्रदेश",
                    districtName = "वाराणसी",
                    villageName = "राजातालाब",
                    landSizeAcres = 3.5,
                    irrigationType = "नहर और ट्यूबवेल (Canal & Tubewell)",
                    soilType = "दोमट मिट्टी (Alluvial Loam)",
                    consentGiven = true,
                    hasAadhaarEkyc = true,
                    isIncomeTaxPayer = false,
                    hasKccCard = true
                )
            )
            repository.addCropCycle(
                CropCycle(
                    userId = currentUserId,
                    fieldName = "पूर्वी खेत (नहर के पास)",
                    cropName = "गेहूँ (Wheat)",
                    varietyName = "HD-2967",
                    areaAcres = 2.0,
                    season = "Rabi",
                    sowingDate = wheatSownDate,
                    growthStage = "मुकुट जड़ अवस्था (CRI - 21 दिन पूर्ण)",
                    irrigationMethod = "ट्यूबवेल",
                    notes = "21 दिन पूर्व बुवाई, डीएपी बेसल डोज पूर्ण"
                )
            )
            repository.addCropCycle(
                CropCycle(
                    userId = currentUserId,
                    fieldName = "पश्चिमी खेत",
                    cropName = "सरसों (Mustard)",
                    varietyName = "पूसा सरसों-28",
                    areaAcres = 1.5,
                    season = "Rabi",
                    sowingDate = mustardSownDate,
                    growthStage = "शाखा एवं फूल निकलने की अवस्था (32 दिन)",
                    irrigationMethod = "स्प्रिंकलर",
                    notes = "माहू कीट की निगरानी आवश्यक"
                )
            )
            repository.addReminder(
                FarmReminder(
                    userId = currentUserId,
                    cropName = "गेहूँ (Wheat)",
                    taskTitle = "पहली सिंचाई (CRI अवस्था - बुवाई के 21 दिन पूरे)",
                    whySuggested = "गेहूँ की बुवाई ($wheatSownDate) को 21 दिन पूरे हो गए हैं; मुकुट जड़ बनते समय हल्की सिंचाई करने से कल्ले अधिक निकलते हैं।",
                    dueDate = "आज / इस सप्ताह",
                    status = "PENDING"
                )
            )
            repository.addReminder(
                FarmReminder(
                    userId = currentUserId,
                    cropName = "सरसों (Mustard)",
                    taskTitle = "माहू (Aphid) कीट हेतु पीले चिपचिपे ट्रैप लगाएँ",
                    whySuggested = "फूल निकलने की अवस्था ($mustardSownDate से 32 दिन) में बिना रसायन के प्रारंभिक रोकथाम।",
                    dueDate = "इस सप्ताह",
                    status = "PENDING"
                )
            )
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = currentUserId,
                    txType = "EXPENSE",
                    category = "बीज (Seed)",
                    cropName = "गेहूँ (Wheat)",
                    fieldName = "पूर्वी खेत (नहर के पास)",
                    title = "प्रमाणित गेहूँ बीज HD-2967 (80 किग्रा)",
                    amountInr = 3400.0,
                    quantityQuintal = 0.8,
                    txDate = txDateSeed
                )
            )
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = currentUserId,
                    txType = "EXPENSE",
                    category = "खाद एवं उर्वरक (Fertiliser)",
                    cropName = "गेहूँ (Wheat)",
                    fieldName = "पूर्वी खेत (नहर के पास)",
                    title = "डीएपी (DAP) एवं पोटाश बेसल खाद",
                    amountInr = 4200.0,
                    quantityQuintal = 1.5,
                    txDate = txDateFert
                )
            )
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = currentUserId,
                    txType = "EXPENSE",
                    category = "खाद एवं उर्वरक (Fertiliser)",
                    cropName = "सरसों (Mustard)",
                    fieldName = "पश्चिमी खेत",
                    title = "सिंगल सुपर फॉस्फेट (SSP) और बीज उपचार",
                    amountInr = 2100.0,
                    quantityQuintal = 1.0,
                    txDate = mustardSownDate
                )
            )
            repository.addFarmTransaction(
                FarmTransaction(
                    userId = currentUserId,
                    txType = "SALE",
                    cropName = "धान (Paddy)",
                    fieldName = "पूर्वी खेत (नहर के पास)",
                    category = "मंडी बिक्री (Harvest Sale)",
                    title = "खरीफ धान बिक्री",
                    amountInr = 41760.0,
                    quantityQuintal = 18.0,
                    txDate = formatDaysAgo(28)
                )
            )
            _statusBanner.value = "उदाहरण खेत, वास्तविक अतीत बुवाई तिथियों वाले फसल चक्र, और प्रति-खेत खर्च डेटा लोड किया गया!"
            refreshWeather("वाराणसी")
        }
    }

    fun evaluateAllSchemes(): List<SchemeEvaluationResult> {
        val profile = currentProfileOrNull()
        val crops = currentCropsList()
        return AgriculturalKnowledgeBase.verifiedSchemes.map { scheme ->
            AgriculturalKnowledgeBase.evaluateSchemeForFarmer(scheme, profile, crops)
        }
    }

    fun calculateFarmEconomics(expectedYieldQuintals: Double, selectedFieldFilter: String = "ALL"): FarmEconomicsSummary {
        val allTxs = (transactionsState.value as? UiState.Success)?.data ?: emptyList()
        val txs = if (selectedFieldFilter == "ALL") {
            allTxs
        } else {
            allTxs.filter { it.fieldName.equals(selectedFieldFilter, ignoreCase = true) }
        }
        val acres = currentProfileOrNull()?.landSizeAcres?.takeIf { it > 0.0 }
            ?: currentCropsList().sumOf { it.areaAcres }.takeIf { it > 0.0 }
            ?: 1.0
        return AgriculturalKnowledgeBase.calculateFarmEconomics(txs, acres, expectedYieldQuintals)
    }

    fun calculateMandiOptions(
        selectedCropFilter: String,
        quantityQuintals: Double,
        transportCostInr: Double,
        mandiHandlingCostInr: Double,
        customLocalMandiName: String = "",
        customLocalPricePerQuintal: Double = 0.0
    ): List<MandiComparisonOption> {
        val filtered = if (selectedCropFilter == "ALL") {
            AgriculturalKnowledgeBase.mandiQuotes
        } else {
            AgriculturalKnowledgeBase.mandiQuotes.filter { it.cropNameHi.contains(selectedCropFilter) }
        }
        val list = mutableListOf<MandiComparisonOption>()
        if (customLocalPricePerQuintal > 0.0) {
            val customQuote = MandiReferenceQuote(
                id = "custom_user_quote",
                cropNameHi = if (selectedCropFilter == "ALL") "आपकी चुनी गई उपज" else selectedCropFilter,
                varietyGrade = "किसान द्वारा दर्ज स्थानीय भाव",
                mandiNameHi = customLocalMandiName.ifBlank { "आपकी स्थानीय मंडी / व्यापारी भाव" },
                stateNameHi = currentProfileOrNull()?.stateName?.ifBlank { "स्थानीय" } ?: "स्थानीय",
                districtNameHi = currentProfileOrNull()?.districtName?.ifBlank { "स्थानीय" } ?: "स्थानीय",
                modalPricePerQuintalInr = customLocalPricePerQuintal,
                minPriceInr = customLocalPricePerQuintal,
                maxPriceInr = customLocalPricePerQuintal,
                mspReferenceInr = filtered.firstOrNull()?.mspReferenceInr,
                mspSeasonLabelHi = filtered.firstOrNull()?.mspSeasonLabelHi ?: "आधिकारिक MSP से तुलना",
                distanceKmEstimate = 5.0,
                observationDate = "किसान द्वारा आज दर्ज",
                sourceLabel = "किसान द्वारा दर्ज प्रत्यक्ष मंडी/व्यापारी भाव"
            )
            list.add(
                AgriculturalKnowledgeBase.calculateMandiComparison(
                    quote = customQuote,
                    quantityQuintals = quantityQuintals,
                    transportCostInr = transportCostInr,
                    mandiHandlingCostInr = mandiHandlingCostInr
                )
            )
        }
        list.addAll(
            filtered.map { quote ->
                AgriculturalKnowledgeBase.calculateMandiComparison(
                    quote = quote,
                    quantityQuintals = quantityQuintals,
                    transportCostInr = transportCostInr,
                    mandiHandlingCostInr = mandiHandlingCostInr
                )
            }
        )
        return list
    }

    private fun detectTopic(text: String): String {
        val lower = text.lowercase()
        return when {
            lower.contains("पत्ती") || lower.contains("पीली") || lower.contains("कीट") || lower.contains("रोग") || lower.contains("दवा") -> "CROP_DOCTOR"
            lower.contains("योजना") || lower.contains("बीमा") || lower.contains("सम्मान") || lower.contains("kcc") -> "SCHEME"
            lower.contains("मौसम") || lower.contains("बारिश") || lower.contains("सिंचाई") -> "WEATHER"
            lower.contains("मंडी") || lower.contains("भाव") || lower.contains("बेच") -> "MANDI"
            lower.contains("खर्च") || lower.contains("लागत") || lower.contains("हिसाब") -> "ACCOUNTS"
            else -> "GENERAL"
        }
    }

    private companion object {
        const val TAG = "AmauraVM"
        const val STOP_TIMEOUT_MS = 5000L
    }
}
