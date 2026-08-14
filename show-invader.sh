#!/usr/bin/env bash
# Send an invader's screenshot + animation clip to the user on Telegram.
#
#   ./show-invader.sh <TYPE_ID> <NAME> [SECONDS] ["note"]
#   ./show-invader.sh 13 VOIDWORM 9 "VOIDWORM 5.0 -> 8.5"
#
# Captures fresh, records fresh, then sends. Deliberately re-captures rather
# than sending whatever happens to be on disk — otherwise you can show the user
# a stale image of work you have since changed.
set -uo pipefail

ID="${1:?usage: show-invader.sh <TYPE_ID> <NAME> [SECONDS] [note]}"
NAME="$(echo "${2:?need NAME}" | tr '[:lower:]' '[:upper:]')"
SECS="${3:-9}"
NOTE="${4:-}"
CHAT="${TELEGRAM_CHAT:-telegram:8409182833}"
H=/home/nova/.local/bin/hermes

echo "  capturing $NAME ..."
FRAMES=11 GAP_MS=800 node capture-invader.mjs "$ID" "$NAME" >/dev/null 2>&1 || {
  echo "  capture failed — not sending"; exit 1; }

echo "  recording ${SECS}s ..."
node record-invader.mjs "$ID" "$NAME" "$SECS" >/dev/null 2>&1 || {
  echo "  recording failed — sending stills only"; }

# Latest grade for this invader, if one exists.
GRADE=""
if [[ -f .vision-audit.log ]]; then
  GRADE=$(grep "	GRADE	$NAME	" .vision-audit.log 2>/dev/null | tail -1 \
          | grep -oE 'overall=[0-9.]+' | cut -d= -f2)
fi

CAPTION="$NAME"
[[ -n "$GRADE" ]] && CAPTION="$CAPTION — visual score ${GRADE}/10"
[[ -n "$NOTE"  ]] && CAPTION="$CAPTION
$NOTE"

sent=0
if [[ -f "shots/${NAME}-4.png" ]]; then
  $H send --to "$CHAT" "MEDIA:$(pwd)/shots/${NAME}-4.png" >/dev/null 2>&1 && {
    echo "  sent still"; sent=1; }
fi
if [[ -f "clips/${NAME}.mp4" ]]; then
  $H send --to "$CHAT" "MEDIA:$(pwd)/clips/${NAME}.mp4" >/dev/null 2>&1 && {
    echo "  sent clip"; sent=1; }
fi
$H send --to "$CHAT" "$CAPTION" >/dev/null 2>&1 && echo "  sent caption"

[[ "$sent" -eq 1 ]] || { echo "  nothing sent"; exit 1; }
echo "  delivered: $CAPTION"
