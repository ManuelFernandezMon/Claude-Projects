# cold-cap-timer-android

Android wrapper (Capacitor) for [`cold-cap-timer`](../cold-cap-timer/README.md). The web app in `../cold-cap-timer` stays the single source of truth; `npm run copy-web` copies it into `www/` before each build.

What the native build adds over the PWA: the swap alarm is scheduled with Android's `AlarmManager` through `@capacitor/local-notifications`, so it fires with the screen off or the app closed. A "warning" notification fires `warn` seconds before the swap, and the swap notification at the configured interval.

## Build

Requirements: Node 22+, JDK 21, Android SDK (platform 35+, build-tools) with `ANDROID_HOME` set.

```
npm ci
npm run apk        # copies web assets, syncs, runs gradle assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. CI (`.github/workflows/cold-cap-timer-android-ci.yml`) builds it on every change and uploads it as the `cold-cap-timer-debug-apk` artifact.

## Install

The APK is signed with the Android debug key, which is fine for sideloading on your own phone:

1. Copy the APK to the phone and open it. Android asks to allow installs from that source (Files / Chrome): allow it.
2. On first use, accept the notification permission when a cap is put on.
3. On Android 12+, if prompted, allow **Alarms & reminders** for the app so the alarm is exact. Without it Android may delay the alarm by several minutes.

Not suitable for the Play Store as is (debug signing, no release keystore).
