package com.example.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.data.knowledge.FarmEconomicsSummary
import com.example.data.knowledge.MandiComparisonOption
import com.example.data.model.CropCycle
import com.example.data.model.FarmTransaction
import com.example.ui.theme.AlertRedBg
import com.example.ui.theme.AlertRedText
import com.example.ui.theme.CautionAmberBg
import com.example.ui.theme.CautionAmberText
import com.example.ui.theme.SafeGreenBg
import com.example.ui.theme.SafeGreenText
import com.example.ui.viewmodel.UiState
import kotlin.math.roundToInt

@Composable
fun AccountsAndMandiScreen(
    transactionsState: UiState<List<FarmTransaction>>,
    cropCyclesState: UiState<List<CropCycle>>,
    onCalculateEconomics: (Double, String) -> FarmEconomicsSummary,
    onCalculateMandiOptions: (String, Double, Double, Double, String, Double) -> List<MandiComparisonOption>,
    onAddTransaction: (String, String, String, String, String, Double, Double, String) -> Unit,
    onDeleteTransaction: (String) -> Unit
) {
    var selectedSubTab by rememberSaveable { mutableIntStateOf(0) }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Tab(
                selected = selectedSubTab == 0,
                onClick = { selectedSubTab = 0 },
                modifier = Modifier.testTag("accounts_tab_ledger"),
                text = { Text("खेती का हिसाब (प्रति-खेत)") },
                icon = { Icon(Icons.Default.Calculate, contentDescription = null) }
            )
            Tab(
                selected = selectedSubTab == 1,
                onClick = { selectedSubTab = 1 },
                modifier = Modifier.testTag("accounts_tab_mandi"),
                text = { Text("मंडी भाव और शुद्ध आय") },
                icon = { Icon(Icons.Default.Storefront, contentDescription = null) }
            )
        }

        when (selectedSubTab) {
            0 -> FarmAccountsLedgerTab(
                transactionsState = transactionsState,
                cropCyclesState = cropCyclesState,
                onCalculateEconomics = onCalculateEconomics,
                onAddTransaction = onAddTransaction,
                onDeleteTransaction = onDeleteTransaction
            )
            1 -> MandiSellingCalculatorTab(
                onCalculateMandiOptions = onCalculateMandiOptions
            )
        }
    }
}

