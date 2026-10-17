package com.example.ui.screens

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Healing
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.model.AssistantMessage
import com.example.data.model.CropCase
import com.example.data.remote.FarmWeatherAdvisory
import com.example.data.remote.WeatherAndAiService
import com.example.ui.theme.CautionAmberBg
import com.example.ui.theme.CautionAmberText
import com.example.ui.theme.SafeGreenBg
import com.example.ui.theme.SafeGreenText
import com.example.ui.viewmodel.UiState

@Composable
fun AdviceScreen(
    initialSubTab: Int = 0,
    cropCasesState: UiState<List<CropCase>>,
    weatherState: UiState<FarmWeatherAdvisory>,
    messagesState: UiState<List<AssistantMessage>>,
    isCropDoctorBusy: Boolean,
    onSubmitCropDoctorCase: (String, String, String, String, Bitmap?) -> Unit,
    onEscalateToExpert: (CropCase, String) -> Unit,
    onResolveCaseByAdmin: (CropCase, String) -> Unit,
    onRefreshWeather: (String?) -> Unit
) {
    var selectedTab by rememberSaveable(initialSubTab) { mutableIntStateOf(initialSubTab) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                modifier = Modifier.testTag("advice_tab_crop_doctor"),
                text = { Text("फसल डॉक्टर") },
                icon = { Icon(Icons.Default.Healing, contentDescription = null) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                modifier = Modifier.testTag("advice_tab_weather"),
                text = { Text("मौसम और सलाह") },
                icon = { Icon(Icons.Default.WbSunny, contentDescription = null) }
            )
            Tab(
                selected = selectedTab == 2,
                onClick = { selectedTab = 2 },
                modifier = Modifier.testTag("advice_tab_expert_admin"),
                text = { Text("विशेषज्ञ व एडमिन") },
                icon = { Icon(Icons.Default.SupportAgent, contentDescription = null) }
            )
        }

        when (selectedTab) {
            0 -> CropDoctorTabContent(
                cropCasesState = cropCasesState,
                isCropDoctorBusy = isCropDoctorBusy,
                onSubmitCropDoctorCase = onSubmitCropDoctorCase,
                onEscalateToExpert = onEscalateToExpert
            )
            1 -> WeatherAdvisoryTabContent(
                weatherState = weatherState,
                onRefreshWeather = onRefreshWeather
            )
            2 -> ExpertAndKnowledgeAdminTabContent(
                cropCasesState = cropCasesState,
                messagesState = messagesState,
                onResolveCaseByAdmin = onResolveCaseByAdmin
            )
        }
    }
}

