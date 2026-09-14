import base64, json, sys, urllib.request
from PIL import Image

path = sys.argv[1] if len(sys.argv) > 1 else 'shots/VOIDWORM-2.png'
im = Image.open(path).convert('RGB')
im.thumbnail((768, 480))
im.save('/tmp/vw-q.jpg', quality=80)
b = base64.b64encode(open('/tmp/vw-q.jpg', 'rb').read()).decode()
q = ("This 3D creature is a vertical chain of purple crystal segments with two "
     "arms hanging beside its mid-body. Answer precisely: (1) Is each arm visually "
     "ATTACHED to the body, or floating beside it with a visible gap? (2) Are the "
     "two arms at the SAME height as each other? (3) Do they read as mirror-image "
     "pairs? Answer in 3 short lines.")
req = urllib.request.Request(
    'http://127.0.0.1:8006/v1/chat/completions',
    data=json.dumps({
        "model": "qwen3.8-flash-next",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b}"}},
            {"type": "text", "text": q}]}],
        "max_tokens": 300}).encode(),
    headers={'Content-Type': 'application/json'})
r = json.load(urllib.request.urlopen(req, timeout=120))
print(r['choices'][0]['message']['content'])
