package com.example.data.remote

import android.graphics.Bitmap
import android.util.Base64
import com.example.BuildConfig
import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.knowledge.DistrictCoordinates
import com.example.data.model.CropCycle
import com.example.data.model.FarmerProfile
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.content
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.min

// --- 1. Open-Meteo Real Weather & Live Geocoding Data Models ---

@Serializable
data class OpenMeteoResponse(
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val current: CurrentWeather? = null,
    val daily: DailyWeather? = null
)

@Serializable
data class CurrentWeather(
    val time: String = "",
    @SerialName("temperature_2m") val temperature2m: Double = 28.0,
    @SerialName("relative_humidity_2m") val relativeHumidity2m: Int = 55,
    @SerialName("precipitation") val precipitationMm: Double = 0.0,
    @SerialName("wind_speed_10m") val windSpeedKmh: Double = 8.0,
    @SerialName("weather_code") val weatherCode: Int = 0
)

@Serializable
data class DailyWeather(
    val time: List<String> = emptyList(),
    @SerialName("temperature_2m_max") val tempMax: List<Double> = emptyList(),
    @SerialName("temperature_2m_min") val tempMin: List<Double> = emptyList(),
    @SerialName("precipitation_probability_max") val precipProbMax: List<Int> = emptyList(),
    @SerialName("precipitation_sum") val precipSumMm: List<Double> = emptyList()
)

@Serializable
data class GeocodingSearchResponse(
    val results: List<GeocodingLocationResult> = emptyList()
)

@Serializable
data class GeocodingLocationResult(
    val name: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val admin1: String = "",
    @SerialName("country_code") val countryCode: String = ""
)

data class FarmWeatherAdvisory(
    val locationLabelHi: String,
    val currentTempC: Double,
    val humidityPercent: Int,
    val windSpeedKmh: Double,
    val todayRainProbPercent: Int,
    val threeDayRainProbMaxPercent: Int,
    val retrievedAtFormatted: String,
    val forecastWindowHi: String,
    val uncertaintyNoteHi: String,
    val sourceAttributionHi: String,
    val isLiveNetworkData: Boolean,
    val taskRecommendations: List<WeatherTaskRecommendation>
)

data class WeatherTaskRecommendation(
    val taskCategoryHi: String,
    val recommendationHi: String,
    val reasonWhyHi: String,
    val isCaution: Boolean
)

data class AssistantReplyOutcome(
    val replyText: String,
    val sourceCitation: String,
    val usedLiveAi: Boolean,
    val fallbackNoticeHi: String? = null
)

data class CropDiagnosisOutcome(
    val likelyCauses: String,
    val confidenceLevel: String,
    val safeNextSteps: String,
    val photoThumbnailBase64: String,
    val usedLiveAi: Boolean,
    val fallbackNoticeHi: String? = null
)

interface OpenMeteoApiService {
    @GET("v1/forecast")
    suspend fun getForecast(
        @Query("latitude") latitude: Double,
        @Query("longitude") longitude: Double,
        @Query("current") current: String = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
        @Query("daily") daily: String = "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
        @Query("timezone") timezone: String = "Asia/Kolkata",
        @Query("forecast_days") forecastDays: Int = 3
    ): OpenMeteoResponse
}

interface OpenMeteoGeocodingService {
    @GET("v1/search")
    suspend fun searchLocation(
        @Query("name") name: String,
        @Query("count") count: Int = 5,
        @Query("language") language: String = "hi",
        @Query("format") format: String = "json"
    ): GeocodingSearchResponse
}

// --- 2. Gemini REST API Models & Service (gemini-3-flash-preview) ---

@Serializable
data class GenerateContentRequest(
    val contents: List<Content>,
    val generationConfig: GenerationConfig? = null,
    val systemInstruction: Content? = null
)

@Serializable
data class Content(
    val role: String? = null,
    val parts: List<Part>
)

@Serializable
data class Part(
    val text: String? = null,
    val inlineData: InlineData? = null
)

@Serializable
data class InlineData(
    val mimeType: String,
    val data: String
)

@Serializable
data class GenerationConfig(
    val temperature: Float? = 0.3f,
    val topP: Float? = 0.9f
)