@Composable
private fun CropDoctorTabContent(
    cropCasesState: UiState<List<CropCase>>,
    isCropDoctorBusy: Boolean,
    onSubmitCropDoctorCase: (String, String, String, String, Bitmap?) -> Unit,
    onEscalateToExpert: (CropCase, String) -> Unit
) {
    val context = LocalContext.current
    var cropName by rememberSaveable { mutableStateOf("गेहूँ (Wheat)") }
    var growthStage by rememberSaveable { mutableStateOf("") }
    // Point 13 Fixed: Never pre-fill sample symptoms so farmers don't submit symptoms they didn't describe
    var symptoms by rememberSaveable { mutableStateOf("") }
    var spreadScope by rememberSaveable { mutableStateOf("कुछ पौधों में") }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var photoStatusWarning by remember { mutableStateOf<String?>(null) }
    var escalateTargetCase by remember { mutableStateOf<CropCase?>(null) }

    val cameraPreviewLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            capturedBitmap = bitmap
            photoStatusWarning = if (bitmap.width < 250 || bitmap.height < 250) {
                "कैमरा प्रीव्यू थंबनेल (${bitmap.width}x${bitmap.height}px) छोटा है। अधिक साफ विश्लेषण के लिए 'गैलरी से चुनें' द्वारा पूर्ण-रिज़ॉल्यूशन फोटो चुनें।"
            } else {
                null
            }
        } else {
            photoStatusWarning = "कैमरा से फोटो प्राप्त नहीं हुई।"
        }
    }

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        if (uri != null) {
            try {
                val bmp = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    val source = ImageDecoder.createSource(context.contentResolver, uri)
                    ImageDecoder.decodeBitmap(source) { decoder, _, _ ->
                        decoder.isMutableRequired = true
                    }
                } else {
                    @Suppress("DEPRECATION")
                    MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
                }
                capturedBitmap = bmp
                photoStatusWarning = "उच्च-रिज़ॉल्यूशन फोटो (${bmp.width}x${bmp.height}px) चुनी गई और केस इतिहास में सहेजी जाएगी।"
            } catch (e: Exception) {
                photoStatusWarning = "फोटो पढ़ने में त्रुटि: ${e.localizedMessage ?: "अमान्य इमेज"}"
            }
        }
    }

    val cases = (cropCasesState as? UiState.Success)?.data ?: emptyList()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CautionAmberBg)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        tint = CautionAmberText
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = "फसल डॉक्टर सुरक्षा नियम",
                            style = MaterialTheme.typography.titleMedium,
                            color = CautionAmberText,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "• साफ और पूर्ण-रिज़ॉल्यूशन फोटो के लिए फोन के मुख्य कैमरे से फोटो खींचकर 'गैलरी से चुनें' दबाएँ।\n• केवल फोटो से 100% पक्का निदान संभव नहीं है — बिना विशेषज्ञ पुष्टि के कोई तेज़ रसायन न डालें।",
                            style = MaterialTheme.typography.bodyMedium,
                            color = CautionAmberText
                        )
                    }
                }
            }
        }

        // Photo Capture & Context Input Form
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "1. फसल की तस्वीर और वास्तविक लक्षण दर्ज करें",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                photoPickerLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("crop_doctor_gallery_button"),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("साफ फोटो चुनें (HD)")
                        }
                        OutlinedButton(
                            onClick = { cameraPreviewLauncher.launch(null) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("crop_doctor_camera_button"),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("त्वरित कैमरा")
                        }
                    }

                    if (photoStatusWarning != null) {
                        Text(
                            text = photoStatusWarning ?: "",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    if (capturedBitmap != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(16.dp))
                        ) {
                            Image(
                                bitmap = capturedBitmap!!.asImageBitmap(),
                                contentDescription = "चुनी गई फसल की फोटो",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                            TextButton(
                                onClick = {
                                    capturedBitmap = null
                                    photoStatusWarning = null
                                },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .background(Color(0x99000000), RoundedCornerShape(12.dp))
                            ) {
                                Text("फोटो हटाएँ", color = Color.White)
                            }
                        }
                    }

                    Text(
                        text = "फसल चुनें:",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("गेहूँ (Wheat)", "धान (Paddy)", "सरसों (Mustard)", "आलू (Potato)", "चना (Chickpea)", "कपास (Cotton)").forEach { c ->
                            FilterChip(
                                selected = cropName == c,
                                onClick = { cropName = c },
                                label = { Text(c.substringBefore(" ")) }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = cropName,
                        onValueChange = { cropName = it },
                        label = { Text("फसल का नाम") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = growthStage,
                        onValueChange = { growthStage = it },
                        label = { Text("फसल की अवस्था (उदा: बुवाई से 25 दिन / फूल अवस्था)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Text(
                        text = "अपने खेत में दिख रहे लक्षण चुनें या नीचे लिखें:",
                        style = MaterialTheme.typography.labelMedium
                    )
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf(
                            "निचली पत्तियाँ पीली पड़ रही हैं",
                            "पत्ती पर पीला पाउडर और धारियाँ हैं",
                            "ऊपरी टहनियों पर छोटे माहू कीट हैं",
                            "पत्तियों पर काले-भूरे धब्बे (झुलसा)",
                            "बीच की गोभ सूख रही है"
                        ).forEach { chipSymptom ->
                            AssistChip(
                                onClick = {
                                    symptoms = if (symptoms.isBlank()) chipSymptom else "$symptoms, $chipSymptom"
                                },
                                label = { Text(chipSymptom) }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = symptoms,
                        onValueChange = { symptoms = it },
                        label = { Text("दिख रहे वास्तविक लक्षण यहाँ लिखें (अनिवार्य)") },
                        placeholder = { Text("पत्ती, तना या कीट के लक्षण अपने शब्दों में लिखें...") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("crop_doctor_symptoms_input")
                    )
                    OutlinedTextField(
                        value = spreadScope,
                        onValueChange = { spreadScope = it },
                        label = { Text("फैलाव (कुछ पौधों में या पूरे खेत में?)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            onSubmitCropDoctorCase(
                                cropName,
                                growthStage,
                                symptoms,
                                spreadScope,
                                capturedBitmap
                            )
                        },
                        enabled = !isCropDoctorBusy,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .testTag("crop_doctor_analyze_button"),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        if (isCropDoctorBusy) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("संभावित कारण और सुरक्षित सलाह देखें")
                        }
                    }
                }
            }
        }

        // Previous & Latest Crop Doctor Cases (with persisted photo thumbnails!)
        item {
            Text(
                text = "जाँच परिणाम और केस इतिहास (${cases.size})",
                style = MaterialTheme.typography.titleLarge
            )
        }

        if (cases.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Text(
                        text = "अभी कोई फसल समस्या जाँच दर्ज नहीं है। ऊपर अपनी फसल के लक्षण लिखकर या चिप चुनकर विश्लेषण करें।",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(cases, key = { it.id.ifBlank { it.symptoms.hashCode().toString() } }) { item ->
                val decodedPhotoBitmap = remember(item.photoBase64) {
                    if (item.photoBase64.isNotBlank()) {
                        try {
                            val bytes = Base64.decode(item.photoBase64, Base64.DEFAULT)
                            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        } catch (_: Exception) {
                            null
                        }
                    } else {
                        null
                    }
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${item.cropName} • ${item.growthStage}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Surface(
                                color = if (item.expertStatus != "NONE") SafeGreenBg else CautionAmberBg,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = when (item.expertStatus) {
                                        "RESOLVED" -> "समीक्षा पूर्ण (Resolved)"
                                        "ESCALATED" -> "KVK सारांश तैयार"
                                        else -> "आत्मविश्वास: ${item.confidenceLevel}"
                                    },
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (item.expertStatus != "NONE") SafeGreenText else CautionAmberText,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }

                        if (decodedPhotoBitmap != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Image(
                                bitmap = decodedPhotoBitmap.asImageBitmap(),
                                contentDescription = "सहेजी गई फसल फोटो",
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                                    .clip(RoundedCornerShape(14.dp)),
                                contentScale = ContentScale.Crop
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "लक्षण: ${item.symptoms} (${item.spreadScope})",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "संभावित कारण और विकल्प:",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = item.likelyCauses,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "सुरक्षित अगले कदम:",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = item.safeNextSteps,
                            style = MaterialTheme.typography.bodyLarge
                        )

                        if (item.expertNotes.isNotBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "नोट / स्थिति: ${item.expertNotes}",
                                style = MaterialTheme.typography.labelMedium,
                                color = SafeGreenText
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { escalateTargetCase = item },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("escalate_case_${item.id}")
                            ) {
                                Icon(Icons.Default.Share, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("KVK विशेषज्ञ हेतु सारांश साझा करें")
                            }
                            OutlinedButton(
                                onClick = {
                                    val dial = Intent(Intent.ACTION_DIAL, Uri.parse("tel:18001801551"))
                                    context.startActivity(dial)
                                }
                            ) {
                                Icon(Icons.Default.Call, contentDescription = null)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("1800-180-1551")
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }

    if (escalateTargetCase != null) {
        val target = escalateTargetCase!!
        var note by remember { mutableStateOf("कृपया इस फसल समस्या के लिए उचित मार्गदर्शन करें।") }
        AlertDialog(
            onDismissRequest = { escalateTargetCase = null },
            title = { Text("KVK विशेषज्ञ हेतु केस सारांश तैयार करें व साझा करें") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "पारदर्शिता सूचना: अमौरा ऐप के भीतर कोई निजी कॉल सेंटर नहीं है। 'सारांश तैयार और शेयर करें' दबाने पर यह केस आपके रिकॉर्ड में चिह्नित होगा और WhatsApp/SMS/Email खुला जाएगा ताकि आप इसे अपने नजदीकी KVK वैज्ञानिक को भेज सकें।",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        label = { Text("आपका अतिरिक्त नोट") }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onEscalateToExpert(target, note)
                        val shareReport = """
                            अमौरा फसल डॉक्टर केस सारांश (KVK परामर्श हेतु):
                            • फसल: ${target.cropName} (${target.growthStage})
                            • लक्षण: ${target.symptoms}
                            • फैलाव: ${target.spreadScope}
                            • प्राथमिक संभावित कारण: ${target.likelyCauses}
                            • किसान की टिप्पणी: $note
                        """.trimIndent()
                        val sendIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, shareReport)
                        }
                        context.startActivity(Intent.createChooser(sendIntent, "KVK विशेषज्ञ को केस भेजें"))
                        escalateTargetCase = null
                    }
                ) {
                    Text("सारांश तैयार और शेयर करें")
                }
            },
            dismissButton = {
                TextButton(onClick = { escalateTargetCase = null }) {
                    Text("रद्द करें")
                }
            }
        )
    }
}

@Composable
private fun WeatherAdvisoryTabContent(
    weatherState: UiState<FarmWeatherAdvisory>,
    onRefreshWeather: (String?) -> Unit
) {
    var districtQuery by rememberSaveable { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "भारत के किसी भी जिले या तहसील का लाइव मौसम खोजें",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = districtQuery,
                            onValueChange = { districtQuery = it },
                            placeholder = { Text("जिला लिखें (जैसे: गोरखपुर, हिसार, नागपुर, सीहोर)...") },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("weather_district_search_input"),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) }
                        )
                        Button(
                            onClick = { onRefreshWeather(districtQuery) },
                            modifier = Modifier.testTag("refresh_weather_button")
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("खोजें")
                        }
                    }
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        AgriculturalKnowledgeBase.supportedLocations.take(10).forEach { loc ->
                            AssistChip(
                                onClick = {
                                    districtQuery = loc.districtHi
                                    onRefreshWeather(loc.districtHi)
                                },
                                label = { Text(loc.districtHi) }
                            )
                        }
                    }
                }
            }
        }

        when (weatherState) {
            is UiState.Loading -> {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(20.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("आपके जिले का लाइव मौसम पूर्वानुमान प्राप्त किया जा रहा है...")
                        }
                    }
                }
            }
            is UiState.Error -> {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = CautionAmberBg)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = weatherState.message,
                                style = MaterialTheme.typography.bodyLarge,
                                color = CautionAmberText
                            )
                        }
                    }
                }
            }
            is UiState.Success -> {
                val adv = weatherState.data
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Text(
                                text = adv.locationLabelHi,
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "अवधि: ${adv.forecastWindowHi} • समय: ${adv.retrievedAtFormatted}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                WeatherMetricPill("तापमान", "${adv.currentTempC}°C")
                                WeatherMetricPill("नमी", "${adv.humidityPercent}%")
                                WeatherMetricPill("हवा", "${adv.windSpeedKmh} km/h")
                                WeatherMetricPill("3-दिन बारिश", "${adv.threeDayRainProbMaxPercent}%")
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = adv.uncertaintyNoteHi,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                text = adv.sourceAttributionHi,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                items(adv.taskRecommendations) { rec ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (rec.isCaution) CautionAmberBg else SafeGreenBg
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = rec.taskCategoryHi,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (rec.isCaution) CautionAmberText else SafeGreenText
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = rec.recommendationHi,
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.SemiBold,
                                color = if (rec.isCaution) CautionAmberText else SafeGreenText
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "यह सलाह क्यों दी गई: ${rec.reasonWhyHi}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (rec.isCaution) CautionAmberText else SafeGreenText
                            )
                        }
                    }
                }
            }
        }
        item { Spacer(modifier = Modifier.height(24.dp)) }
    }
}

