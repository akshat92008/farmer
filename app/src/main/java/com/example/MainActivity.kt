package com.example

import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Healing
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Agriculture
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.Healing
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.lifecycle.ViewModelProvider.AndroidViewModelFactory.Companion.APPLICATION_KEY
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.example.data.repository.AmauraRepository
import com.example.ui.notifications.ReminderNotificationHelper
import com.example.ui.screens.AccountsAndMandiScreen
import com.example.ui.screens.AdviceScreen
import com.example.ui.screens.AuthScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.MyFarmScreen
import com.example.ui.screens.SchemesScreen
import com.example.ui.screens.signOut
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.AmauraViewModel
import com.google.firebase.Firebase
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.auth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import java.util.Locale

internal fun FirebaseAuth.authStateFlow(): Flow<FirebaseUser?> = callbackFlow {
    val listener = FirebaseAuth.AuthStateListener { auth ->
        trySend(auth.currentUser)
    }
    addAuthStateListener(listener)
    awaitClose { removeAuthStateListener(listener) }
}

enum class PrimaryDestination(
    val routeId: String,
    val labelHi: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    val testTag: String
) {
    HOME("home", "होम", Icons.Filled.Home, Icons.Outlined.Home, "nav_home"),
    MY_FARM("my_farm", "मेरी खेती", Icons.Filled.Agriculture, Icons.Outlined.Agriculture, "nav_my_farm"),
    ADVICE("advice", "सलाह", Icons.Filled.Healing, Icons.Outlined.Healing, "nav_advice"),
    SCHEMES("schemes", "योजनाएँ", Icons.Filled.AccountBalance, Icons.Outlined.AccountBalance, "nav_schemes"),
    ACCOUNTS("accounts", "हिसाब", Icons.Filled.Calculate, Icons.Outlined.Calculate, "nav_accounts")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Initialize Firebase App Check (Fixes Audit Point 8)
        try {
            val firebaseAppCheck = FirebaseAppCheck.getInstance()
            if (BuildConfig.DEBUG) {
                firebaseAppCheck.installAppCheckProviderFactory(
                    DebugAppCheckProviderFactory.getInstance()
                )
            }
        } catch (_: Exception) {
        }
        ReminderNotificationHelper.ensureChannelCreated(this)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                AmauraAppRoot()
            }
        }
    }
}

