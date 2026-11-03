#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/device-screenshots"
for role in customer business tow superadmin; do
  apk="$root/device-apks/PARTFLOW-native-${role}-APK/PARTFLOW-native-${role}.apk"
  adb install -r "$apk"
  adb shell am force-stop "com.partflow.native.$role"
  adb shell am start -W -n "com.partflow.native.$role/com.partflow.nativeapp.MainActivity"
  sleep 3
  adb shell uiautomator dump /sdcard/partflow-ui.xml
  adb pull /sdcard/partflow-ui.xml "$root/device-screenshots/$role.xml"
  grep -F 'შედი PARTFLOW-ში' "$root/device-screenshots/$role.xml"
  adb exec-out screencap -p > "$root/device-screenshots/$role.png"
  test -s "$root/device-screenshots/$role.png"
done
