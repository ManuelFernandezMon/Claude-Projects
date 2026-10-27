# cold-cap-timer-android

Android wrapper (Capacitor) for [`cold-cap-timer`](../cold-cap-timer/README.md). The web app in `../cold-cap-timer` stays the single source of truth; `npm run copy-web` copies it into `www/` before each build.

What the native build adds over the PWA: the swap alarm is scheduled with Android's `AlarmManager` through `@capacitor/local-notifications`, so it fires with the screen off or the app closed. A "warning" notification fires `warn` seconds before the swap, and the swap notification at the configured interval.

## Alarms

Swap alarms are real system alarms (`AlarmsPlugin` + `AlarmReceiver`, scheduled with `AlarmManager.setAlarmClock`): exact even in Doze and without the exact-alarm permission that Android 14 denies by default. Two ring loudly: **take the next cap out of the cooler** (`lead` minutes before the swap) and **swap now**. A softer heads-up fires `warn` seconds before the swap.

The loud alarm is a notification on the **alarm audio stream** with the default alarm ringtone, so it rings in silent or vibrate mode, repeats until silenced (Silenciar action, opening the app, or logging a step in it; it also stops by itself after 90 s) and carries a full-screen intent. While it rings the alarm volume is raised to the maximum and put back afterwards (setting in Ajustes). Ajustes also has a **Probar alarma** button. Do Not Disturb that blocks alarms still silences it.

## Persistent live notification

While a session is active the app keeps one ongoing notification (foreground service `LiveStatusService`, Android notification chronometer) with a countdown that Android draws by itself, plus the next step. It moves through phases without the app being open: "Cap #1 en la cabeza" (countdown to taking the next cap out) → "Saca el cap #2 del cooler" (countdown to the swap) → "¡Cambiar ya!" (counts up the delay). Expanding it shows the plan for the next swaps. The web app computes the phases (`liveTimeline` in `cold-cap-timer/logic.js`) and hands them to the native plugin `LiveStatus`; it can be turned off in Ajustes. It is silent: the audible alarms are the scheduled notifications described above.

Notes: on Android 14+ the user can swipe this notification away (the service keeps running). Phase switches use a handler plus an `AlarmManager` backup, so with the phone in deep sleep a text change can arrive a few seconds late; the countdown itself never drifts.

## Build

Requirements: Node 22+, JDK 21, Android SDK (platform 35+, build-tools) with `ANDROID_HOME` set.

```
npm ci
npm run apk        # copies web assets, syncs, runs gradle assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. CI (`.github/workflows/cold-cap-timer-android-ci.yml`) builds it on every change and uploads it as the `cold-cap-timer-debug-apk` artifact.

## Install

The latest debug APK is also served by the web deploy at `/cold-cap-timer.apk` (copied from `dist/` into `cold-cap-timer/` and committed), so it can be downloaded straight from Chrome on the phone. Rebuild with `npm run apk`, then copy `android/app/build/outputs/apk/debug/app-debug.apk` to `../cold-cap-timer/cold-cap-timer.apk`.

The APK is signed with the Android debug key, which is fine for sideloading on your own phone:

1. Copy the APK to the phone and open it. Android asks to allow installs from that source (Files / Chrome): allow it.
2. On first use, accept the notification permission when a cap is put on.
3. On Android 12+, if prompted, allow **Alarms & reminders** for the app so the alarm is exact. Without it Android may delay the alarm by several minutes.

Not suitable for the Play Store as is (debug signing, no release keystore).
