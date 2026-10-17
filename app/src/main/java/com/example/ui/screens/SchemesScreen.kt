package com.example.ui.screens

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.HelpOutline
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
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
import com.example.data.knowledge.CriterionCheckStatus
import com.example.data.knowledge.SchemeEvaluationResult
import com.example.ui.theme.AlertRedBg
import com.example.ui.theme.AlertRedText
import com.example.ui.theme.CautionAmberBg
import com.example.ui.theme.CautionAmberText
import com.example.ui.theme.SafeGreenBg
import com.example.ui.theme.SafeGreenText

@Composable
fun SchemesScreen(
    evaluatedSchemes: List<SchemeEvaluationResult>
) {
    val context = LocalContext.current
    var searchQuery by rememberSaveable { mutableStateOf("") }
    var scopeFilter by rememberSaveable { mutableStateOf("ALL") }
    val checkedDocs = remember { mutableStateMapOf<String, Boolean>() }

    val filteredSchemes = remember(evaluatedSchemes, searchQuery, scopeFilter) {
        evaluatedSchemes.filter { res ->
            val s = res.scheme
            val matchesQuery = searchQuery.isBlank() ||
                s.nameHi.contains(searchQuery, ignoreCase = true) ||
                s.nameEn.contains(searchQuery, ignoreCase = true) ||
                s.benefitSummaryHi.contains(searchQuery, ignoreCase = true)
            val matchesScope = scopeFilter == "ALL" ||
                (scopeFilter == "UP" && s.applicableStates.contains("उत्तर प्रदेश"))
            matchesQuery && matchesScope
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "सरकारी योजना साथी (Scheme Assistant)",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "पारदर्शी नियम-आधारित पात्रता जाँच, आवश्यक दस्तावेज़ों की चेकलिस्ट और आधिकारिक पोर्टल लिंक",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = CautionAmberBg)
            ) {
                Text(
                    text = "पारदर्शिता नोट: नीचे दी गई योजना शर्तें इन-ऐप स्थिर संदर्भ सारांश (Static Reference Snapshot) हैं, लाइव सरकारी डेटाबेस सिंक नहीं। सटीक पात्रता जाँच के लिए 'मेरा खेत' टैब में अपनी प्रोफ़ाइल (भूमि, eKYC, बैंक लिंकिंग, आयकर स्थिति) भरें और आवेदन से पहले आधिकारिक पोर्टल या CSC केंद्र पर पुष्टि करें।",
                    style = MaterialTheme.typography.labelMedium,
                    color = CautionAmberText,
                    modifier = Modifier.padding(12.dp)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("schemes_search_input"),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                placeholder = { Text("योजना खोजें (जैसे PM-KISAN, फसल बीमा, KCC, सोलर पंप, ड्रिप)...") },
                shape = RoundedCornerShape(16.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = scopeFilter == "ALL",
                    onClick = { scopeFilter = "ALL" },
                    label = { Text("सभी केंद्रीय व राज्य योजनाएँ (${evaluatedSchemes.size})") }
                )
                FilterChip(
                    selected = scopeFilter == "UP",
                    onClick = { scopeFilter = "UP" },
                    label = { Text("उत्तर प्रदेश विशेष (AgriStack)") }
                )
            }
        }

        items(filteredSchemes, key = { it.scheme.id }) { evalResult ->
            val scheme = evalResult.scheme
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("scheme_card_${scheme.id}"),
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = "${scheme.scope} • इन-ऐप संदर्भ: ${scheme.lastVerifiedDate}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = scheme.nameHi,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = scheme.departmentHi,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "लाभ: ${scheme.benefitSummaryHi}",
                        style = MaterialTheme.typography.bodyLarge
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "आपकी प्रोफ़ाइल के अनुसार पात्रता जाँच:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    evalResult.criteriaResults.forEach { crit ->
                        val (bg, fg, icon) = when (crit.status) {
                            CriterionCheckStatus.LIKELY_MET -> Triple(SafeGreenBg, SafeGreenText, Icons.Default.CheckCircle)
                            CriterionCheckStatus.NEEDS_VERIFICATION -> Triple(CautionAmberBg, CautionAmberText, Icons.AutoMirrored.Filled.HelpOutline)
                            CriterionCheckStatus.NOT_MET -> Triple(AlertRedBg, AlertRedText, Icons.Default.ErrorOutline)
                        }
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(containerColor = bg),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(icon, contentDescription = null, tint = fg)
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = "${crit.status.labelHi}: ${crit.labelHi}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = fg
                                    )
                                    Text(
                                        text = crit.explanationHi,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = fg
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = "आवश्यक दस्तावेज़ चेकलिस्ट (तैयार होने पर टिक करें):",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    scheme.requiredDocumentsHi.forEach { doc ->
                        val key = "${scheme.id}_$doc"
                        val isChecked = checkedDocs[key] == true
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Checkbox(
                                checked = isChecked,
                                onCheckedChange = { checkedDocs[key] = it }
                            )
                            Text(
                                text = doc,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "आवेदन की प्रक्रिया:",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    scheme.applicationStepsHi.forEach { step ->
                        Text(
                            text = step,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "अंतिम तिथि / समय-सीमा: ${scheme.deadlineHi}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    Text(
                        text = "अपवाद / नियम: ${scheme.exclusionsHi}",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = evalResult.officialDisclaimerHi,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(scheme.officialPortalUrl))
                                context.startActivity(browserIntent)
                            },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("आधिकारिक पोर्टल")
                        }
                        OutlinedButton(
                            onClick = {
                                val dialNum = scheme.helplineNumber.substringBefore("/").trim()
                                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$dialNum"))
                                context.startActivity(dialIntent)
                            },
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.Call, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(scheme.helplineNumber.substringBefore("/").trim())
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }
    }
}
