# -*- coding: utf-8 -*-
"""ホーム画面アイコンを生成する。
使い方:  python tools/make_icons.py <元画像のパス>
出力:    icons/icon-180.png (iOS) / icon-192.png / icon-512.png / icon-maskable-512.png / favicon-32.png
"""
import sys, os
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.exists(SRC):
    print("元画像が見つかりません:", SRC); sys.exit(1)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "icons")
os.makedirs(out, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
# 正方形に整える(中央基準でトリミング)
w, h = im.size
s = min(w, h)
im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))

def save(size, name, bg=None, scale=1.0):
    canvas = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    inner = int(size * scale)
    r = im.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(r, (off, off), r)
    p = os.path.join(out, name)
    canvas.convert("RGB" if bg else "RGBA").save(p, "PNG", optimize=True)
    print("wrote", name, os.path.getsize(p), "bytes")

# iOSは角丸を自動で付け、透過を黒く塗るので背景色を敷く
save(180, "icon-180.png", bg=(13, 20, 32, 255))
save(192, "icon-192.png", bg=(13, 20, 32, 255))
save(512, "icon-512.png", bg=(13, 20, 32, 255))
# Androidのマスカブル用は安全領域(80%)に収める
save(512, "icon-maskable-512.png", bg=(13, 20, 32, 255), scale=0.80)
save(32, "favicon-32.png", bg=(13, 20, 32, 255))
print("done ->", out)