@Composable
private fun FarmAccountsLedgerTab(
    transactionsState: UiState<List<FarmTransaction>>,
    cropCyclesState: UiState<List<CropCycle>>,
    onCalculateEconomics: (Double, String) -> FarmEconomicsSummary,
    onAddTransaction: (String, String, String, String, String, Double, Double, String) -> Unit,
    onDeleteTransaction: (String) -> Unit
) {
    val context = LocalContext.current
    var expectedYieldInput by rememberSaveable { mutableStateOf("25") }
    var selectedFieldFilter by rememberSaveable { mutableStateOf("ALL") }
    var showAddTxDialog by rememberSaveable { mutableStateOf(false) }
    var defaultDialogTxType by rememberSaveable { mutableStateOf("EXPENSE") }

    val allTxs = (transactionsState as? UiState.Success)?.data ?: emptyList()
    val crops = (cropCyclesState as? UiState.Success)?.data ?: emptyList()
    val knownFields = remember(allTxs, crops) {
        (crops.map { it.fieldName } + allTxs.map { it.fieldName })
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
    }

    val filteredTxs = remember(allTxs, selectedFieldFilter) {
        if (selectedFieldFilter == "ALL") {
            allTxs
        } else {
            allTxs.filter { it.fieldName.equals(selectedFieldFilter, ignoreCase = true) }
        }
    }

    val expectedQuintals = expectedYieldInput.toDoubleOrNull()?.coerceAtLeast(1.0) ?: 25.0
    val summary = onCalculateEconomics(expectedQuintals, selectedFieldFilter)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            // Field Filter Bar (Fixes Audit Point 2: Per-Field Cost Tracking)
            if (knownFields.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedFieldFilter == "ALL",
                        onClick = { selectedFieldFilter = "ALL" },
                        label = { Text("सभी खेत (${allTxs.size})") }
                    )
                    knownFields.forEach { fName ->
                        FilterChip(
                            selected = selectedFieldFilter == fName,
                            onClick = { selectedFieldFilter = fName },
                            label = { Text(fName) }
                        )
                    }
                }
            }
        }

        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (selectedFieldFilter == "ALL") {
                                "खेती का वास्तविक हिसाब (सभी खेत)"
                            } else {
                                "खेत का हिसाब: $selectedFieldFilter"
                            },
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        IconButton(
                            onClick = {
                                val shareText = "Amaura खेती का हिसाब सारांश:\n" +
                                    "• खेत: ${if (selectedFieldFilter == "ALL") "सभी खेत" else selectedFieldFilter}\n" +
                                    "• कुल खर्च: ₹${summary.totalExpensesInr.roundToInt()}\n" +
                                    "• प्रति एकड़ लागत: ₹${summary.costPerAcreInr.roundToInt()}/एकड़\n" +
                                    "• कुल बिक्री: ₹${summary.totalSalesInr.roundToInt()}\n" +
                                    "• शुद्ध आय/अंतर: ₹${summary.netIncomeInr.roundToInt()}\n" +
                                    "• लागत मूल्य (Break-Even): ₹${summary.breakEvenPricePerQuintalInr?.roundToInt() ?: 0}/क्विंटल"
                                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                                    type = "text/plain"
                                    putExtra(Intent.EXTRA_TEXT, shareText)
                                }
                                context.startActivity(Intent.createChooser(sendIntent, "हिसाब साझा करें"))
                            },
                            modifier = Modifier.testTag("share_accounts_summary_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.Share,
                                contentDescription = "हिसाब साझा करें",
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("कुल खर्च (लागत)", style = MaterialTheme.typography.labelMedium)
                            Text(
                                text = "₹${summary.totalExpensesInr.roundToInt()}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = AlertRedText
                            )
                        }
                        Column {
                            Text("कुल उपज बिक्री", style = MaterialTheme.typography.labelMedium)
                            Text(
                                text = "₹${summary.totalSalesInr.roundToInt()}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = SafeGreenText
                            )
                        }
                        Column {
                            Text("प्रति एकड़ लागत", style = MaterialTheme.typography.labelMedium)
                            Text(
                                text = "₹${summary.costPerAcreInr.roundToInt()}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = if (summary.netIncomeInr >= 0) SafeGreenBg else CautionAmberBg,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "वास्तविक शुद्ध अंतर (बिक्री − खर्च): ₹${summary.netIncomeInr.roundToInt()}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = if (summary.netIncomeInr >= 0) SafeGreenText else CautionAmberText
                            )
                            if (summary.breakEvenPricePerQuintalInr != null) {
                                Text(
                                    text = "लागत निकलने का भाव (Break-Even Price): ₹${summary.breakEvenPricePerQuintalInr.roundToInt()} प्रति क्विंटल",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (summary.netIncomeInr >= 0) SafeGreenText else CautionAmberText
                                )
                            }
                        }
                    }

                    // Per-Field Expense Breakdown
                    if (summary.expenseByField.isNotEmpty() && selectedFieldFilter == "ALL") {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "खेत-वार खर्च विभाजन (Per-Field Cost):",
                            style = MaterialTheme.typography.labelLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        summary.expenseByField.forEach { (fieldLabel, amt) ->
                            Text(
                                text = "• $fieldLabel: ₹${amt.roundToInt()}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }
                }
            }
        }

        // Break-Even Yield Estimator Input
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "अनुमानित पैदावार से Break-Even भाव गणना (अनुमान)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    OutlinedTextField(
                        value = expectedYieldInput,
                        onValueChange = { expectedYieldInput = it },
                        label = { Text("अनुमानित कुल उपज (क्विंटल में)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        // Action Buttons to Add Expense or Sale
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        defaultDialogTxType = "EXPENSE"
                        showAddTxDialog = true
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("add_expense_button"),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("खर्च जोड़ें")
                }
                OutlinedButton(
                    onClick = {
                        defaultDialogTxType = "SALE"
                        showAddTxDialog = true
                    },
                    modifier = Modifier
                        .weight(1f)
                        .testTag("add_sale_button"),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("बिक्री जोड़ें")
                }
            }
        }

        if (filteredTxs.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    )
                ) {
                    Text(
                        text = "अभी कोई खर्च या बिक्री दर्ज नहीं है। अपने खेत का खर्च जोड़ने के लिए 'खर्च जोड़ें' दबाएँ।",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        } else {
            items(filteredTxs, key = { it.id.ifBlank { it.title + it.amountInr } }) { tx ->
                val isSale = tx.txType == "SALE"
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(
                                color = if (isSale) SafeGreenBg else AlertRedBg,
                                shape = RoundedCornerShape(50)
                            ) {
                                Text(
                                    text = "${if (isSale) "बिक्री" else "खर्च"} • ${tx.fieldName.ifBlank { "मुख्य खेत" }} • ${tx.cropName}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (isSale) SafeGreenText else AlertRedText,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${tx.title} (${tx.category})",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "तारीख: ${tx.txDate}" + if (tx.quantityQuintal > 0) " • मात्रा: ${tx.quantityQuintal} क्विंटल" else "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "${if (isSale) "+" else "-"}₹${tx.amountInr.roundToInt()}",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (isSale) SafeGreenText else AlertRedText
                            )
                            IconButton(onClick = { onDeleteTransaction(tx.id) }) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "हटाएँ",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }

    if (showAddTxDialog) {
        AddTransactionDialog(
            initialType = defaultDialogTxType,
            knownFields = knownFields,
            onDismiss = { showAddTxDialog = false },
            onConfirm = { type, category, crop, fieldName, title, amount, qty, date ->
                onAddTransaction(type, category, crop, fieldName, title, amount, qty, date)
                showAddTxDialog = false
            }
        )
    }
}

@Composable
private fun MandiSellingCalculatorTab(
    onCalculateMandiOptions: (String, Double, Double, Double, String, Double) -> List<MandiComparisonOption>
) {
    val context = LocalContext.current
    var cropFilter by rememberSaveable { mutableStateOf("ALL") }
    var quantityInput by rememberSaveable { mutableStateOf("20") }
    var transportCostInput by rememberSaveable { mutableStateOf("600") }
    var handlingCostInput by rememberSaveable { mutableStateOf("250") }
    // Point 2 & 10 Fixed: Allow farmers to enter their own live local mandi/trader price!
    var customMandiName by rememberSaveable { mutableStateOf("मेरी नजदीकी मंडी / व्यापारी") }
    var customMandiPriceInput by rememberSaveable { mutableStateOf("") }

    val qty = quantityInput.toDoubleOrNull()?.coerceAtLeast(1.0) ?: 20.0
    val transport = transportCostInput.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 600.0
    val handling = handlingCostInput.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 250.0
    val customRate = customMandiPriceInput.toDoubleOrNull()?.coerceAtLeast(0.0) ?: 0.0

    val options = onCalculateMandiOptions(cropFilter, qty, transport, handling, customMandiName, customRate)

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
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "मंडी बिक्री शुद्ध आय कैलकुलेटर",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        listOf("ALL" to "सभी फसलें", "गेहूँ" to "गेहूँ", "धान" to "धान", "सरसों" to "सरसों", "चना" to "चना", "आलू" to "आलू").forEach { (key, label) ->
                            FilterChip(
                                selected = cropFilter == key,
                                onClick = { cropFilter = key },
                                label = { Text(label) }
                            )
                        }
                    }

                    // Live / Custom Local Mandi Rate Input Card
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SafeGreenBg),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "अपना आज का वास्तविक स्थानीय मंडी या व्यापारी भाव दर्ज करें:",
                                style = MaterialTheme.typography.labelLarge,
                                fontWeight = FontWeight.Bold,
                                color = SafeGreenText
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = customMandiName,
                                    onValueChange = { customMandiName = it },
                                    label = { Text("मंडी/व्यापारी का नाम") },
                                    modifier = Modifier.weight(1f),
                                    singleLine = true
                                )
                                OutlinedTextField(
                                    value = customMandiPriceInput,
                                    onValueChange = { customMandiPriceInput = it },
                                    label = { Text("आज का भाव (₹/क्विंटल)") },
                                    placeholder = { Text("उदा: 2620") },
                                    modifier = Modifier
                                        .weight(1f)
                                        .testTag("custom_mandi_price_input"),
                                    singleLine = true
                                )
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = quantityInput,
                            onValueChange = { quantityInput = it },
                            label = { Text("मात्रा (क्विंटल)") },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("mandi_quantity_input"),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = transportCostInput,
                            onValueChange = { transportCostInput = it },
                            label = { Text("भाड़ा खर्च (₹)") },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("mandi_transport_input"),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = handlingCostInput,
                            onValueChange = { handlingCostInput = it },
                            label = { Text("पल्लेदारी/अन्य (₹)") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                    }

                    Surface(
                        color = CautionAmberBg,
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(
                                text = "ईमानदार स्रोत सूचना: नीचे दिए गए उदाहरण कार्ड ऑफ़लाइन ऐतिहासिक संदर्भ बेंचमार्क हैं (लाइव AgmarkNet फीड नहीं)। आज के आधिकारिक लाइव भाव देखने के लिए नीचे दिए बटन से AgmarkNet या e-NAM खोलें और ऊपर अपना स्थानीय भाव दर्ज करें।",
                                style = MaterialTheme.typography.labelMedium,
                                color = CautionAmberText
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = {
                                        context.startActivity(
                                            Intent(Intent.ACTION_VIEW, Uri.parse("https://agmarknet.gov.in"))
                                        )
                                    }
                                ) {
                                    Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("AgmarkNet लाइव पोर्टल")
                                }
                                OutlinedButton(
                                    onClick = {
                                        context.startActivity(
                                            Intent(Intent.ACTION_VIEW, Uri.parse("https://enam.gov.in"))
                                        )
                                    }
                                ) {
                                    Text("e-NAM पोर्टल")
                                }
                            }
                        }
                    }
                }
            }
        }

        items(options, key = { it.quote.id }) { opt ->
            val q = opt.quote
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
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${q.cropNameHi} — ${q.varietyGrade}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "मंडी: ${q.mandiNameHi} (${q.districtNameHi})",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        Surface(
                            color = SafeGreenBg,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text(
                                text = "₹${q.modalPricePerQuintalInr.roundToInt()}/क्विंटल",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = SafeGreenText,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = q.mspSeasonLabelHi,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.secondary
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                text = "${opt.quantityQuintals} क्विंटल की बिक्री गणना:",
                                style = MaterialTheme.typography.labelLarge
                            )
                            Text(
                                text = "• कुल मूल्य (Gross): ₹${opt.grossProceedsInr.roundToInt()}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "• कुल खर्च (भाड़ा ₹${opt.transportCostInr.roundToInt()} + अन्य ₹${opt.mandiHandlingCostInr.roundToInt()}): -₹${(opt.transportCostInr + opt.mandiHandlingCostInr).roundToInt()}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "• अनुमानित शुद्ध प्राप्ति (Net Proceeds): ₹${opt.estimatedNetProceedsInr.roundToInt()} (₹${opt.netPerQuintalInr.roundToInt()}/क्विंटल)",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "${q.observationDate} • ${q.sourceLabel}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }
}

@Composable
private fun AddTransactionDialog(
    initialType: String,
    knownFields: List<String>,
    onDismiss: () -> Unit,
    onConfirm: (String, String, String, String, String, Double, Double, String) -> Unit
) {
    var txType by remember { mutableStateOf(initialType) }
    var category by remember {
        mutableStateOf(if (initialType == "SALE") "मंडी बिक्री (Harvest Sale)" else "खाद एवं उर्वरक (Fertiliser)")
    }
    var cropName by remember { mutableStateOf("गेहूँ (Wheat)") }
    var fieldName by remember { mutableStateOf(knownFields.firstOrNull() ?: "मुख्य खेत") }
    var title by remember { mutableStateOf("") }
    var amountText by remember { mutableStateOf("") }
    var qtyText by remember { mutableStateOf(if (initialType == "SALE") "10.0" else "1.0") }
    var dateText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (txType == "SALE") "उपज बिक्री जोड़ें" else "खेती का खर्च जोड़ें") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = txType == "EXPENSE",
                        onClick = { txType = "EXPENSE" },
                        label = { Text("खर्च (लागत)") }
                    )
                    FilterChip(
                        selected = txType == "SALE",
                        onClick = { txType = "SALE" },
                        label = { Text("उपज बिक्री (आय)") }
                    )
                }
                if (knownFields.isNotEmpty()) {
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        knownFields.forEach { f ->
                            AssistChip(
                                onClick = { fieldName = f },
                                label = { Text(f) }
                            )
                        }
                    }
                }
                OutlinedTextField(
                    value = fieldName,
                    onValueChange = { fieldName = it },
                    label = { Text("खेत का नाम (प्रति-खेत हिसाब हेतु)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = cropName,
                    onValueChange = { cropName = it },
                    label = { Text("फसल का नाम") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("विवरण (जैसे: डीएपी खाद, जुताई, मंडी बिक्री)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("कुल राशि (₹ में)") },
                    singleLine = true
                )
                OutlinedTextField(
                    value = qtyText,
                    onValueChange = { qtyText = it },
                    label = { Text("मात्रा (क्विंटल में, यदि लागू हो)") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amountText.toDoubleOrNull() ?: 0.0
                    if (amt > 0.0) {
                        onConfirm(
                            txType,
                            category,
                            cropName,
                            fieldName.ifBlank { "मुख्य खेत" },
                            title.ifBlank { if (txType == "SALE") "उपज बिक्री" else category },
                            amt,
                            qtyText.toDoubleOrNull() ?: 0.0,
                            dateText
                        )
                    }
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