@Serializable
data class GenerateContentResponse(
    val candidates: List<Candidate> = emptyList()
)

@Serializable
data class Candidate(
    val content: Content? = null
)

interface GeminiApiService {
    @POST("v1beta/models/gemini-3-flash-preview:generateContent")
    suspend fun generateContent(
        @Query("key") apiKey: String,
        @Body request: GenerateContentRequest
    ): GenerateContentResponse
}

object WeatherAndAiService {
    private const val MODEL_NAME = "gemini-3-flash-preview"
    private const val MAX_AI_CALLS_PER_HOUR = 15
    private const val MIN_AI_INTERVAL_MS = 3000L

    private val aiCallTimestamps = mutableListOf<Long>()

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(45, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .writeTimeout(45, TimeUnit.SECONDS)
        .build()

    private val weatherService: OpenMeteoApiService by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.open-meteo.com/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(OpenMeteoApiService::class.java)
    }

    private val geocodingService: OpenMeteoGeocodingService by lazy {
        Retrofit.Builder()
            .baseUrl("https://geocoding-api.open-meteo.com/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(OpenMeteoGeocodingService::class.java)
    }

    private val geminiService: GeminiApiService by lazy {
        Retrofit.Builder()
            .baseUrl("https://generativelanguage.googleapis.com/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(GeminiApiService::class.java)
    }

    fun isGeminiKeyConfigured(): Boolean {
        val key = BuildConfig.GEMINI_API_KEY
        return key.isNotBlank() && key != "MY_GEMINI_API_KEY" && !key.startsWith("YOUR_")
    }

    @Synchronized
    fun getRemainingAiQuota(nowMs: Long = System.currentTimeMillis()): Int {
        val oneHourAgo = nowMs - 3600_000L
        aiCallTimestamps.removeAll { it < oneHourAgo }
        return (MAX_AI_CALLS_PER_HOUR - aiCallTimestamps.size).coerceAtLeast(0)
    }

    @Synchronized
    private fun tryAcquireAiQuota(nowMs: Long = System.currentTimeMillis()): String? {
        val oneHourAgo = nowMs - 3600_000L
        aiCallTimestamps.removeAll { it < oneHourAgo }
        val lastCall = aiCallTimestamps.lastOrNull() ?: 0L
        if (nowMs - lastCall < MIN_AI_INTERVAL_MS) {
            return "कृपया अगले AI अनुरोध से पहले कुछ सेकंड प्रतीक्षा करें (Rate Limit सक्रिय)।"
        }
        if (aiCallTimestamps.size >= MAX_AI_CALLS_PER_HOUR) {
            return "प्रति घंटे अधिकतम $MAX_AI_CALLS_PER_HOUR AI प्रश्नों की सीमा पूरी हो गई है। अभी ऑफ़लाइन संदर्भ पुस्तकालय से उत्तर दिया जा रहा है।"
        }
        aiCallTimestamps.add(nowMs)
        return null
    }

    /**
     * Resolves any Indian district, tehsil, or village to coordinates:
     * 1. First checks the 24 built-in offline districts.
     * 2. If not in the built-in table, queries Open-Meteo's live Geocoding API so ANY district in India works!
     */
    suspend fun resolveDistrictCoordinates(
        districtName: String,
        stateName: String = ""
    ): Result<DistrictCoordinates> = withContext(Dispatchers.IO) {
        val clean = districtName.trim()
        if (clean.isBlank()) {
            return@withContext Result.failure(
                IllegalArgumentException("कृपया पहले 'मेरी खेती' में अपना जिला चुनें या ऊपर जिले का नाम खोजें।")
            )
        }
        val localMatch = AgriculturalKnowledgeBase.findCoordinatesForDistrictOrNull(clean, stateName)
        if (localMatch != null) {
            return@withContext Result.success(localMatch)
        }

        runCatching {
            val geoResp = geocodingService.searchLocation(name = clean)
            val best = geoResp.results.firstOrNull { it.countryCode.equals("IN", ignoreCase = true) }
                ?: geoResp.results.firstOrNull()
                ?: throw IllegalStateException("इस नाम का जिला/स्थान नहीं मिला: $clean")

            DistrictCoordinates(
                stateHi = best.admin1.ifBlank { stateName.ifBlank { "भारत" } },
                districtHi = best.name.ifBlank { clean },
                latitude = best.latitude,
                longitude = best.longitude
            )
        }
    }

    suspend fun fetchLiveWeatherAdvisory(
        coords: DistrictCoordinates,
        cropCycles: List<CropCycle>
    ): Result<FarmWeatherAdvisory> = withContext(Dispatchers.IO) {
        runCatching {
            val response = weatherService.getForecast(
                latitude = coords.latitude,
                longitude = coords.longitude
            )
            val current = response.current ?: CurrentWeather()
            val daily = response.daily ?: DailyWeather()
            val todayRainProb = daily.precipProbMax.firstOrNull() ?: 10
            val max3DayRainProb = daily.precipProbMax.maxOrNull() ?: todayRainProb

            val timeFormat = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.forLanguageTag("hi-IN"))
            val retrievedStamp = timeFormat.format(Date())

            val activeCropNames = if (cropCycles.isEmpty()) {
                "आपकी फसलें"
            } else {
                cropCycles.joinToString(", ") { it.cropName }
            }

            val tasks = mutableListOf<WeatherTaskRecommendation>()

            // 1. Irrigation decision (Transparent heuristic explanation)
            if (max3DayRainProb >= 50) {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "सिंचाई सलाह (Irrigation)",
                        recommendationHi = "अभी सिंचाई 2-3 दिन के लिए टालने पर विचार करें।",
                        reasonWhyHi = "क्योंकि अगले 72 घंटों में अधिकतम बारिश संभावना ${max3DayRainProb}% दिख रही है (ऐप सावधानी सीमा: 50%+)। बारिश होने पर खेत में जलभराव से $activeCropNames को नुकसान हो सकता है।",
                        isCaution = true
                    )
                )
            } else {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "सिंचाई सलाह (Irrigation)",
                        recommendationHi = "मिट्टी की नमी जांचकर सुबह या शाम आवश्यकतानुसार सिंचाई कर सकते हैं।",
                        reasonWhyHi = "क्योंकि अगले 3 दिनों में बारिश की संभावना कम (${max3DayRainProb}%) है और वर्तमान तापमान ${current.temperature2m}°C है।",
                        isCaution = false
                    )
                )
            }

            // 2. Spraying decision
            if (current.windSpeedKmh >= 15.0 || todayRainProb >= 40) {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "छिड़काव सलाह (Spraying)",
                        recommendationHi = "आज किसी भी पोषक तत्व या दवा का छिड़काव टालें।",
                        reasonWhyHi = "क्योंकि हवा की गति ${current.windSpeedKmh} km/h है और आज बारिश संभावना ${todayRainProb}% है (सावधानी नियम: हवा ≥15 km/h या बारिश ≥40% में दवा उड़ने/धुलने का जोखिम रहता है)।",
                        isCaution = true
                    )
                )
            } else {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "छिड़काव सलाह (Spraying)",
                        recommendationHi = "यदि विशेषज्ञ द्वारा सुझाया गया हो, तो शांत हवा में छिड़काव अनुकूल है।",
                        reasonWhyHi = "क्योंकि हवा की गति सामान्य (${current.windSpeedKmh} km/h) है और आज बारिश की संभावना कम (${todayRainProb}%) है।",
                        isCaution = false
                    )
                )
            }

            // 3. Harvest & Storage decision
            if (max3DayRainProb >= 45 || current.relativeHumidity2m >= 80) {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "कटाई एवं भंडारण (Harvest)",
                        recommendationHi = "कटी हुई उपज को तिरपाल से ढककर ऊँचे व सूखे स्थान पर रखें।",
                        reasonWhyHi = "क्योंकि हवा में सापेक्षिक नमी ${current.relativeHumidity2m}% है और 3-दिन की बारिश संभावना ${max3DayRainProb}% है।",
                        isCaution = true
                    )
                )
            } else {
                tasks.add(
                    WeatherTaskRecommendation(
                        taskCategoryHi = "बुवाई एवं खेत कार्य (Field Work)",
                        recommendationHi = "निराई-गुड़ाई और खेत निरीक्षण के लिए मौसम अनुकूल है।",
                        reasonWhyHi = "क्योंकि बारिश की संभावना कम है और हवा में नमी ${current.relativeHumidity2m}% संतुलित है।",
                        isCaution = false
                    )
                )
            }

            FarmWeatherAdvisory(
                locationLabelHi = "${coords.districtHi}, ${coords.stateHi}",
                currentTempC = current.temperature2m,
                humidityPercent = current.relativeHumidity2m,
                windSpeedKmh = current.windSpeedKmh,
                todayRainProbPercent = todayRainProb,
                threeDayRainProbMaxPercent = max3DayRainProb,
                retrievedAtFormatted = retrievedStamp,
                forecastWindowHi = "अगले 72 घंटे (3-दिन का क्षेत्रीय पूर्वानुमान)",
                uncertaintyNoteHi = "पारदर्शिता नोट: यह पूर्वानुमान Open-Meteo संख्यात्मक मौसम मॉडल पर आधारित है (IMD का आधिकारिक बुलेटिन नहीं)। ऊपर दिए गए कार्य सुझाव ऐप के सामान्य कृषि सावधानी नियमों (हवा ≥15 km/h या बारिश संभावना ≥40-50%) पर आधारित हैं।",
                sourceAttributionHi = "स्रोत: Open-Meteo लाइव मौसम API (अक्षांश ${coords.latitude}, देशांतर ${coords.longitude})",
                isLiveNetworkData = true,
                taskRecommendations = tasks
            )
        }
    }

    /**
     * Compresses a Bitmap for AI analysis (higher resolution up to 1024px so leaf lesions are clear).
     */
    private fun Bitmap.toAnalysisBase64Jpeg(): String {
        val maxDim = 1024
        val ratio = min(maxDim.toFloat() / width.coerceAtLeast(1), maxDim.toFloat() / height.coerceAtLeast(1))
        val scaled = if (ratio < 1f) {
            Bitmap.createScaledBitmap(
                this,
                (width * ratio).toInt().coerceAtLeast(1),
                (height * ratio).toInt().coerceAtLeast(1),
                true
            )
        } else {
            this
        }
        val outputStream = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 82, outputStream)
        return Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
    }

    /**
     * Compresses a Bitmap into a compact persistent thumbnail (< 40 KB) so it can be stored
     * directly inside the Firestore `CropCase` document for Case History inspection!
     */
    fun encodeThumbnailBase64(bitmap: Bitmap?): String {
        if (bitmap == null) return ""
        return try {
            val maxDim = 280
            val ratio = min(
                maxDim.toFloat() / bitmap.width.coerceAtLeast(1),
                maxDim.toFloat() / bitmap.height.coerceAtLeast(1)
            )
            val scaled = if (ratio < 1f) {
                Bitmap.createScaledBitmap(
                    bitmap,
                    (bitmap.width * ratio).toInt().coerceAtLeast(1),
                    (bitmap.height * ratio).toInt().coerceAtLeast(1),
                    true
                )
            } else {
                bitmap
            }
            val outputStream = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 65, outputStream)
            Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP).take(55000)
        } catch (_: Exception) {
            ""
        }
    }

    private suspend fun callGeminiTextOrMultimodal(
        systemPrompt: String,
        userPrompt: String,
        photoBitmap: Bitmap? = null
    ): Result<String> = runCatching {
        // 1. Try Firebase AI Logic SDK first (protected by Firebase App Check, no raw key needed)
        try {
            val generativeModel = Firebase.ai(backend = GenerativeBackend.googleAI())
                .generativeModel(modelName = MODEL_NAME)
            val inputContent = content {
                if (photoBitmap != null) {
                    image(photoBitmap)
                }
                text("$systemPrompt\n\n$userPrompt")
            }
            val fbResponse = generativeModel.generateContent(inputContent)
            val fbText = fbResponse.text
            if (!fbText.isNullOrBlank()) {
                return@runCatching fbText.trim()
            }
        } catch (_: Exception) {
            // Fall through to REST API if GEMINI_API_KEY is configured
        }

        // 2. Fallback to Gemini REST API (`gemini-3-flash-preview`)
        if (!isGeminiKeyConfigured()) {
            throw IllegalStateException("GEMINI_API_KEY कॉन्फ़िगर नहीं है।")
        }
        val parts = mutableListOf(Part(text = userPrompt))
        if (photoBitmap != null) {
            parts.add(
                Part(
                    inlineData = InlineData(
                        mimeType = "image/jpeg",
                        data = photoBitmap.toAnalysisBase64Jpeg()
                    )
                )
            )
        }
        val request = GenerateContentRequest(
            contents = listOf(Content(parts = parts)),
            generationConfig = GenerationConfig(temperature = 0.25f),
            systemInstruction = Content(parts = listOf(Part(text = systemPrompt)))
        )
        val response = geminiService.generateContent(BuildConfig.GEMINI_API_KEY, request)
        val text = response.candidates.firstOrNull()?.content?.parts?.firstOrNull()?.text
        if (text.isNullOrBlank()) {
            throw IllegalStateException("AI मॉडल से खाली उत्तर प्राप्त हुआ।")
        }
        text.trim()
    }

    // Hindi Agricultural Assistant with Consent Gate, Rate Limiter, Local Context Injection, and Honest Attribution
    suspend fun askHindiAssistant(
        question: String,
        profile: FarmerProfile?,
        cropCycles: List<CropCycle>
    ): AssistantReplyOutcome = withContext(Dispatchers.IO) {
        val consentAllowed = profile?.consentGiven == true

        // Inject matching local reference articles so the model actually reads our curated summary notes
        val qLower = question.lowercase()
        val matchingArticle = AgriculturalKnowledgeBase.cropGuidanceLibrary.find { art ->
            qLower.contains(art.cropHi.substringBefore(" ").lowercase()) ||
                art.titleHi.lowercase().split(" ").any { word -> word.length > 3 && qLower.contains(word) }
        }
        val localReferenceSnippet = matchingArticle?.let {
            "ऐप के स्थानीय संदर्भ नोट्स (${it.sourceOrg}): ${it.summaryHi} सुरक्षित कदम: ${it.cautiousStepsHi.joinToString("; ")}"
        } ?: ""

        var fallbackReason: String? = null

        if (!consentAllowed) {
            fallbackReason = "डेटा गोपनीयता सहमति बंद है — आपकी जानकारी बाहरी AI को नहीं भेजी गई; नीचे ऑफ़लाइन संदर्भ पुस्तकालय से उत्तर दिया गया है।"
        } else {
            val quotaErr = tryAcquireAiQuota()
            if (quotaErr != null) {
                fallbackReason = quotaErr
            } else {
                val farmContext = buildString {
                    if (profile != null && profile.districtName.isNotBlank()) {
                        append("किसान का राज्य: ${profile.stateName}, जिला: ${profile.districtName}, भूमि: ${profile.landSizeAcres} एकड़। ")
                    }
                    if (cropCycles.isNotEmpty()) {
                        append("सक्रिय फसलें: ${cropCycles.joinToString { "${it.cropName} (${it.growthStage})" }}।")
                    }
                }
                val systemPrompt = """
                    आप 'Amaura किसान सहायक' हैं — भारतीय किसानों के लिए एक सतर्क, ईमानदार हिंदी कृषि सहायक।
                    अनिवार्य सुरक्षा नियम:
                    1. हमेशा सरल, छोटे वाक्यों वाली हिंदी में उत्तर दें।
                    2. कभी भी सरकारी योजना की पात्रता, अंतिम तिथि, मंडी भाव या मौसम के आँकड़े खुद से न गढ़ें (invent न करें)।
                    3. बिना पूरी जानकारी के किसी तेज़ रासायनिक कीटनाशक की मात्रा या दो रसायनों के मिश्रण की सलाह कभी न दें।
                    4. स्पष्ट बताएं कि यह AI जनित सामान्य सुझाव है, आधिकारिक कृषि वैज्ञानिक प्रमाणपत्र नहीं।
                    किसान का संदर्भ: $farmContext
                    $localReferenceSnippet
                """.trimIndent()

                val aiResult = callGeminiTextOrMultimodal(
                    systemPrompt = systemPrompt,
                    userPrompt = question
                )
                aiResult.fold(
                    onSuccess = { answer ->
                        val citation = if (localReferenceSnippet.isNotBlank()) {
                            "स्रोत: AI जनित सुझाव (Gemini 3 Flash) + ऐप के स्थानीय संदर्भ नोट्स (आधिकारिक ICAR प्रमाणपत्र नहीं)"
                        } else {
                            "स्रोत: AI जनित सामान्य सुझाव (Gemini 3 Flash मॉडल — KVK/आधिकारिक पोर्टल से पुष्टि करें)"
                        }
                        return@withContext AssistantReplyOutcome(
                            replyText = answer,
                            sourceCitation = citation,
                            usedLiveAi = true,
                            fallbackNoticeHi = null
                        )
                    },
                    onFailure = { err ->
                        fallbackReason = "AI सेवा उपलब्ध नहीं है (${err.localizedMessage ?: "नेटवर्क/कुंजी त्रुटि"}) — ऑफ़लाइन संदर्भ पुस्तकालय से उत्तर दिखाया जा रहा है।"
                    }
                )
            }
        }

        // Deterministic, source-backed Hindi response from local reference library
        val (localText, localCitation) = when {
            qLower.contains("पीली") || qLower.contains("पीला") || qLower.contains("गेहूँ") || qLower.contains("wheat") -> {
                val article = AgriculturalKnowledgeBase.cropGuidanceLibrary.first()
                Pair(
                    "नमस्ते किसान जी, ${article.summaryHi}\n\n" +
                        "सुरक्षित अगले कदम:\n• ${article.cautiousStepsHi.joinToString("\n• ")}\n\n" +
                        "⚠️ सावधानी: ${article.safetyWarningHi}",
                    "स्रोत: ${article.sourceTier} — ${article.sourceOrg} (${article.lastReviewedDate})"
                )
            }
            qLower.contains("बीमा") || qLower.contains("योजना") || qLower.contains("किसान सम्मान") || qLower.contains("pmfby") || qLower.contains("pm-kisan") -> {
                val scheme = if (qLower.contains("बीमा")) {
                    AgriculturalKnowledgeBase.verifiedSchemes[1]
                } else {
                    AgriculturalKnowledgeBase.verifiedSchemes[0]
                }
                Pair(
                    "${scheme.nameHi}:\n${scheme.benefitSummaryHi}\n\n" +
                        "आवश्यक दस्तावेज़:\n• ${scheme.requiredDocumentsHi.joinToString("\n• ")}\n\n" +
                        "आधिकारिक पोर्टल: ${scheme.officialPortalUrl} | हेल्पलाइन: ${scheme.helplineNumber}\n" +
                        "नोट: अंतिम पात्रता की पुष्टि आधिकारिक पोर्टल पर ही होती है।",
                    "स्रोत: ऐप ऑफ़लाइन योजना संदर्भ (${scheme.sourceTier}, ${scheme.lastVerifiedDate})"
                )
            }
            qLower.contains("भाव") || qLower.contains("मंडी") || qLower.contains("बेच") || qLower.contains("msp") -> {
                val quote = AgriculturalKnowledgeBase.mandiQuotes.first()
                Pair(
                    "ऑफ़लाइन मंडी संदर्भ उदाहरण:\n" +
                        "• फसल: ${quote.cropNameHi} (${quote.varietyGrade})\n" +
                        "• उदाहरण मंडी: ${quote.mandiNameHi} — संदर्भ भाव: ₹${quote.modalPricePerQuintalInr.toInt()}/क्विंटल (${quote.mspSeasonLabelHi})।\n\n" +
                        "अपनी स्थानीय मंडी का आज का वास्तविक भाव डालकर भाड़ा व शुद्ध आय की गणना करने के लिए 'हिसाब' -> 'मंडी भाव और बिक्री' टैब खोलें।",
                    "स्रोत: ${quote.sourceLabel}"
                )
            }
            qLower.contains("माहू") || qLower.contains("सरसों") || qLower.contains("कीट") -> {
                val article = AgriculturalKnowledgeBase.cropGuidanceLibrary[3]
                Pair(
                    "${article.titleHi}:\n${article.summaryHi}\n\n" +
                        "सुरक्षित कदम:\n• ${article.cautiousStepsHi.joinToString("\n• ")}\n\n" +
                        "⚠️ ${article.safetyWarningHi}",
                    "स्रोत: ${article.sourceTier} — ${article.sourceOrg}"
                )
            }
            qLower.contains("आलू") || qLower.contains("झुलसा") -> {
                val article = AgriculturalKnowledgeBase.cropGuidanceLibrary[5]
                Pair(
                    "${article.titleHi}:\n${article.summaryHi}\n\n" +
                        "सुरक्षित कदम:\n• ${article.cautiousStepsHi.joinToString("\n• ")}\n\n" +
                        "⚠️ ${article.safetyWarningHi}",
                    "स्रोत: ${article.sourceTier} — ${article.sourceOrg}"
                )
            }
            else -> {
                Pair(
                    "नमस्ते किसान जी! आपके प्रश्न (\"$question\") के लिए ऑफ़लाइन संदर्भ सुझाव:\n\n" +
                        "1. यदि यह फसल के पत्तों या कीट की समस्या है, तो 'सलाह' -> 'फसल डॉक्टर' में पत्ते की साफ फोटो और लक्षण दर्ज करें।\n" +
                        "2. सरकारी योजनाओं की पात्रता और दस्तावेज़ देखने के लिए 'योजनाएँ' टैब खोलें।\n" +
                        "3. बिना पक्की पहचान के कोई तेज़ रासायनिक दवा न डालें। निःशुल्क सरकारी विशेषज्ञ सलाह के लिए किसान कॉल सेंटर 1800-180-1551 पर कॉल करें।",
                    "स्रोत: अमौरा ऑफ़लाइन स्थानीय कृषि संदर्भ पुस्तकालय"
                )
            }
        }

        AssistantReplyOutcome(
            replyText = localText,
            sourceCitation = localCitation,
            usedLiveAi = false,
            fallbackNoticeHi = fallbackReason
        )
    }

    // Multimodal Crop Doctor Analysis with Dynamic Confidence, Photo Persistence, Consent Check, and Explicit Error Surfacing
    suspend fun analyzeCropProblem(
        cropName: String,
        growthStage: String,
        symptoms: String,
        spreadScope: String,
        photoBitmap: Bitmap?,
        profile: FarmerProfile?
    ): CropDiagnosisOutcome = withContext(Dispatchers.IO) {
        val thumbnailBase64 = encodeThumbnailBase64(photoBitmap)
        val hasPhoto = photoBitmap != null
        val isLowResPhoto = photoBitmap != null && (photoBitmap.width < 220 || photoBitmap.height < 220)
        val consentAllowed = profile?.consentGiven == true

        var fallbackWarning: String? = null
        if (isLowResPhoto) {
            fallbackWarning = "फोटो का रिज़ॉल्यूशन कम (${photoBitmap?.width}x${photoBitmap?.height}px) है — पत्ती के बारीक लक्षण स्पष्ट न होने से आत्मविश्वास स्तर कम रखा गया है।"
        }

        if (!consentAllowed) {
            fallbackWarning = (fallbackWarning?.plus(" ") ?: "") +
                "डेटा सहमति बंद होने के कारण फोटो बाहरी AI को नहीं भेजी गई; ऑफ़लाइन संदर्भ पुस्तकालय से प्राथमिक विश्लेषण किया गया।"
        } else {
            val quotaErr = tryAcquireAiQuota()
            if (quotaErr != null) {
                fallbackWarning = quotaErr
            } else {
                val prompt = """
                    फसल डॉक्टर जाँच अनुरोध:
                    - फसल: $cropName
                    - अवस्था: $growthStage
                    - देखे गए लक्षण: $symptoms
                    - फैलाव: $spreadScope
                    - स्थान: ${profile?.districtName?.ifBlank { "अज्ञात" } ?: "अज्ञात"}, ${profile?.stateName?.ifBlank { "भारत" } ?: "भारत"}
                    
                    कृपया सरल हिंदी में 3 भागों में उत्तर दें (भागों को '|||' से अलग करें):
                    भाग 1 (आत्मविश्वास स्तर): केवल एक शब्द लिखें — LOW, MEDIUM, या HIGH (यदि फोटो धुंधली है या जानकारी कम है तो LOW लिखें)।
                    भाग 2 (संभावित कारण और विकल्प): कम से कम 2 संभावित कारण बताएं और स्पष्ट लिखें कि केवल फोटो/लक्षण से 100% पक्का कारण बताना संभव नहीं है, तथा किसान को खेत में आगे क्या जाँचना चाहिए।
                    भाग 3 (सुरक्षित अगले कदम और सावधानी): बिना पुष्टि के तेज़ रसायन या टैंक-मिक्स न डालने की सलाह दें, सुरक्षित निरीक्षण उपाय बताएं, और कब कृषि विशेषज्ञ (KVK / 1800-180-1551) से संपर्क करना चाहिए यह स्पष्ट करें।
                """.trimIndent()

                val aiResult = callGeminiTextOrMultimodal(
                    systemPrompt = "आप एक सतर्क कृषि पौध संरक्षण सहायक हैं। कभी भी बिना लेबल/विशेषज्ञ पुष्टि के खतरनाक रासायनिक खुराक न लिखें।",
                    userPrompt = prompt,
                    photoBitmap = photoBitmap
                )

                aiResult.fold(
                    onSuccess = { rawText ->
                        val parts = rawText.split("|||").map { it.trim() }
                        val parsedConfidence = when {
                            isLowResPhoto -> "LOW"
                            parts.size >= 3 && parts[0].uppercase().contains("HIGH") -> "HIGH"
                            parts.size >= 3 && parts[0].uppercase().contains("LOW") -> "LOW"
                            parts.size >= 3 && parts[0].uppercase().contains("MEDIUM") -> "MEDIUM"
                            hasPhoto && symptoms.length >= 25 -> "MEDIUM"
                            else -> "LOW"
                        }
                        val causes = (if (parts.size >= 3) parts[1] else parts.firstOrNull() ?: rawText).take(1400)
                        val steps = (if (parts.size >= 3) parts[2] else parts.getOrNull(1)
                            ?: "प्रभावित पत्ते के दोनों तरफ की जाँच करें और बिना पुष्टि के तेज़ रसायन न डालें। समस्या बढ़ने पर KVK विशेषज्ञ को दिखाएँ।").take(1400)

                        return@withContext CropDiagnosisOutcome(
                            likelyCauses = causes,
                            confidenceLevel = parsedConfidence,
                            safeNextSteps = steps,
                            photoThumbnailBase64 = thumbnailBase64,
                            usedLiveAi = true,
                            fallbackNoticeHi = fallbackWarning
                        )
                    },
                    onFailure = { err ->
                        fallbackWarning = (fallbackWarning?.plus(" ") ?: "") +
                            "AI विश्लेषण सेवा उपलब्ध नहीं हो सकी (${err.localizedMessage ?: "नेटवर्क/कुंजी त्रुटि"}) — ऑफ़लाइन संदर्भ पुस्तकालय से सुरक्षित सलाह दिखाई गई है।"
                    }
                )
            }
        }

        val (localCauses, localConfidence, localSteps) = AgriculturalKnowledgeBase.buildCautiousCropDiagnosis(
            cropName = cropName,
            growthStage = growthStage,
            symptoms = symptoms,
            spreadScope = spreadScope,
            hasPhoto = hasPhoto && !isLowResPhoto
        )
        CropDiagnosisOutcome(
            likelyCauses = localCauses,
            confidenceLevel = if (isLowResPhoto) "LOW" else localConfidence,
            safeNextSteps = localSteps,
            photoThumbnailBase64 = thumbnailBase64,
            usedLiveAi = false,
            fallbackNoticeHi = fallbackWarning
        )
    }
}
