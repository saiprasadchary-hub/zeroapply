import os
import sys

try:
    from PIL import Image, ImageDraw
    print("PIL found!")
except ImportError:
    print("PIL not found")
    sys.exit(1)

src = "/Users/sriman/.gemini/antigravity-ide/brain/d65e69d9-f15d-43a0-934a-e602b94ccdf6/.user_uploaded/media_1793005668856.jpg"
im = Image.open(src).convert("RGBA")
w, h = im.size
print(f"Image size: {w}x{h}")
