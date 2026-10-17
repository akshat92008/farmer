package com.example.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Grass
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.knowledge.AgriculturalKnowledgeBase
import com.example.data.model.CropCycle
import com.example.data.model.FarmReminder
import com.example.data.model.FarmerProfile
import com.example.ui.notifications.ReminderNotificationHelper
import com.example.ui.viewmodel.UiState

@Composable
fun MyFarmScreen(
    currentUserId: String,
    profileState: UiState<FarmerProfile?>,
    cropCyclesState: UiState<List<CropCycle>>,
    remindersState: UiState<List<FarmReminder>>,
    onSaveProfile: (FarmerProfile) -> Unit,
    onDeleteProfile: () -> Unit,
    onSeedSampleData: () -> Unit,
    onAddCropCycle: (String, String, String, Double, String, String, String, String, String) -> Unit,
    onDeleteCropCycle: (String) -> Unit,
    onAddReminder: (String, String, String, String) -> Unit,
    onUpdateReminderStatus: (FarmReminder, String) -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val profile = (profileState as? UiState.Success)?.data ?: FarmerProfile(userId = currentUserId)
    val crops = (cropCyclesState as? UiState.Success)?.data ?: emptyList()
    val reminders = (remindersState as? UiState.Success)?.data ?: emptyList()

    var showEditProfileDialog by rememberSaveable { mutableStateOf(false) }
    var showDeleteConfirmDialog by rememberSaveable { mutableStateOf(false) }
    var showAddCropDialog by rememberSaveable { mutableStateOf(false) }
    var showAddReminderDialog by rememberSaveable { mutableStateOf(false) }
    var pendingNotificationReminder by remember { mutableStateOf<FarmReminder?>(null) }

    val notificationPermLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        val rem = pendingNotificationReminder
        if (granted && rem != null) {
            ReminderNotificationHelper.sendReminderNotification(context, rem)
        }
        pendingNotificationReminder = null
    }

    val triggerReminderAlert: (FarmReminder) -> Unit = { rem ->
        if (ReminderNotificationHelper.hasNotificationPermission(context)) {
            ReminderNotificationHelper.sendReminderNotification(context, rem)
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pendingNotificationReminder = rem
            notificationPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))
            // 1. Farmer Profile & Privacy Controls Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "मेरी किसान प्रोफ़ाइल व गोपनीयता",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Row {
                            IconButton(
                                onClick = { showEditProfileDialog = true },
                                modifier = Modifier.testTag("edit_profile_button")
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = "प्रोफ़ाइल बदलें")
                            }
                            TextButton(
                                onClick = onSignOut,
                                modifier = Modifier.testTag("sign_out_button")
                            ) {
                                Text("लॉगआउट")
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    val locationDisplay = if (profile.districtName.isNotBlank()) {
                        "${profile.districtName}, ${profile.stateName}"
                    } else {
                        "जिला अभी दर्ज नहीं है (कृपया सेट करें)"
                    }
                    Text(
                        text = "नाम: ${profile.farmerName} • स्थान: $locationDisplay",
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = "कुल भूमि: ${profile.landSizeAcres} एकड़ • सिंचाई: ${profile.irrigationType}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "AI डेटा सहमति: ${if (profile.consentGiven) "हाँ (सक्रिय)" else "नहीं (ऑफ़लाइन मोड)"} • e-KYC: ${if (profile.hasAadhaarEkyc) "पूर्ण" else "अपूर्ण"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = { showEditProfileDialog = true }
                        ) {
                            Text("प्रोफ़ाइल व जिला सेट करें")
                        }
                        TextButton(
                            onClick = { showDeleteConfirmDialog = true },
                            modifier = Modifier.testTag("delete_profile_button")
                        ) {
                            Text("सारा डेटा हटाएँ", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }

        // Optional Starter Data Loader when farm is empty (Moved off Home Screen per Audit Point 19)
        if (crops.isEmpty() && profile.districtName.isBlank()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.AutoAwesome,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.secondary
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "उदाहरण खेत डेटा से परीक्षण करें",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "अतीत की बुवाई तिथियों (21 दिन पूर्व गेहूँ व 32 दिन पूर्व सरसों) और प्रति-खेत खर्च का उदाहरण लोड करें।",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                        OutlinedButton(
                            onClick = onSeedSampleData,
                            modifier = Modifier.testTag("seed_sample_data_button")
                        ) {
                            Text("लोड करें")
                        }
                    }
                }
            }
        }

        // 2. Active Crops & Fields Section
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Grass,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "मेरे खेत और फसलें (${crops.size})",
                        style = MaterialTheme.typography.titleLarge
                    )
                }
                Button(
                    onClick = { showAddCropDialog = true },
                    modifier = Modifier.testTag("add_crop_cycle_button"),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("फसल जोड़ें")
                }
            }
        }

        if (crops.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Text(
                        text = "अभी कोई खेत या फसल दर्ज नहीं है। 'फसल जोड़ें' दबाकर अपने खेत का नाम, बुवाई की तारीख और फसल दर्ज करें।",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(crops, key = { it.id.ifBlank { it.fieldName + it.cropName } }) { cycle ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${cycle.cropName} — ${cycle.varietyName}",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "खेत: ${cycle.fieldName} • रकबा: ${cycle.areaAcres} एकड़ (${cycle.season})",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            IconButton(onClick = { onDeleteCropCycle(cycle.id) }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "हटाएँ",
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "बुवाई तिथि: ${cycle.sowingDate} • अवस्था: ${cycle.growthStage}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        if (cycle.notes.isNotBlank()) {
                            Text(
                                text = "नोट: ${cycle.notes}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        // 3. Crop Calendar & Daily Tasks ("खेती का कैलेंडर") with Real Notification Alerts
        item {
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.EventNote,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "खेती का कैलेंडर (${reminders.size})",
                        style = MaterialTheme.typography.titleLarge
                    )
                }
                OutlinedButton(
                    onClick = { showAddReminderDialog = true },
                    modifier = Modifier.testTag("add_reminder_button"),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("नया काम")
                }
            }
        }

        if (reminders.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Text(
                        text = "खेती कैलेंडर में अभी कोई कार्य नहीं है। जब आप कोई फसल जोड़ते हैं तो सिंचाई व देखभाल के कार्य अपने-आप जुड़ जाते हैं।",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(reminders, key = { it.id.ifBlank { it.taskTitle } }) { rem ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = when (rem.status) {
                            "COMPLETED" -> Color(0xFFD8F3DC).copy(alpha = 0.55f)
                            "SKIPPED" -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                            else -> MaterialTheme.colorScheme.surface
                        }
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = "${rem.cropName} • समय: ${rem.dueDate}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (rem.status == "PENDING") {
                                    IconButton(
                                        onClick = { triggerReminderAlert(rem) },
                                        modifier = Modifier.testTag("notify_reminder_${rem.id}")
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.NotificationsActive,
                                            contentDescription = "रिमाइंडर नोटिफिकेशन भेजें",
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                                Text(
                                    text = when (rem.status) {
                                        "COMPLETED" -> "✓ पूरा हुआ"
                                        "SKIPPED" -> "छोड़ा गया"
                                        else -> "बाकी है"
                                    },
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = rem.taskTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "क्यों सुझाया गया: ${rem.whySuggested}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterChip(
                                selected = rem.status == "COMPLETED",
                                onClick = { onUpdateReminderStatus(rem, "COMPLETED") },
                                label = { Text("पूरा किया") },
                                leadingIcon = {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                                }
                            )
                            FilterChip(
                                selected = rem.status == "SKIPPED",
                                onClick = { onUpdateReminderStatus(rem, "SKIPPED") },
                                label = { Text("लागू नहीं / छोड़ें") }
                            )
                            if (rem.status != "PENDING") {
                                FilterChip(
                                    selected = false,
                                    onClick = { onUpdateReminderStatus(rem, "PENDING") },
                                    label = { Text("वापस बाकी में रखें") }
                                )
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }

    if (showDeleteConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = false },
            title = { Text("क्या आप अपना सारा डेटा हटाना चाहते हैं?") },
            text = {
                Text(
                    "यह कार्रवाई आपकी किसान प्रोफ़ाइल, सभी फसल चक्र (Crop Cycles), फसल डॉक्टर केस इतिहास, खर्च का हिसाब, कैलेंडर रिमाइंडर और सहेजे गए सभी सवाल-जवाब स्थायी रूप से हटा देगी।"
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteProfile()
                        showDeleteConfirmDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("हाँ, सब कुछ स्थायी रूप से हटाएँ")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = false }) {
                    Text("रद्द करें")
                }
            }
        )
    }

    if (showEditProfileDialog) {
        EditFarmerProfileDialog(
            initial = profile,
            onDismiss = { showEditProfileDialog = false },
            onSave = { updated ->
                onSaveProfile(updated)
                showEditProfileDialog = false
            }
        )
    }

    if (showAddCropDialog) {
        AddCropCycleDialog(
            onDismiss = { showAddCropDialog = false },
            onConfirm = { field, crop, variety, area, season, sowing, stage, irrig, notes ->
                onAddCropCycle(field, crop, variety, area, season, sowing, stage, irrig, notes)
                showAddCropDialog = false
            }
        )
    }

    if (showAddReminderDialog) {
        AddReminderDialog(
            onDismiss = { showAddReminderDialog = false },
            onConfirm = { crop, title, why, due ->
                onAddReminder(crop, title, why, due)
                showAddReminderDialog = false
            }
        )
    }
}

@Composable
private fun EditFarmerProfileDialog(
    initial: FarmerProfile,
    onDismiss: () -> Unit,
    onSave: (FarmerProfile) -> Unit
) {
    var name by remember { mutableStateOf(initial.farmerName) }
    var stateText by remember { mutableStateOf(initial.stateName) }
    var districtText by remember { mutableStateOf(initial.districtName) }
    var village by remember { mutableStateOf(initial.villageName) }
    var acresText by remember { mutableStateOf(if (initial.landSizeAcres > 0.0) initial.landSizeAcres.toString() else "") }
    var irrigation by remember {
        mutableStateOf(
            if (initial.irrigationType == "सिंचाई स्रोत चुनें") "नहर और ट्यूबवेल" else initial.irrigationType
        )
    }
    var soil by remember { mutableStateOf(initial.soilType) }
    var voiceEnabled by remember { mutableStateOf(initial.voiceEnabled) }
    var consentGiven by remember { mutableStateOf(initial.consentGiven) }
    var hasEkyc by remember { mutableStateOf(initial.hasAadhaarEkyc) }
    var isTaxPayer by remember { mutableStateOf(initial.isIncomeTaxPayer) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("किसान प्रोफ़ाइल, पात्रता और सहमति") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("किसान का नाम") },
                    singleLine = true
                )
                Text(
                    text = "त्वरित जिला चुनें या नीचे अपना कोई भी जिला लिखें:",
                    style = MaterialTheme.typography.labelMedium
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    AgriculturalKnowledgeBase.supportedLocations.forEach { loc ->
                        AssistChip(
                            onClick = {
                                districtText = loc.districtHi
                                stateText = loc.stateHi
                            },
                            label = { Text(loc.districtHi) }
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = districtText,
                        onValueChange = { districtText = it },
                        label = { Text("आपका जिला (कोई भी)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = stateText,
                        onValueChange = { stateText = it },
                        label = { Text("राज्य") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = acresText,
                        onValueChange = { acresText = it },
                        label = { Text("कुल भूमि (एकड़)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = village,
                        onValueChange = { village = it },
                        label = { Text("गाँव/तहसील") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                OutlinedTextField(
                    value = irrigation,
                    onValueChange = { irrigation = it },
                    label = { Text("सिंचाई का साधन (जैसे नहर, बोरवेल, वर्षा आधारित)") },
                    singleLine = true
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("AI डेटा साझाकरण सहमति (फोटो व जिला)", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = consentGiven, onCheckedChange = { consentGiven = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("आधार e-KYC व बैंक DBT सीडिंग पूर्ण", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = hasEkyc, onCheckedChange = { hasEkyc = it })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("क्या परिवार में कोई आयकर दाता है?", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = isTaxPayer, onCheckedChange = { isTaxPayer = it })
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(
                        initial.copy(
                            farmerName = name.ifBlank { "किसान साथी" },
                            stateName = stateText.trim(),
                            districtName = districtText.trim(),
                            villageName = village.trim(),
                            landSizeAcres = acresText.toDoubleOrNull()?.coerceIn(0.0, 10000.0) ?: 0.0,
                            irrigationType = irrigation.ifBlank { "सिंचाई स्रोत चुनें" },
                            soilType = soil.ifBlank { "दोमट मिट्टी" },
                            voiceEnabled = voiceEnabled,
                            consentGiven = consentGiven,
                            hasAadhaarEkyc = hasEkyc,
                            isIncomeTaxPayer = isTaxPayer
                        )
                    )
                }
            ) {
                Text("सहेजें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}

@Composable
private fun AddCropCycleDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, Double, String, String, String, String, String) -> Unit
) {
    var fieldName by remember { mutableStateOf("") }
    var cropName by remember { mutableStateOf("गेहूँ (Wheat)") }
    var variety by remember { mutableStateOf("") }
    var areaText by remember { mutableStateOf("1.5") }
    var season by remember { mutableStateOf("Rabi") }
    var sowingDate by remember { mutableStateOf("") }
    var growthStage by remember { mutableStateOf("बुवाई / अंकुरण") }
    var notes by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("नई फसल और खेत जोड़ें") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = fieldName,
                    onValueChange = { fieldName = it },
                    label = { Text("खेत का नाम (उदा: पूर्वी खेत)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = cropName,
                    onValueChange = { cropName = it },
                    label = { Text("फसल का नाम (जैसे गेहूँ, धान, सरसों)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = variety,
                    onValueChange = { variety = it },
                    label = { Text("बीज की किस्म (वैकल्पिक)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = areaText,
                    onValueChange = { areaText = it },
                    label = { Text("रकबा (एकड़ में)") },
                    singleLine = true
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Rabi", "Kharif", "Zaid").forEach { s ->
                        FilterChip(
                            selected = season == s,
                            onClick = { season = s },
                            label = { Text(s) }
                        )
                    }
                }
                OutlinedTextField(
                    value = sowingDate,
                    onValueChange = { sowingDate = it },
                    label = { Text("बुवाई की तारीख (खाली छोड़ने पर आज की तारीख)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = growthStage,
                    onValueChange = { growthStage = it },
                    label = { Text("वर्तमान अवस्था") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("विशेष टिप्पणी (वैकल्पिक)") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onConfirm(
                        fieldName.ifBlank { "मुख्य खेत" },
                        cropName,
                        variety.ifBlank { "प्रमाणित किस्म" },
                        areaText.toDoubleOrNull() ?: 1.0,
                        season,
                        sowingDate,
                        growthStage,
                        "ट्यूबवेल / नहर",
                        notes
                    )
                }
            ) {
                Text("जोड़ें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}

@Composable
private fun AddReminderDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, String) -> Unit
) {
    var cropName by remember { mutableStateOf("गेहूँ (Wheat)") }
    var taskTitle by remember { mutableStateOf("") }
    var whySuggested by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf("इस सप्ताह") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("खेती कैलेंडर में नया कार्य जोड़ें") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = cropName,
                    onValueChange = { cropName = it },
                    label = { Text("फसल का नाम") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = taskTitle,
                    onValueChange = { taskTitle = it },
                    label = { Text("क्या काम करना है? (जैसे: पहली सिंचाई)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = whySuggested,
                    onValueChange = { whySuggested = it },
                    label = { Text("यह काम क्यों ज़रूरी है?") }
                )
                OutlinedTextField(
                    value = dueDate,
                    onValueChange = { dueDate = it },
                    label = { Text("कब करना है? (तारीख/अवधि)") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (taskTitle.isNotBlank()) {
                        onConfirm(cropName, taskTitle, whySuggested, dueDate)
                    }
                }
            ) {
                Text("जोड़ें")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("रद्द करें") }
        }
    )
}
