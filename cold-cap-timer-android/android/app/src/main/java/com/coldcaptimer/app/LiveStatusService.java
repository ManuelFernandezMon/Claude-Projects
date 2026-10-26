package com.coldcaptimer.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Persistent status notification. The web app sends a timeline of phases (see liveTimeline in logic.js);
 * this service shows the current phase and switches to the next one on its own, so the notification keeps
 * updating with the app closed. The countdown itself is drawn by Android (notification chronometer).
 */
public class LiveStatusService extends Service {
    static final String EXTRA_PHASES = "phases";
    private static final String ACTION_REFRESH = "com.coldcaptimer.app.REFRESH";
    private static final String CHANNEL_ID = "live_status";
    private static final int NOTIFICATION_ID = 4242;
    private static final String PREFS = "live_status";
    private static final String PREF_PHASES = "phases";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private JSONArray phases = new JSONArray();

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String json = intent != null ? intent.getStringExtra(EXTRA_PHASES) : null;
        if (json != null) {
            prefs.edit().putString(PREF_PHASES, json).apply();
        } else {
            // Refresh alarm, or the system restarting the service: use the last timeline we were given.
            json = prefs.getString(PREF_PHASES, null);
        }

        try {
            phases = json != null ? new JSONArray(json) : new JSONArray();
        } catch (JSONException e) {
            phases = new JSONArray();
        }

        createChannel();
        // startForegroundService() requires startForeground() promptly, even if there is nothing to show.
        show();
        if (phases.length() == 0) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        cancelRefreshAlarm();
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().remove(PREF_PHASES).apply();
        super.onDestroy();
    }

    /** Shows the phase that is current now and schedules the switch to the next one. */
    private void show() {
        handler.removeCallbacksAndMessages(null);
        long now = System.currentTimeMillis();
        JSONObject current = null;
        long nextAt = -1;
        for (int i = 0; i < phases.length(); i++) {
            JSONObject p = phases.optJSONObject(i);
            if (p == null) continue;
            if (p.optLong("at") <= now) {
                current = p;
            } else {
                nextAt = p.optLong("at");
                break;
            }
        }
        if (current == null) current = phases.optJSONObject(0);

        Notification notification = build(current);
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (nextAt > 0) {
            long delay = Math.max(500, nextAt - now);
            handler.postDelayed(this::show, delay);
            scheduleRefreshAlarm(nextAt); // backup in case the CPU is asleep when the phase changes
        } else {
            cancelRefreshAlarm();
        }
    }

    private Notification build(@Nullable JSONObject p) {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String title = p != null ? p.optString("title", "Cold Cap Timer") : "Cold Cap Timer";
        String text = p != null ? p.optString("text", "") : "";
        String big = p != null ? p.optString("big", text) : text;
        boolean urgent = p != null && p.optBoolean("urgent", false);

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_cap)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(big))
                .setColor(urgent ? 0xFFB91C1C : 0xFF0F766E)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setContentIntent(openPi);

        if (p != null && p.has("sub")) b.setSubText(p.optString("sub"));
        if (p != null && p.optLong("countdownTo", 0) > 0) {
            b.setShowWhen(true).setWhen(p.optLong("countdownTo")).setUsesChronometer(true).setChronometerCountDown(true);
        } else if (p != null && p.optLong("countUpFrom", 0) > 0) {
            b.setShowWhen(true).setWhen(p.optLong("countUpFrom")).setUsesChronometer(true).setChronometerCountDown(false);
        } else {
            b.setShowWhen(false);
        }
        return b.build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Estado en vivo", NotificationManager.IMPORTANCE_LOW);
        ch.setDescription("Cuenta regresiva y próximo paso de los cold caps");
        ch.setShowBadge(false);
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
    }

    private PendingIntent refreshIntent() {
        Intent i = new Intent(this, LiveStatusService.class).setAction(ACTION_REFRESH);
        return PendingIntent.getService(this, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void scheduleRefreshAlarm(long at) {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, refreshIntent());
        } catch (RuntimeException ignored) {
            // The Handler above still covers the common case.
        }
    }

    private void cancelRefreshAlarm() {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(refreshIntent());
    }
}
