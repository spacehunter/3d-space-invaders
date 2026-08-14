#!/usr/bin/env bash
# Coordinates the two kinds of session that edit this repo (scheduled cron
# runs and human-reply chat sessions) so they never edit at the same time.
#
# Usage: ./run-lock.sh take [cron|chat]   # exit 1 = someone else has it
#        ./run-lock.sh release
#        ./run-lock.sh check              # exit 1 = locked
#
# A lock older than 2 hours belongs to a crashed run and is claimed over.
set -u
cd "$(dirname "$0")"
LOCK=.invader-run.lock
MAX_AGE=7200

lock_age() {
  local mtime
  mtime=$(stat -c %Y "$LOCK" 2>/dev/null) || mtime=0
  echo $(( $(date +%s) - mtime ))
}

case "${1:-check}" in
  take)
    if [ -f "$LOCK" ] && [ "$(lock_age)" -lt "$MAX_AGE" ]; then
      echo "LOCKED: $(cat "$LOCK")"
      echo "Another session is editing this repo. Do not edit anything."
      exit 1
    fi
    echo "by=${2:-unknown} pid=$$ started=$(date -Is)" > "$LOCK"
    echo "LOCK TAKEN: $(cat "$LOCK")"
    ;;
  release)
    rm -f "$LOCK"
    echo "LOCK RELEASED"
    ;;
  check)
    if [ -f "$LOCK" ] && [ "$(lock_age)" -lt "$MAX_AGE" ]; then
      echo "LOCKED: $(cat "$LOCK")"
      exit 1
    fi
    echo "UNLOCKED"
    ;;
  *)
    echo "usage: $0 take [cron|chat] | release | check"
    exit 2
    ;;
esac
