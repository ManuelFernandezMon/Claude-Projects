#!/usr/bin/env bash
# Builds a signed release APK of the Android app and copies it to public/downloads/recipe-box.apk.
# Needs: JDK 17+, the Android SDK (ANDROID_HOME, with platform android-36 and build-tools), network access for Gradle.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK folder}"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# One signing key for the life of the app. Android only installs an update over an existing install when the key matches,
# so keep android/keystore/ and android/keystore.properties somewhere safe. They are gitignored on purpose (the repo is public).
if [ ! -f android/keystore.properties ]; then
  echo "No signing key found: creating android/keystore/recipebox.jks"
  mkdir -p android/keystore
  PASS="$(openssl rand -hex 16)"
  keytool -genkeypair -v -keystore android/keystore/recipebox.jks -alias recipebox -keyalg RSA -keysize 4096 \
    -validity 10000 -storepass "$PASS" -keypass "$PASS" -dname "CN=recipe-box personal app" >/dev/null 2>&1
  printf 'storeFile=keystore/recipebox.jks\nstorePassword=%s\nkeyAlias=recipebox\nkeyPassword=%s\n' "$PASS" "$PASS" > android/keystore.properties
fi

npx tsc -b
npx vite build --mode android
rm -rf dist/downloads            # do not embed earlier APKs inside the new APK
npx cap sync android

CODE="$(( $(date +%s) / 60 ))"   # increases every minute, stays far below Android's 2.1 billion limit
NAME="$(node -p "require('./package.json').version")"
( cd android && ./gradlew --no-daemon assembleRelease -PappVersionCode="$CODE" -PappVersionName="$NAME" )

APK=android/app/build/outputs/apk/release/app-release.apk
APKSIGNER="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)"
"$APKSIGNER" verify --verbose "$APK" | head -5
mkdir -p public/downloads
cp "$APK" public/downloads/recipe-box.apk
ls -la public/downloads/recipe-box.apk
