#!/usr/bin/env python3
"""Ask the local vision model to critique an invader from its screenshots.

    python3 review-invader.py SPIRE           # reviews shots/SPIRE-*.png
    python3 review-invader.py SPIRE --frames 2

Mechanical checks (verify-invader.mjs) prove an invader is WIRED.
This proves whether it LOOKS good — the part no grep can answer.

Images are downscaled before sending: a full 1280x800 frame costs a lot of
prompt tokens against a finite KV cache, and the judgement here does not need
that resolution.
"""
import argparse, base64, glob, io, json, sys, urllib.request

AP = argparse.ArgumentParser()
AP.add_argument("name")
AP.add_argument("--frames", type=int, default=3)
AP.add_argument("--url", default="http://127.0.0.1:8008/v1/chat/completions")
AP.add_argument("--model", default="qwen3.8")
AP.add_argument("--max-tokens", type=int, default=2000)
AP.add_argument("--width", type=int, default=640)
A = AP.parse_args()

paths = sorted(glob.glob(f"shots/{A.name.upper()}-*.png"))[: A.frames]
if not paths:
    sys.exit(f"no screenshots at shots/{A.name.upper()}-*.png — run capture-invader.mjs first")


def encode(p):
    """Downscale if Pillow is available; otherwise send as-is."""
    raw = open(p, "rb").read()
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(raw))
        if im.width > A.width:
            h = round(im.height * A.width / im.width)
            im = im.convert("RGB").resize((A.width, h))
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=82)
            return base64.b64encode(buf.getvalue()).decode(), "jpeg"
    except Exception:
        pass
    return base64.b64encode(raw).decode(), "png"


PROMPT = f"""These are consecutive frames of the "{A.name.upper()}" invader in a 3D
Space Invaders bestiary. Judge ONLY what you can actually see.

1. SILHOUETTE — is the shape instantly readable, or mush? Could a player tell it
   apart from other invaders at a glance during gameplay?
2. COLOUR / CONTRAST — does it stand out against the dark starfield, or wash out?
3. ANIMATION — comparing the frames, what actually moved? If nothing changed,
   say so plainly; a static model is a defect.
4. WORST FLAW — the single biggest visual problem.
5. ONE FIX — the most valuable concrete change, specific enough to implement.

Be blunt. If it looks bad, say it looks bad. Do not invent detail you cannot see
— if a frame is blank or black, report that instead of describing a model."""

content = [{"type": "text", "text": PROMPT}]
for p in paths:
    b64, fmt = encode(p)
    content.append({"type": "image_url",
                    "image_url": {"url": f"data:image/{fmt};base64,{b64}"}})

body = json.dumps({"model": A.model, "max_tokens": A.max_tokens,
                   "temperature": 0.7,
                   "messages": [{"role": "user", "content": content}]}).encode()
req = urllib.request.Request(A.url, data=body,
                             headers={"Content-Type": "application/json"})
print(f"  reviewing {len(paths)} frames of {A.name.upper()} ...")
try:
    with urllib.request.urlopen(req, timeout=900) as r:
        d = json.load(r)
except Exception as e:
    sys.exit(f"  request failed: {str(e)[:300]}")

msg = d["choices"][0]["message"]
txt = (msg.get("content") or "").strip()
u = d.get("usage", {})
print(f"  prompt_tokens={u.get('prompt_tokens')} completion={u.get('completion_tokens')} "
      f"finish={d['choices'][0]['finish_reason']}\n")
print(txt if txt else "  (empty response — raise --max-tokens; the model reasons before answering)")
