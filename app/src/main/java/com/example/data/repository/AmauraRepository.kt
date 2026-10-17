package com.example.data.repository

import android.content.Context
import android.util.Log
import com.example.R
import com.example.data.model.AssistantMessage
import com.example.data.model.CropCase
import com.example.data.model.CropCycle
import com.example.data.model.FarmReminder
import com.example.data.model.FarmTransaction
import com.example.data.model.FarmerProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.snapshots
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

enum class OperationType(val value: String) {
    CREATE("create"),
    UPDATE("update"),
    DELETE("delete"),
    LIST("list"),
    GET("get"),
    WRITE("write"),
}

fun handleFirestoreError(exception: Exception, operationType: OperationType, path: String?): String {
    val auth = try {
        FirebaseAuth.getInstance()
    } catch (e: Exception) {
        null
    }
    val currentUser = auth?.currentUser

    val providerInfoList = currentUser?.providerData?.map { provider ->
        JSONObject().apply {
            put("providerId", provider.providerId)
            put("email", provider.email)
        }
    } ?: emptyList()

    val authInfoJson = JSONObject().apply {
        put("userId", currentUser?.uid)
        put("email", currentUser?.email)
        put("emailVerified", currentUser?.isEmailVerified)
        put("tenantId", currentUser?.tenantId)
        put("providerInfo", JSONArray(providerInfoList))
    }

    val errorInfoJson = JSONObject().apply {
        put("error", exception.message ?: exception.toString())
        put("operationType", operationType.value)
        put("path", path)
        put("authInfo", authInfoJson)
    }

    val jsonString = errorInfoJson.toString()
    Log.e("FirestoreError", "Firestore Error: $jsonString")
    return jsonString
}

