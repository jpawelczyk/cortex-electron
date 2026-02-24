#!/bin/bash
# Patch Electron.app Info.plist with required macOS usage descriptions for dev mode.
# Production builds get these via electron-builder's extendInfo config.

PLIST="node_modules/electron/dist/Electron.app/Contents/Info.plist"

if [ ! -f "$PLIST" ]; then
  exit 0
fi

add_key_if_missing() {
  local key="$1"
  local value="$2"
  if ! /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST" &>/dev/null; then
    /usr/libexec/PlistBuddy -c "Add :$key string '$value'" "$PLIST"
  fi
}

add_key_if_missing "NSAudioCaptureUsageDescription" "Cortex needs access to system audio for meeting recording"
add_key_if_missing "NSScreenCaptureUsageDescription" "Cortex needs screen access for system audio capture"
