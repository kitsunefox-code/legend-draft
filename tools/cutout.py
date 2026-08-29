# -*- coding: utf-8 -*-
"""シート画像から各オブジェクトを正確に切り出す。
セルを少し広げて探索し、そのセルの中心に属する連結成分だけを採用するので
隣の絵の混入も、はみ出しによる切れも起きない。"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

def load_rgba(path, dark_bg=False, white_bg=False):
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(np.int16)
    if dark_bg:
        m = (a[...,0] < 30) & (a[...,1] < 30) & (a[...,2] < 30)
        a[...,3][m] = 0
    if white_bg:
        m = (a[...,0] > 243) & (a[...,1] > 243) & (a[...,2] > 243)
        a[...,3][m] = 0
    return Image.fromarray(a.astype(np.uint8))

def cut_grid(path, cols, rows, outdir, prefix,
             size=None, height=None, pad=0.07, dark_bg=False, white_bg=False,
             expand=0.16, square=True, start=1, min_frac=0.02, multi=False):
    im = load_rgba(path, dark_bg, white_bg)
    alpha = np.array(im.split()[-1])
    mask = alpha > 30
    H, W = mask.shape
    cw, ch = W/cols, H/rows
    os.makedirs(outdir, exist_ok=True)
    made = []
    n = start
    for r in range(rows):
        for c in range(cols):
            # セルを少し広げて探索(はみ出したパーツも拾う)
            ex, ey = cw*expand, ch*expand
            x0 = max(0, int(c*cw - ex)); x1 = min(W, int((c+1)*cw + ex))
            y0 = max(0, int(r*ch - ey)); y1 = min(H, int((r+1)*ch + ey))
            sub = mask[y0:y1, x0:x1]
            if sub.sum() < sub.size*min_frac: continue
            lab, cnt = ndimage.label(sub)
            if cnt == 0: continue
            # セル中心に最も近い"大きな"成分を選ぶ(隣の絵の端を拾わない)
            sizes = ndimage.sum(sub, lab, range(1, cnt+1))
            cys, cxs = zip(*ndimage.center_of_mass(sub, lab, range(1, cnt+1)))
            ccx, ccy = (c+0.5)*cw - x0, (r+0.5)*ch - y0
            if multi:
                # 文字や数字のように複数パーツで1つの絵になるもの:
                # セル内に重心がある成分をすべて結合する
                keepIdx = []
                for i in range(cnt):
                    if sizes[i] < sub.size*min_frac*0.12: continue
                    gx, gy = cxs[i]+x0, cys[i]+y0
                    if c*cw <= gx < (c+1)*cw and r*ch <= gy < (r+1)*ch:
                        keepIdx.append(i+1)
                if not keepIdx: continue
                comp = np.isin(lab, keepIdx)
            else:
                best, bestScore = None, -1
                for i in range(cnt):
                    if sizes[i] < sub.size*min_frac: continue
                    d = ((cxs[i]-ccx)**2 + (cys[i]-ccy)**2) ** 0.5
                    score = sizes[i] / (1 + d*d*0.02)
                    if score > bestScore: bestScore, best = score, i+1
                if best is None: continue
                comp = (lab == best)
            ys, xs = np.where(comp)
            bx0, bx1 = x0+xs.min(), x0+xs.max()+1
            by0, by1 = y0+ys.min(), y0+ys.max()+1
            cell = im.crop((bx0, by0, bx1, by1))
            # 選んだ成分だけを残す(隣の絵の切れ端を消す)
            ca = np.array(cell)
            keep = comp[ys.min():ys.max()+1, xs.min():xs.max()+1]
            ca[...,3] = np.where(keep, ca[...,3], 0)
            cell = Image.fromarray(ca)
            w, h = cell.size
            if square:
                s = int(max(w,h) * (1 + pad*2))
                canvas = Image.new("RGBA",(s,s),(0,0,0,0))
                canvas.paste(cell, ((s-w)//2,(s-h)//2), cell)
                if size: canvas = canvas.resize((size,size), Image.LANCZOS)
            else:
                px, py = int(w*pad), int(h*pad)
                canvas = Image.new("RGBA",(w+px*2,h+py*2),(0,0,0,0))
                canvas.paste(cell, (px,py), cell)
                if height:
                    sc = height/canvas.size[1]
                    canvas = canvas.resize((max(1,int(canvas.size[0]*sc)), height), Image.LANCZOS)
            p = os.path.join(outdir, f"{prefix}{n}.png")
            canvas.save(p, "PNG", optimize=True)
            made.append(p); n += 1
    return made

def cut_single(path, outpath, size, pad=0.05, dark_bg=False, white_bg=False):
    im = load_rgba(path, dark_bg, white_bg)
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    w,h = im.size
    s = int(max(w,h)*(1+pad*2))
    canvas = Image.new("RGBA",(s,s),(0,0,0,0))
    canvas.paste(im, ((s-w)//2,(s-h)//2), im)
    canvas.resize((size,size), Image.LANCZOS).save(outpath,"PNG",optimize=True)
    return outpath
