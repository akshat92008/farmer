package com.example.ui.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.example.R
import com.example.data.model.FarmReminder

object ReminderNotificationHelper {
    private const val CHANNEL_ID = "amaura_crop_reminders_channel"

    fun ensureChannelCreated(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "खेती कैलेंडर रिमाइंडर (Crop Calendar Alerts)",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "सिंचाई, खाद और फसल निरीक्षण के समय पर अनुस्मारक"
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun sendReminderNotification(context: Context, reminder: FarmReminder): Boolean {
        if (!hasNotificationPermission(context)) return false
        ensureChannelCreated(context)
        return try {
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("खेती कैलेंडर कार्य: ${reminder.cropName}")
                .setContentText("${reminder.taskTitle} (${reminder.dueDate})")
                .setStyle(
                    NotificationCompat.BigTextStyle()
                        .bigText("${reminder.taskTitle}\nसमय: ${reminder.dueDate}\nक्यों ज़रूरी है: ${reminder.whySuggested}")
                )
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .build()

            NotificationManagerCompat.from(context).notify(
                reminder.id.hashCode().takeIf { it != 0 } ?: 1001,
                notification
            )
            true
        } catch (_: SecurityException) {
            false
        }
    }
}