@Composable
fun AmauraAppRoot(auth: FirebaseAuth = Firebase.auth) {
    val currentUser by auth.authStateFlow().collectAsStateWithLifecycle(initialValue = auth.currentUser)
    val user = currentUser
    if (user == null) {
        AuthScreen(onAuthSuccess = {})
    } else {
        AmauraAuthenticatedShell(currentUserId = user.uid)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AmauraAuthenticatedShell(currentUserId: String) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }

    val viewModel: AmauraViewModel = viewModel(
        key = currentUserId,
        factory = viewModelFactory {
            initializer {
                val app = checkNotNull(this[APPLICATION_KEY]) {
                    "APPLICATION_KEY missing from CreationExtras"
                }
                val databaseId = app.getString(R.string.firestore_database_id)
                val db = FirebaseFirestore.getInstance(databaseId)
                AmauraViewModel(AmauraRepository(db), currentUserId)
            }
        }
    )

    var ttsEngine by remember { mutableStateOf<TextToSpeech?>(null) }
    DisposableEffect(context) {
        var instance: TextToSpeech? = null
        instance = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                instance?.language = Locale.forLanguageTag("hi-IN")
            }
        }
        ttsEngine = instance
        onDispose {
            instance?.stop()
            instance?.shutdown()
        }
    }

    val speakOutLoud: (String) -> Unit = { text ->
        ttsEngine?.speak(
            text.replace("*", "").replace("#", ""),
            TextToSpeech.QUEUE_FLUSH,
            null,
            "amaura_tts_utterance"
        )
    }

    val latestSpokenReply by viewModel.latestSpokenReply.collectAsStateWithLifecycle()
    LaunchedEffect(latestSpokenReply) {
        val reply = latestSpokenReply
        if (!reply.isNullOrBlank()) {
            speakOutLoud(reply)
            viewModel.clearSpokenReply()
        }
    }

    val profileState by viewModel.profileState.collectAsStateWithLifecycle()
    val cropCyclesState by viewModel.cropCyclesState.collectAsStateWithLifecycle()
    val cropCasesState by viewModel.cropCasesState.collectAsStateWithLifecycle()
    val transactionsState by viewModel.transactionsState.collectAsStateWithLifecycle()
    val remindersState by viewModel.remindersState.collectAsStateWithLifecycle()
    val messagesState by viewModel.messagesState.collectAsStateWithLifecycle()
    val weatherState by viewModel.weatherState.collectAsStateWithLifecycle()
    val isAssistantBusy by viewModel.isAssistantBusy.collectAsStateWithLifecycle()
    val isCropDoctorBusy by viewModel.isCropDoctorBusy.collectAsStateWithLifecycle()
    val statusBanner by viewModel.statusBanner.collectAsStateWithLifecycle()

    var currentDestination by rememberSaveable { mutableStateOf(PrimaryDestination.HOME) }
    var adviceSubTab by rememberSaveable { mutableIntStateOf(0) }

    if (currentDestination != PrimaryDestination.HOME) {
        BackHandler {
            currentDestination = PrimaryDestination.HOME
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = stringResource(R.string.app_header_title_hi),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = stringResource(R.string.tagline_hi),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = MaterialTheme.shapes.large,
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.RecordVoiceOver,
                                contentDescription = "हिंदी भाषा सक्रिय",
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "हिंदी",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar {
                PrimaryDestination.entries.forEach { dest ->
                    val selected = currentDestination == dest
                    NavigationBarItem(
                        selected = selected,
                        onClick = { currentDestination = dest },
                        modifier = Modifier.testTag(dest.testTag),
                        icon = {
                            Icon(
                                imageVector = if (selected) dest.selectedIcon else dest.unselectedIcon,
                                contentDescription = dest.labelHi
                            )
                        },
                        label = {
                            Text(
                                text = dest.labelHi,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            AnimatedVisibility(visible = statusBanner != null) {
                Surface(
                    color = MaterialTheme.colorScheme.secondaryContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = statusBanner ?: "",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.weight(1f)
                        )
                        TextButton(onClick = { viewModel.clearStatusBanner() }) {
                            Text("ठीक है")
                        }
                    }
                }
            }

            when (currentDestination) {
                PrimaryDestination.HOME -> HomeScreen(
                    profileState = profileState,
                    remindersState = remindersState,
                    messagesState = messagesState,
                    isAssistantBusy = isAssistantBusy,
                    onAskQuestion = { q -> viewModel.askQuestion(q) },
                    onSpeakText = speakOutLoud,
                    onFlagMessage = { msg -> viewModel.flagMessage(msg) },
                    onUpdateConsent = { allowed -> viewModel.updateConsent(allowed) },
                    onSendReminderNotification = { rem ->
                        ReminderNotificationHelper.sendReminderNotification(context, rem)
                    },
                    onNavigateToCropDoctor = {
                        adviceSubTab = 0
                        currentDestination = PrimaryDestination.ADVICE
                    },
                    onNavigateToWeather = {
                        adviceSubTab = 1
                        currentDestination = PrimaryDestination.ADVICE
                    },
                    onNavigateToSchemes = {
                        currentDestination = PrimaryDestination.SCHEMES
                    },
                    onNavigateToAccounts = {
                        currentDestination = PrimaryDestination.ACCOUNTS
                    },
                    onNavigateToMyFarm = {
                        currentDestination = PrimaryDestination.MY_FARM
                    }
                )

                PrimaryDestination.MY_FARM -> MyFarmScreen(
                    currentUserId = currentUserId,
                    profileState = profileState,
                    cropCyclesState = cropCyclesState,
                    remindersState = remindersState,
                    onSaveProfile = { p -> viewModel.saveProfile(p) },
                    onDeleteProfile = { viewModel.deleteProfile() },
                    onSeedSampleData = { viewModel.seedStarterFarmData() },
                    onAddCropCycle = { field, crop, variety, area, season, sowing, stage, irrig, notes ->
                        viewModel.addCropCycle(field, crop, variety, area, season, sowing, stage, irrig, notes)
                    },
                    onDeleteCropCycle = { id -> viewModel.deleteCropCycle(id) },
                    onAddReminder = { crop, title, why, due ->
                        viewModel.addReminder(crop, title, why, due)
                    },
                    onUpdateReminderStatus = { rem, st -> viewModel.updateReminderStatus(rem, st) },
                    onSignOut = {
                        signOut(
                            context = context,
                            credentialManager = credentialManager,
                            onSignOutComplete = {},
                            scope = scope
                        )
                    }
                )

                PrimaryDestination.ADVICE -> AdviceScreen(
                    initialSubTab = adviceSubTab,
                    cropCasesState = cropCasesState,
                    weatherState = weatherState,
                    messagesState = messagesState,
                    isCropDoctorBusy = isCropDoctorBusy,
                    onSubmitCropDoctorCase = { crop, stage, symp, spread, bmp ->
                        viewModel.submitCropDoctorCase(crop, stage, symp, spread, bmp)
                    },
                    onEscalateToExpert = { caseItem, note ->
                        viewModel.escalateCaseToExpert(caseItem, note)
                    },
                    onResolveCaseByAdmin = { caseItem, reviewNote ->
                        viewModel.resolveCaseWithAdminNote(caseItem, reviewNote)
                    },
                    onRefreshWeather = { customDist -> viewModel.refreshWeather(customDist) }
                )

                PrimaryDestination.SCHEMES -> SchemesScreen(
                    evaluatedSchemes = viewModel.evaluateAllSchemes()
                )

                PrimaryDestination.ACCOUNTS -> AccountsAndMandiScreen(
                    transactionsState = transactionsState,
                    cropCyclesState = cropCyclesState,
                    onCalculateEconomics = { expectedYield, fieldFilter ->
                        viewModel.calculateFarmEconomics(expectedYield, fieldFilter)
                    },
                    onCalculateMandiOptions = { crop, qty, transport, handling, customMandi, customRate ->
                        viewModel.calculateMandiOptions(crop, qty, transport, handling, customMandi, customRate)
                    },
                    onAddTransaction = { type, cat, crop, fieldName, title, amt, qty, dt ->
                        viewModel.addTransaction(type, cat, crop, fieldName, title, amt, qty, dt)
                    },
                    onDeleteTransaction = { id -> viewModel.deleteTransaction(id) }
                )
            }
        }
    }
}