class AmauraRepository(
    private val db: FirebaseFirestore,
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    constructor(context: Context) : this(
        FirebaseFirestore.getInstance(
            context.applicationContext.getString(R.string.firestore_database_id)
        ),
        FirebaseAuth.getInstance()
    )

    private fun requireUserId(): String {
        return auth.currentUser?.uid
            ?: throw IllegalStateException("User must be signed in with Google before accessing Firestore.")
    }

    // --- 1. Farmer Profile ---
    fun observeFarmerProfile(userId: String): Flow<FarmerProfile?> = flow {
        val path = "users/$userId"
        emitAll(
            db.collection("users").document(userId)
                .snapshots()
                .map { snapshot ->
                    if (snapshot.exists()) {
                        snapshot.toObject(
                            FarmerProfile::class.java,
                            DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                        )
                    } else {
                        null
                    }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.GET, path)
                    throw error
                }
        )
    }

    suspend fun getFarmerProfile(userId: String): Result<FarmerProfile?> = runCatching {
        val docRef = db.collection("users").document(userId)
        try {
            val snap = docRef.get().await()
            if (snap.exists()) {
                snap.toObject(
                    FarmerProfile::class.java,
                    DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                )
            } else {
                null
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.GET, docRef.path)
            throw e
        }
    }

    suspend fun saveFarmerProfile(profile: FarmerProfile): Result<Unit> = runCatching {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid)
        try {
            val existing = docRef.get().await()
            if (!existing.exists()) {
                docRef.set(
                    profile.copy(
                        id = uid,
                        userId = uid,
                        createdAt = null,
                        updatedAt = null
                    )
                ).await()
            } else {
                val existingCreatedAt = existing.getTimestamp("createdAt")
                docRef.set(
                    profile.copy(
                        id = uid,
                        userId = uid,
                        createdAt = existingCreatedAt,
                        updatedAt = null
                    )
                ).await()
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.WRITE, docRef.path)
            throw e
        }
    }

    /**
     * Complete Account & Subcollection Data Deletion (Fixes Audit Point 11):
     * Deletes all documents in `crop_cycles`, `crop_cases`, `farm_transactions`, `reminders`,
     * and `conversations` before deleting the root `/users/{uid}` profile document.
     */
    suspend fun deleteFarmerProfile(): Result<Unit> = runCatching {
        val uid = requireUserId()
        val userDocRef = db.collection("users").document(uid)
        val subcollections = listOf(
            "crop_cycles",
            "crop_cases",
            "farm_transactions",
            "reminders",
            "conversations"
        )
        try {
            for (sub in subcollections) {
                val snap = userDocRef.collection(sub).whereEqualTo("userId", uid).get().await()
                for (doc in snap.documents) {
                    doc.reference.delete().await()
                }
            }
            userDocRef.delete().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, userDocRef.path)
            throw e
        }
    }

    // --- 2. Crop Cycles (My Farm) ---
    fun observeCropCycles(userId: String): Flow<List<CropCycle>> = flow {
        val path = "users/$userId/crop_cycles"
        emitAll(
            db.collection("users").document(userId).collection("crop_cycles")
                .whereEqualTo("userId", userId)
                .snapshots()
                .map { snapshot ->
                    snapshot.toObjects(
                        CropCycle::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    ).sortedByDescending { it.createdAt?.seconds ?: 0L }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.LIST, path)
                    throw error
                }
        )
    }

    suspend fun addCropCycle(cycle: CropCycle): Result<String> = runCatching {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("crop_cycles")
        val docRef = colRef.document()
        try {
            docRef.set(
                cycle.copy(
                    id = docRef.id,
                    userId = uid,
                    createdAt = null,
                    updatedAt = null
                )
            ).await()
            docRef.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            throw e
        }
    }

    suspend fun deleteCropCycle(cycleId: String): Result<Unit> = runCatching {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid).collection("crop_cycles").document(cycleId)
        try {
            docRef.delete().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            throw e
        }
    }

    // --- 3. Crop Doctor Cases & Expert Escalations ---
    fun observeCropCases(userId: String): Flow<List<CropCase>> = flow {
        val path = "users/$userId/crop_cases"
        emitAll(
            db.collection("users").document(userId).collection("crop_cases")
                .whereEqualTo("userId", userId)
                .snapshots()
                .map { snapshot ->
                    snapshot.toObjects(
                        CropCase::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    ).sortedByDescending { it.createdAt?.seconds ?: 0L }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.LIST, path)
                    throw error
                }
        )
    }

    suspend fun addCropCase(cropCase: CropCase): Result<String> = runCatching {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("crop_cases")
        val docRef = colRef.document()
        try {
            docRef.set(
                cropCase.copy(
                    id = docRef.id,
                    userId = uid,
                    createdAt = null,
                    updatedAt = null
                )
            ).await()
            docRef.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            throw e
        }
    }

    suspend fun escalateCropCaseToExpert(
        caseItem: CropCase,
        expertNotes: String,
        newStatus: String = "ESCALATED"
    ): Result<Unit> = runCatching {
        val uid = requireUserId()
        require(caseItem.id.isNotBlank()) { "Case ID must not be blank" }
        requireNotNull(caseItem.createdAt) { "Case createdAt must not be null" }
        val docRef = db.collection("users").document(uid).collection("crop_cases").document(caseItem.id)
        try {
            docRef.set(
                caseItem.copy(
                    expertStatus = newStatus,
                    expertNotes = expertNotes.take(1000),
                    updatedAt = null
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            throw e
        }
    }

    // --- 4. Farm Transactions (Farm Accounts) ---
    fun observeFarmTransactions(userId: String): Flow<List<FarmTransaction>> = flow {
        val path = "users/$userId/farm_transactions"
        emitAll(
            db.collection("users").document(userId).collection("farm_transactions")
                .whereEqualTo("userId", userId)
                .snapshots()
                .map { snapshot ->
                    snapshot.toObjects(
                        FarmTransaction::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    ).sortedByDescending { it.createdAt?.seconds ?: 0L }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.LIST, path)
                    throw error
                }
        )
    }

    suspend fun addFarmTransaction(tx: FarmTransaction): Result<String> = runCatching {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("farm_transactions")
        val docRef = colRef.document()
        try {
            docRef.set(
                tx.copy(
                    id = docRef.id,
                    userId = uid,
                    createdAt = null,
                    updatedAt = null
                )
            ).await()
            docRef.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            throw e
        }
    }

    suspend fun deleteFarmTransaction(txId: String): Result<Unit> = runCatching {
        val uid = requireUserId()
        val docRef = db.collection("users").document(uid).collection("farm_transactions").document(txId)
        try {
            docRef.delete().await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.DELETE, docRef.path)
            throw e
        }
    }

    // --- 5. Farm Reminders (Crop Calendar & Tasks) ---
    fun observeReminders(userId: String): Flow<List<FarmReminder>> = flow {
        val path = "users/$userId/reminders"
        emitAll(
            db.collection("users").document(userId).collection("reminders")
                .whereEqualTo("userId", userId)
                .snapshots()
                .map { snapshot ->
                    snapshot.toObjects(
                        FarmReminder::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    ).sortedByDescending { it.createdAt?.seconds ?: 0L }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.LIST, path)
                    throw error
                }
        )
    }

    suspend fun addReminder(reminder: FarmReminder): Result<String> = runCatching {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("reminders")
        val docRef = colRef.document()
        try {
            docRef.set(
                reminder.copy(
                    id = docRef.id,
                    userId = uid,
                    createdAt = null,
                    updatedAt = null
                )
            ).await()
            docRef.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            throw e
        }
    }

    suspend fun updateReminderStatus(reminder: FarmReminder, newStatus: String): Result<Unit> = runCatching {
        val uid = requireUserId()
        require(reminder.id.isNotBlank()) { "Reminder ID must not be blank" }
        requireNotNull(reminder.createdAt) { "Reminder createdAt must not be null" }
        val docRef = db.collection("users").document(uid).collection("reminders").document(reminder.id)
        try {
            docRef.set(
                reminder.copy(
                    status = newStatus,
                    updatedAt = null
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            throw e
        }
    }

    // --- 6. Assistant Conversation History & Feedback ---
    fun observeMessages(userId: String): Flow<List<AssistantMessage>> = flow {
        val path = "users/$userId/conversations"
        emitAll(
            db.collection("users").document(userId).collection("conversations")
                .whereEqualTo("userId", userId)
                .snapshots()
                .map { snapshot ->
                    snapshot.toObjects(
                        AssistantMessage::class.java,
                        DocumentSnapshot.ServerTimestampBehavior.ESTIMATE
                    ).sortedBy { it.createdAt?.seconds ?: 0L }
                }
                .catch { error ->
                    if (error is Exception) handleFirestoreError(error, OperationType.LIST, path)
                    throw error
                }
        )
    }

    suspend fun addMessage(message: AssistantMessage): Result<String> = runCatching {
        val uid = requireUserId()
        val colRef = db.collection("users").document(uid).collection("conversations")
        val docRef = colRef.document()
        try {
            docRef.set(
                message.copy(
                    id = docRef.id,
                    userId = uid,
                    createdAt = null,
                    updatedAt = null
                )
            ).await()
            docRef.id
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.CREATE, docRef.path)
            throw e
        }
    }

    suspend fun flagMessageHarmful(msg: AssistantMessage, flagged: Boolean): Result<Unit> = runCatching {
        val uid = requireUserId()
        require(msg.id.isNotBlank()) { "Message ID must not be blank" }
        requireNotNull(msg.createdAt) { "Message createdAt must not be null" }
        val docRef = db.collection("users").document(uid).collection("conversations").document(msg.id)
        try {
            docRef.set(
                msg.copy(
                    flaggedHarmful = flagged,
                    updatedAt = null
                )
            ).await()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            handleFirestoreError(e, OperationType.UPDATE, docRef.path)
            throw e
        }
    }
}
