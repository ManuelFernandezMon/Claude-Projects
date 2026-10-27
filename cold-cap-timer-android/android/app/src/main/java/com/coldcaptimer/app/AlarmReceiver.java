package com.coldcaptimer.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

/**
 * Fires the swap alarms scheduled with AlarmManager.setAlarmClock (exact, works in Doze, needs no extra permission).
 * "alarm" kind: notification on the ALARM audio stream (rings even in silent or vibrate mode), repeating until
 * silenced, with a full-screen intent. "soft" kind: a single heads-up notification.
 */
public class AlarmReceiver extends BroadcastReceiver {
    static final String ACTION_FIRE = "com.coldcaptimer.app.ALARM_FIRE";
    static final String ACTION_STOP = "com.coldcaptimer.app.ALARM_STOP";
    static final String EXTRA_ID = "id";
    static final String EXTRA_KIND = "kind";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";

    private static final String CHANNEL_ALARM = "alarm_v1";
    private static final String CHANNEL_SOFT = "aviso_v1";
    private static final int NOTIFICATION_BASE = 200;
    private static final int[] ALARM_IDS = {1, 3, 9};
    private static final long AUTO_STOP_MS = 90_000;

    private static final String PREFS = "alarms";
    private static final String PREF_MAX_VOLUME = "max_volume";
    private static final String PREF_RAISED = "raised";
    private static final String PREF_PREVIOUS_VOLUME = "previous_volume";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopRinging(context);
        } else if (ACTION_FIRE.equals(action)) {
            fire(context, intent.getIntExtra(EXTRA_ID, 0), intent.getStringExtra(EXTRA_KIND),
                    intent.getStringExtra(EXTRA_TITLE), intent.getStringExtra(EXTRA_TEXT));
        }
    }

    static void setMaxVolume(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(PREF_MAX_VOLUME, enabled).apply();
    }

    static void fire(Context context, int id, String kind, String title, String text) {
        createChannels(context);
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        boolean loud = "alarm".equals(kind);

        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(context, 10 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, loud ? CHANNEL_ALARM : CHANNEL_SOFT)
                .setSmallIcon(R.drawable.ic_stat_cap)
                .setContentTitle(title != null ? title : "Cold Cap Timer")
                .setContentText(text != null ? text : "")
                .setColor(0xFF0F766E)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setContentIntent(openPi)
                .setAutoCancel(true);

        if (loud) {
            PendingIntent stopPi = stopIntent(context);
            b.setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setFullScreenIntent(openPi, true)
                    .addAction(0, "Silenciar", stopPi)
                    .setDeleteIntent(stopPi);
            Notification n = b.build();
            n.flags |= Notification.FLAG_INSISTENT; // repeat sound and vibration until silenced
            if (context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(PREF_MAX_VOLUME, true)) raiseVolume(context);
            nm.notify(NOTIFICATION_BASE + id, n);
            scheduleAutoStop(context);
        } else {
            b.setCategory(NotificationCompat.CATEGORY_REMINDER);
            nm.notify(NOTIFICATION_BASE + id, b.build());
        }
    }

    /** Silences the alarm notification(s) and puts the alarm volume back. Safe to call any time. */
    static void stopRinging(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        for (int id : ALARM_IDS) nm.cancel(NOTIFICATION_BASE + id);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(stopIntent(context));
        restoreVolume(context);
    }

    private static PendingIntent stopIntent(Context context) {
        Intent i = new Intent(context, AlarmReceiver.class).setAction(ACTION_STOP);
        return PendingIntent.getBroadcast(context, 20, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleAutoStop(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + AUTO_STOP_MS, stopIntent(context));
        } catch (RuntimeException ignored) {
            // Without the timer the user still has the Silenciar action and the app itself.
        }
    }

    private static void raiseVolume(Context context) {
        try {
            AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (!prefs.getBoolean(PREF_RAISED, false)) {
                prefs.edit().putInt(PREF_PREVIOUS_VOLUME, audio.getStreamVolume(AudioManager.STREAM_ALARM)).putBoolean(PREF_RAISED, true).apply();
            }
            audio.setStreamVolume(AudioManager.STREAM_ALARM, audio.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0);
        } catch (RuntimeException ignored) {
            // Some Do Not Disturb setups refuse volume changes; the alarm still rings at the current volume.
        }
    }

    private static void restoreVolume(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(PREF_RAISED, false)) return;
        try {
            AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            audio.setStreamVolume(AudioManager.STREAM_ALARM, prefs.getInt(PREF_PREVIOUS_VOLUME, audio.getStreamVolume(AudioManager.STREAM_ALARM)), 0);
        } catch (RuntimeException ignored) {
            // Nothing else to do.
        }
        prefs.edit().putBoolean(PREF_RAISED, false).apply();
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);

        if (nm.getNotificationChannel(CHANNEL_ALARM) == null) {
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            NotificationChannel ch = new NotificationChannel(CHANNEL_ALARM, "Alarma de cambio de cap", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Suena fuerte, aunque el teléfono esté en silencio, cuando toca sacar o cambiar un cap");
            ch.setSound(sound, new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 700, 300, 700, 300, 700});
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CHANNEL_SOFT) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_SOFT, "Avisos de cambio de cap", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Aviso corto antes del cambio");
            ch.enableVibration(true);
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }
}
