package com.coldcaptimer.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Real alarms for the cap swap. Uses AlarmManager.setAlarmClock: exact even in Doze, and it does not need the
 * SCHEDULE_EXACT_ALARM permission (which Android 14 denies by default).
 */
@CapacitorPlugin(name = "Alarms")
public class AlarmsPlugin extends Plugin {
    private static final int[] SLOT_IDS = {1, 2, 3, 4, 9};

    /** schedule({ alarms: [{ id, at, kind: 'alarm' | 'soft', title, text }], maxVolume }) replaces everything scheduled before. */
    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray alarms = call.getArray("alarms");
        if (alarms == null) {
            call.reject("alarms is required");
            return;
        }
        Context context = getContext();
        AlarmReceiver.setMaxVolume(context, call.getBoolean("maxVolume", true));
        cancelAll(context);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent show = PendingIntent.getActivity(context, 30,
                new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        try {
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject a = alarms.getJSONObject(i);
                int id = a.getInt("id");
                long at = a.getLong("at");
                if (at <= System.currentTimeMillis()) continue;
                Intent intent = new Intent(context, AlarmReceiver.class)
                        .setAction(AlarmReceiver.ACTION_FIRE)
                        .putExtra(AlarmReceiver.EXTRA_ID, id)
                        .putExtra(AlarmReceiver.EXTRA_KIND, a.optString("kind", "alarm"))
                        .putExtra(AlarmReceiver.EXTRA_TITLE, a.optString("title", ""))
                        .putExtra(AlarmReceiver.EXTRA_TEXT, a.optString("text", ""));
                PendingIntent fire = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), fire);
            }
            call.resolve();
        } catch (SecurityException e) {
            // setAlarmClock normally needs no permission; some vendor builds restrict it anyway.
            call.reject("The system refused to schedule alarms: " + e.getMessage());
        } catch (JSONException | RuntimeException e) {
            call.reject("Could not schedule alarms: " + e.getMessage());
        }
    }

    /** cancel(): removes every pending alarm (does not silence one that is ringing). */
    @PluginMethod
    public void cancel(PluginCall call) {
        cancelAll(getContext());
        call.resolve();
    }

    /** stopRinging(): silences a ringing alarm and restores the alarm volume. */
    @PluginMethod
    public void stopRinging(PluginCall call) {
        AlarmReceiver.stopRinging(getContext());
        call.resolve();
    }

    /** test(): rings the loud alarm right now so the user can check volume and sound. */
    @PluginMethod
    public void test(PluginCall call) {
        AlarmReceiver.setMaxVolume(getContext(), call.getBoolean("maxVolume", true));
        AlarmReceiver.fire(getContext(), 9, "alarm", "Alarma de prueba", "Así sonará cuando toque sacar o cambiar un cap");
        call.resolve();
    }

    /** status(): lets the UI warn when the system would hide the alarm. */
    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        JSObject out = new JSObject();
        out.put("notificationsEnabled", nm.areNotificationsEnabled());
        out.put("fullScreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent());
        call.resolve(out);
    }

    private static void cancelAll(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        for (int id : SLOT_IDS) {
            Intent intent = new Intent(context, AlarmReceiver.class).setAction(AlarmReceiver.ACTION_FIRE);
            PendingIntent pi = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
            if (pi != null) {
                am.cancel(pi);
                pi.cancel();
            }
        }
    }
}
