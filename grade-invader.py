#!/usr/bin/env python3
"""Grade an invader's appearance from its screenshots, on a fixed rubric.

    python3 grade-invader.py VOIDWORM --frames 6

Prose critique alone gives an agent no way to tell whether iteration 2 beat
iteration 1, or when to stop. This returns NUMBERS on the same rubric every
time, appends them to .vision-audit.log, and prints the score history so the
trajectory is visible.

Target: OVERALL >= 8. Keep iterating until you hit it or run out of ideas.
"""
import argparse, base64, datetime, glob, hashlib, io, json, os, re, sys, urllib.request

AP = argparse.ArgumentParser()
AP.add_argument("name")
AP.add_argument("--frames", type=int, default=6)
AP.add_argument("--url", default="http://127.0.0.1:8006/v1/chat/completions")
AP.add_argument("--model", default="qwen3.6")
AP.add_argument("--max-tokens", type=int, default=6000)
AP.add_argument("--width", type=int, default=640)
AP.add_argument("--target", type=float, default=8.0)
A = AP.parse_args()
NAME = A.name.upper()
LOG = ".vision-audit.log"

paths = sorted(glob.glob(f"shots/{NAME}-*.png"),
               key=lambda p: int(re.search(r"-(\d+)\.png$", p).group(1)))[: A.frames]
if not paths:
    sys.exit(f"no screenshots at shots/{NAME}-*.png — run capture-invader.mjs first")


def encode(p):
    raw = open(p, "rb").read()
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(raw))
        if im.width > A.width:
            h = round(im.height * A.width / im.width)
            im = im.convert("RGB").resize((A.width, h))
            b = io.BytesIO(); im.save(b, format="JPEG", quality=82)
            return base64.b64encode(b.getvalue()).decode(), "jpeg"
    except Exception:
        pass
    return base64.b64encode(raw).decode(), "png"


RUBRIC = f"""You are grading the visual quality of the "{NAME}" invader in a 3D
Space Invaders game. These are consecutive frames from its Bestiary entry.

Grade ONLY what you can see. Score each 0-10, where:
  0-3 = broken/unreadable   4-6 = functional but dull   7-8 = good   9-10 = outstanding

SILHOUETTE   - instantly readable shape? distinct from other invaders at a glance?
CONTRAST     - holds its edges against the black starfield? bloom accents rather than masks?
ANIMATION    - comparing frames, does the MESH visibly move? (glow-only pulsing scores <= 4)
DETAIL       - does the model reward a close look, or is it a few flat blocks?
COHESION     - does it read as one designed creature rather than stacked primitives?

Reply with a JSON object FIRST, on one line, then your prose notes after it:

{{"silhouette":N,"contrast":N,"animation":N,"detail":N,"cohesion":N,"overall":N,
"worst_flaw":"one sentence","one_fix":"one concrete implementable change"}}

OVERALL is your holistic judgement, not an average. Target is {A.target}+.
Be harsh. A 7 should mean genuinely good. If frames are blank or black, say so
and score 0 rather than inventing a description."""

content = [{"type": "text", "text": RUBRIC}]
for p in paths:
    b64, fmt = encode(p)
    content.append({"type": "image_url", "image_url": {"url": f"data:image/{fmt};base64,{b64}"}})

body = json.dumps({"model": A.model, "max_tokens": A.max_tokens, "temperature": 0.6,
                   "messages": [{"role": "user", "content": content}]}).encode()
print(f"  grading {len(paths)} frames of {NAME} ...")
try:
    req = urllib.request.Request(A.url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=1200) as r:
        d = json.load(r)
except Exception as e:
    sys.exit(f"  request failed: {str(e)[:300]}")

msg = d["choices"][0]["message"]
txt = (msg.get("content") or "").strip()
u = d.get("usage", {})
fin = d["choices"][0]["finish_reason"]

if not txt:
    sys.exit(f"  EMPTY response (finish={fin}, completion={u.get('completion_tokens')}) "
             f"— raise --max-tokens; the model reasons before answering")

m = re.search(r"\{.*?\}", txt, re.S)
scores = {}
if m:
    try:
        scores = json.loads(m.group(0))
    except Exception:
        pass

sha = ",".join(hashlib.sha256(open(p, "rb").read()).hexdigest()[:12] for p in paths)
ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
with open(LOG, "a") as f:
    f.write("\t".join([
        ts, "GRADE", NAME,
        "frames=%d" % len(paths),
        "overall=%s" % scores.get("overall", "?"),
        "silhouette=%s" % scores.get("silhouette", "?"),
        "contrast=%s" % scores.get("contrast", "?"),
        "animation=%s" % scores.get("animation", "?"),
        "detail=%s" % scores.get("detail", "?"),
        "cohesion=%s" % scores.get("cohesion", "?"),
        "prompt_tokens=%s" % u.get("prompt_tokens"),
        "sha=%s" % sha,
    ]) + "\n")

print(f"  prompt_tokens={u.get('prompt_tokens')} completion={u.get('completion_tokens')} finish={fin}\n")
print(txt)

# trajectory — the whole point of grading
hist = []
if os.path.exists(LOG):
    for line in open(LOG):
        if f"\tGRADE\t{NAME}\t" in line:
            o = re.search(r"overall=([\d.]+)", line)
            t = line.split("\t")[0][11:19]
            if o:
                hist.append((t, float(o.group(1))))
if hist:
    print("\n  SCORE HISTORY for %s:" % NAME)
    for i, (t, v) in enumerate(hist):
        delta = "" if i == 0 else "  (%+.1f)" % (v - hist[i - 1][1])
        print("    %s  overall %.1f%s" % (t, v, delta))
    cur = hist[-1][1]
    print("\n  target %.1f — %s" % (A.target,
          "REACHED, stop iterating" if cur >= A.target else
          "NOT reached, iterate again (fix: see one_fix above)"))
    sys.exit(0 if cur >= A.target else 2)
