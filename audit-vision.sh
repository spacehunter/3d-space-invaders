#!/usr/bin/env bash
# Did the agent actually look at its work, or just say it did?
#
#   ./audit-vision.sh VOIDWORM [since-ISO]
#
# Checks the tool-written audit log against the PNGs on disk. The agent cannot
# produce these hashes without having actually rendered the frames, so this is
# evidence independent of anything it reports.
set -uo pipefail

NAME="${1:?usage: audit-vision.sh <NAME> [since-ISO]}"
NAME="$(echo "$NAME" | tr '[:lower:]' '[:upper:]')"
SINCE="${2:-}"
LOG=".vision-audit.log"

echo "  audit for $NAME${SINCE:+ since $SINCE}"
echo

if [[ ! -f "$LOG" ]]; then
  echo "  NO AUDIT LOG — the vision tools have never run in this repo."
  echo "  Any claim of having looked at the invader is UNSUPPORTED."
  exit 1
fi

rows=$(grep -P "\t$NAME\t" "$LOG" 2>/dev/null || grep "	$NAME	" "$LOG" 2>/dev/null)
[[ -n "$SINCE" ]] && rows=$(awk -v s="$SINCE" '$1 >= s' <<<"$rows")

if [[ -z "$rows" ]]; then
  echo "  NO ENTRIES for $NAME${SINCE:+ since $SINCE}."
  echo "  VERDICT: the agent did NOT capture or review this invader."
  exit 1
fi

caps=$(grep -c CAPTURE <<<"$rows" || true)
revs=$(grep -c REVIEW  <<<"$rows" || true)
echo "  captures: $caps    reviews: $revs"
echo
sed 's/^/    /' <<<"$rows"
echo

# Does the newest capture still match the PNGs on disk?
last=$(grep CAPTURE <<<"$rows" | tail -1)
if [[ -n "$last" ]]; then
  logged=$(grep -oE 'sha=[0-9a-f,]+' <<<"$last" | cut -d= -f2)
  n=1; ok=0; bad=0
  IFS=',' read -ra want <<< "$logged"
  for h in "${want[@]}"; do
    f="shots/${NAME}-${n}.png"
    if [[ -f "$f" ]]; then
      have=$(sha256sum "$f" | cut -c1-12)
      [[ "$have" == "$h" ]] && ok=$((ok+1)) || bad=$((bad+1))
    else
      bad=$((bad+1))
    fi
    n=$((n+1))
  done
  echo "  newest capture vs files on disk: $ok match, $bad differ/missing"
  span=$(grep -oE 'span=[0-9.]+s' <<<"$last")
  echo "  coverage: $span  (must exceed the invader's animation period)"
fi

echo
if [[ "$caps" -ge 1 && "$revs" -ge 1 ]]; then
  echo "  VERDICT: captured AND reviewed — the claim is supported."
else
  [[ "$caps" -ge 1 ]] && echo "  VERDICT: captured but NEVER REVIEWED — it took pictures and did not look."
  [[ "$revs" -ge 1 && "$caps" -eq 0 ]] && echo "  VERDICT: reviewed with no capture in window — reviewed STALE images."
  exit 1
fi