@Composable
private fun WeatherMetricPill(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onPrimaryContainer
        )
    }
}

@Composable
private fun ExpertAndKnowledgeAdminTabContent(
    cropCasesState: UiState<List<CropCase>>,
    messagesState: UiState<List<AssistantMessage>>,
    onResolveCaseByAdmin: (CropCase, String) -> Unit
) {
    val context = LocalContext.current
    val cases = (cropCasesState as? UiState.Success)?.data ?: emptyList()
    val escalatedCases = cases.filter { it.expertStatus == "ESCALATED" || it.expertStatus == "RESOLVED" }
    val messages = (messagesState as? UiState.Success)?.data ?: emptyList()
    val flaggedMessages = messages.filter { it.flaggedHarmful }
    val remainingAiQuota = remember(messages.size, cases.size) { WeatherAndAiService.getRemainingAiQuota() }
    var reviewNoteInput by rememberSaveable { mutableStateOf("समीक्षा पूर्ण: पत्तियों की निचली सतह और जल निकासी की जांच करें; बिना KVK परीक्षण रसायन न मिलाएँ।") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "सत्यापित सरकारी किसान कॉल सेंटर (KCC)",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = "भारत सरकार का निःशुल्क किसान कॉल सेंटर (1800-180-1551) सुबह 6 बजे से रात 10 बजे तक सभी 7 दिन उपलब्ध है। नजदीकी कृषि विज्ञान केंद्र खोजने के लिए kvk.icar.gov.in देखें।",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:18001801551"))
                                context.startActivity(dialIntent)
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("1800-180-1551 पर कॉल करें")
                        }
                        OutlinedButton(
                            onClick = {
                                val webIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://kvk.icar.gov.in"))
                                context.startActivity(webIntent)
                            }
                        ) {
                            Text("आधिकारिक KVK पोर्टल")
                        }
                    }
                }
            }
        }

        // Interactive Admin & Audit Review Console (Fixes Audit Point 13)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.AdminPanelSettings,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "एडमिन एवं ऑडिट समीक्षा कंसोल (Admin Console)",
                            style = MaterialTheme.typography.titleLarge
                        )
                    }
                    Text(
                        text = "• ऑफ़लाइन योजना नियम: ${AgriculturalKnowledgeBase.verifiedSchemes.size} योजनाएँ\n" +
                            "• ऑफ़लाइन फसल मार्गदर्शन लेख: ${AgriculturalKnowledgeBase.cropGuidanceLibrary.size} लेख\n" +
                            "• प्रति-घंटे शेष AI कोटा (Rate Limit): $remainingAiQuota / 15 अनुरोध\n" +
                            "• तैयार किए गए KVK केस सारांश: ${escalatedCases.size}\n" +
                            "• चिह्नित संदिग्ध उत्तर (Flagged Answers): ${flaggedMessages.size}",
                        style = MaterialTheme.typography.bodyMedium
                    )

                    if (escalatedCases.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "KVK केस समीक्षा और समाधान टिप्पणी दर्ज करें:",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedTextField(
                            value = reviewNoteInput,
                            onValueChange = { reviewNoteInput = it },
                            label = { Text("विशेषज्ञ/समीक्षक समाधान टिप्पणी") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        escalatedCases.forEach { esc ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SafeGreenBg)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = "${esc.cropName} (${esc.expertStatus}) — ${esc.symptoms}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = SafeGreenText
                                    )
                                    Text(
                                        text = "वर्तमान नोट: ${esc.expertNotes}",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = SafeGreenText
                                    )
                                    if (esc.expertStatus != "RESOLVED") {
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Button(
                                            onClick = { onResolveCaseByAdmin(esc, reviewNoteInput) },
                                            modifier = Modifier.testTag("admin_resolve_case_${esc.id}")
                                        ) {
                                            Text("समीक्षा टिप्पणी सहेजें (Mark Resolved)")
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (flaggedMessages.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "चिह्नित संदिग्ध उत्तर ऑडिट सूची (${flaggedMessages.size}):",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                        flaggedMessages.forEach { flagged ->
                            Text(
                                text = "• [${flagged.topic}] ${flagged.messageText.take(120)}...",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                    }
                }
            }
        }

        // Local Crop Guidance Reference Library
        item {
            Text(
                text = "स्थानीय कृषि संदर्भ पुस्तकालय (${AgriculturalKnowledgeBase.cropGuidanceLibrary.size} लेख)",
                style = MaterialTheme.typography.titleLarge
            )
        }

        items(AgriculturalKnowledgeBase.cropGuidanceLibrary, key = { it.id }) { article ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Surface(
                            color = SafeGreenBg,
                            shape = RoundedCornerShape(50)
                        ) {
                            Text(
                                text = "${article.cropHi} • ${article.categoryHi}",
                                style = MaterialTheme.typography.labelMedium,
                                color = SafeGreenText,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "संदर्भ लेख",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = article.titleHi,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = article.summaryHi,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    article.cautiousStepsHi.forEach { step ->
                        Text(
                            text = "• $step",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "⚠️ सुरक्षा चेतावनी: ${article.safetyWarningHi}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                    Text(
                        text = "स्रोत: ${article.sourceOrg} (${article.sourceTier}) • ${article.lastReviewedDate}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }
}
