package com.example.ui.screens

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PrivacyTip
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.model.AssistantMessage
import com.example.data.model.FarmReminder
import com.example.data.model.FarmerProfile
import com.example.ui.theme.CautionAmberBg
import com.example.ui.theme.CautionAmberText
import com.example.ui.theme.SafeGreenBg
import com.example.ui.theme.SafeGreenText
import com.example.ui.viewmodel.UiState

@Composable
fun HomeScreen(
    profileState: UiState<FarmerProfile?>,
    remindersState: UiState<List<FarmReminder>>,
    messagesState: UiState<List<AssistantMessage>>,
    isAssistantBusy: Boolean,
    onAskQuestion: (String) -> Unit,
    onSpeakText: (String) -> Unit,
    onFlagMessage: (AssistantMessage) -> Unit,
    onUpdateConsent: (Boolean) -> Unit,
    onSendReminderNotification: (FarmReminder) -> Unit,
    onNavigateToCropDoctor: () -> Unit,
    onNavigateToWeather: () -> Unit,
    onNavigateToSchemes: () -> Unit,
    onNavigateToAccounts: () -> Unit,
    onNavigateToMyFarm: () -> Unit
) {
    var questionInput by rememberSaveable { mutableStateOf("") }
    var searchHistoryQuery by rememberSaveable { mutableStateOf("") }
    var voiceStatusNotice by remember { mutableStateOf<String?>(null) }

    // System Speech Recognizer does NOT require host app RECORD_AUDIO permission
    val speechLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val spoken = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!spoken.isNullOrBlank()) {
                questionInput = spoken
                onAskQuestion(spoken)
            }
        }
    }

    val launchVoiceInput = {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN")
                putExtra(RecognizerIntent.EXTRA_PROMPT, "अपनी समस्या हिंदी में बोलें...")
            }
            speechLauncher.launch(intent)
        } catch (_: Exception) {
            voiceStatusNotice = "इस डिवाइस पर सिस्टम वॉइस इनपुट उपलब्ध नहीं है — कृपया नीचे लिखें या उदाहरण चुनें।"
        }
    }

    val profile = (profileState as? UiState.Success)?.data
    val pendingReminders = ((remindersState as? UiState.Success)?.data ?: emptyList())
        .filter { it.status == "PENDING" }
    val messages = (messagesState as? UiState.Success)?.data ?: emptyList()

    val filteredMessages = remember(messages, searchHistoryQuery) {
        if (searchHistoryQuery.isBlank()) {
            messages.takeLast(12).reversed()
        } else {
            messages.filter {
                it.messageText.contains(searchHistoryQuery, ignoreCase = true) ||
                    it.topic.contains(searchHistoryQuery, ignoreCase = true)
            }.reversed()
        }
    }

    val locationSubtitle = if (profile != null && profile.districtName.isNotBlank()) {
        "${profile.districtName}, ${profile.stateName.ifBlank { "भारत" }} • ${profile.landSizeAcres} एकड़"
    } else {
        "जिला अभी चयनित नहीं है — 'मेरी खेती' में अपना जिला सेट करें"
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            // Hero Greeting Banner
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToMyFarm() },
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(165.dp)
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_hero_farm_banner),
                        contentDescription = "खेती बैनर",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color(0x55081C15), Color(0xDD081C15))
                                )
                            )
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(18.dp)
                    ) {
                        Text(
                            text = "नमस्ते ${profile?.farmerName ?: "किसान जी"}",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color(0xFFE9C46A)
                        )
                        Text(
                            text = "आज आपकी खेती में क्या मदद करें?",
                            style = MaterialTheme.typography.headlineMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = locationSubtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFFD8F3DC)
                        )
                    }
                }
            }
        }

        // Explicit AI & Data Privacy Consent Control (Fixes Audit Point 9)
        item {
            val consentOn = profile?.consentGiven == true
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (consentOn) SafeGreenBg else CautionAmberBg
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.PrivacyTip,
                            contentDescription = null,
                            tint = if (consentOn) SafeGreenText else CautionAmberText
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = if (consentOn) {
                                    "AI डेटा सहमति: चालू (Gemini AI + स्थानीय संदर्भ)"
                                } else {
                                    "AI डेटा सहमति: बंद (100% ऑफ़लाइन स्थानीय मोड)"
                                },
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (consentOn) SafeGreenText else CautionAmberText
                            )
                            Text(
                                text = if (consentOn) {
                                    "फसल फोटो और जिले का संदर्भ बेहतर AI सुझाव के लिए उपयोग हो रहा है।"
                                } else {
                                    "आपकी कोई भी फोटो या जिला बाहरी AI को नहीं भेजा जा रहा है।"
                                },
                                style = MaterialTheme.typography.labelMedium,
                                color = if (consentOn) SafeGreenText else CautionAmberText
                            )
                        }
                    }
                    Switch(
                        checked = consentOn,
                        onCheckedChange = { onUpdateConsent(it) },
                        modifier = Modifier.testTag("home_consent_switch")
                    )
                }
            }
        }

        // Active Crop Calendar Due Task Banner with Notification Trigger (Fixes Audit Point 8)
        if (pendingReminders.isNotEmpty()) {
            val topReminder = pendingReminders.first()
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.7f)
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.weight(1f),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.EventNote,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.secondary
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "खेती कैलेंडर अनुस्मारक (${pendingReminders.size} कार्य बाकी)",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                                Text(
                                    text = "${topReminder.cropName}: ${topReminder.taskTitle} (${topReminder.dueDate})",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSecondaryContainer
                                )
                            }
                        }
                        IconButton(
                            onClick = { onSendReminderNotification(topReminder) },
                            modifier = Modifier.testTag("home_notify_reminder_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.NotificationsActive,
                                contentDescription = "फ़ोन अलर्ट भेजें",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }
        }

        // Prominent Voice Assistant Card ("बोलकर पूछें")
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.7f)
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "बोलकर या लिखकर पूछें",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                text = "अपनी भाषा में सवाल पूछें और स्पीकर से उत्तर सुनें",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                            )
                        }
                        Button(
                            onClick = launchVoiceInput,
                            modifier = Modifier
                                .height(50.dp)
                                .testTag("voice_input_button"),
                            shape = RoundedCornerShape(50),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.secondary
                            )
                        ) {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "बोलकर पूछें"
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("बोलें")
                        }
                    }

                    if (voiceStatusNotice != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = voiceStatusNotice ?: "",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.secondary
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = questionInput,
                        onValueChange = { questionInput = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("assistant_question_input"),
                        placeholder = {
                            Text("उदाहरण: “मेरी गेहूँ की पत्तियाँ पीली हो रही हैं, क्या करूँ?”")
                        },
                        shape = RoundedCornerShape(16.dp),
                        trailingIcon = {
                            IconButton(
                                onClick = {
                                    if (questionInput.isNotBlank()) {
                                        onAskQuestion(questionInput)
                                        questionInput = ""
                                    }
                                },
                                enabled = !isAssistantBusy && questionInput.isNotBlank(),
                                modifier = Modifier.testTag("assistant_send_button")
                            ) {
                                if (isAssistantBusy) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(22.dp),
                                        strokeWidth = 2.dp
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.AutoMirrored.Filled.Send,
                                        contentDescription = "पूछें",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val quickPrompts = listOf(
                            "मेरी गेहूँ की पत्तियाँ पीली हो रही हैं, क्या करूँ?",
                            "क्या मैं फसल बीमा योजना के लिए पात्र हूँ?",
                            "सरसों में माहू कीट से बचाव कैसे करें?",
                            "गेहूँ का MSP और मंडी शुद्ध आय कैसे निकालें?"
                        )
                        quickPrompts.forEachIndexed { idx, prompt ->
                            AssistChip(
                                onClick = { onAskQuestion(prompt) },
                                label = { Text(prompt) },
                                modifier = Modifier.testTag("quick_prompt_$idx"),
                                colors = AssistChipDefaults.assistChipColors(
                                    containerColor = MaterialTheme.colorScheme.surface
                                )
                            )
                        }
                    }
                }
            }
        }

        // 4 Primary Action Cards
        item {
            Text(
                text = "प्रमुख सेवाएँ",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    HomeActionTile(
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home_crop_doctor_card"),
                        icon = Icons.Default.PhotoCamera,
                        badgeColor = Color(0xFF2D6A4F),
                        titleHi = "फसल डॉक्टर",
                        subtitleHi = "पत्ते की फोटो व सुरक्षित सलाह",
                        onClick = onNavigateToCropDoctor
                    )
                    HomeActionTile(
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home_weather_card"),
                        icon = Icons.Default.WbSunny,
                        badgeColor = Color(0xFFD97706),
                        titleHi = "मौसम और सलाह",
                        subtitleHi = "किसी भी जिले का लाइव मौसम",
                        onClick = onNavigateToWeather
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    HomeActionTile(
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home_schemes_card"),
                        icon = Icons.Default.AccountBalance,
                        badgeColor = Color(0xFF1D4ED8),
                        titleHi = "सरकारी योजनाएँ",
                        subtitleHi = "8 योजनाएँ, पात्रता व दस्तावेज़",
                        onClick = onNavigateToSchemes
                    )
                    HomeActionTile(
                        modifier = Modifier
                            .weight(1f)
                            .testTag("home_accounts_card"),
                        icon = Icons.Default.Calculate,
                        badgeColor = Color(0xFFB45309),
                        titleHi = "खर्च और मंडी भाव",
                        subtitleHi = "प्रति-खेत लागत व शुद्ध आय",
                        onClick = onNavigateToAccounts
                    )
                }
            }
        }

        // Conversation History & Search
        item {
            Text(
                text = "पिछले सवाल और सलाह (${messages.size})",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            if (messages.isNotEmpty()) {
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = searchHistoryQuery,
                    onValueChange = { searchHistoryQuery = it },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("search_history_input"),
                    leadingIcon = {
                        Icon(Icons.Default.Search, contentDescription = "खोजें")
                    },
                    placeholder = { Text("पुराने सवाल या सलाह खोजें...") },
                    shape = RoundedCornerShape(14.dp),
                    singleLine = true
                )
            }
        }

        if (filteredMessages.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "अभी कोई बातचीत दर्ज नहीं है।",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "ऊपर माइक दबाकर बोलें या किसी उदाहरण प्रश्न को चुनें।",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            items(filteredMessages, key = { it.id.ifBlank { it.messageText.hashCode().toString() } }) { msg ->
                AssistantMessageCard(
                    msg = msg,
                    onSpeakText = onSpeakText,
                    onFlagMessage = onFlagMessage
                )
            }
        }

        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                )
            ) {
                Text(
                    text = "पारदर्शिता एवं सुरक्षा सूचना: यह स्वतंत्र निर्णय-सहायता ऐप है। किसी भी सरकारी योजना या मंडी भाव की अंतिम पुष्टि आधिकारिक सरकारी पोर्टल से करें। Firebase App Check एवं प्रति-उपयोगकर्ता AI कोटा सक्रिय है।",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(12.dp)
                )
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun HomeActionTile(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    badgeColor: Color,
    titleHi: String,
    subtitleHi: String,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(badgeColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = titleHi,
                    tint = badgeColor,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = titleHi,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = subtitleHi,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun AssistantMessageCard(
    msg: AssistantMessage,
    onSpeakText: (String) -> Unit,
    onFlagMessage: (AssistantMessage) -> Unit
) {
    val isUser = msg.role == "USER"
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isUser) {
                MaterialTheme.colorScheme.surfaceVariant
            } else {
                MaterialTheme.colorScheme.surface
            }
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isUser) 0.dp else 2.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    color = if (isUser) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color(0xFFD8F3DC),
                    shape = RoundedCornerShape(50)
                ) {
                    Text(
                        text = if (isUser) "आपका सवाल (${msg.topic})" else "किसान सहायक उत्तर",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color(0xFF1B4332),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                    )
                }

                if (!isUser) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = { onSpeakText(msg.messageText) },
                            modifier = Modifier.testTag("speak_message_${msg.id}")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = "उत्तर सुनें",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        IconButton(
                            onClick = { onFlagMessage(msg) },
                            modifier = Modifier.testTag("flag_message_${msg.id}")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Flag,
                                contentDescription = "संदिग्ध उत्तर चिह्नित करें",
                                tint = if (msg.flaggedHarmful) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = msg.messageText,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface
            )

            if (msg.sourceCitation.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = msg.sourceCitation,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            if (msg.flaggedHarmful) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "⚠️ आपने इस उत्तर को अपने ऑडिट लॉग में संदिग्ध के रूप में चिह्नित किया है — कृपया 1800-180-1551 से पुष्टि करें।",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.error
                )
            }
        }
    }
}
