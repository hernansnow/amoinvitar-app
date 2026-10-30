#!/usr/bin/env python3
"""Miniaturas de la tienda y del selector de modelos del panel: public/modelos/<modelo>/tienda-<evento>.jpg (600 × 400).

Las que ya existen en la v2.0 (images/banner-*-store.jpg) se copian. Las que faltan se arman con el mismo diseño:
fondo desenfocado de la portada (computadora), el logo "amo invitar!" a la izquierda y un celular con la portada
(celular). Las capturas las saca scripts/conversion/capturas-portada.mjs.

Uso:  python3 -I scripts/miniaturas-tienda.py <repo-v2.0> <carpeta-de-capturas> [modelo …]
Necesita Pillow.
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

APP = Path(__file__).resolve().parent.parent
REPO = Path(sys.argv[1])
CAPTURAS = Path(sys.argv[2])
SOLO = set(sys.argv[3:])
W, H = 1800, 1200

# El banner de la v2.0 de cada modelo y evento (si existe)
def banner(m, ev):
    nombres = {
        'boda': [m], '15': [f'{m}15', 'eucalipto15' if m == 'garden' else None, 'party' if m == 'party' else None],
        'cumple': [f'cumple-{"discoteque" if m == "disco" else m}'],
        'bautismo': [f'bautismo-{m}'], 'comunion': [f'comunion-{m}'],
        'babyshower': [f'baby-shower-{m}'], 'revelacion': ['baby-shower-revelacion'],
        'graduacion': [f'egreso-{m}', 'egreso-discoteque' if m == 'disco' else None, f'graduacion-{m}'],
        'infantil': [f'infantil-{m}'], 'navidad': ['navidad'],
    }.get(ev, [])
    for n in filter(None, nombres):
        f = REPO / 'images' / f'banner-{n}-store.jpg'
        if f.exists(): return f
    return None

def redondeado(tam, r):
    m = Image.new('L', tam, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, tam[0] - 1, tam[1] - 1), r, fill=255)
    return m

def logo():
    im = Image.open(REPO / 'img/amo-invitar-logo-store.png').convert('RGBA')
    im = im.crop((0, 0, im.width, 146))  # sin la palabra "store"
    a = im.getchannel('A')
    blanco = Image.new('RGBA', im.size, (255, 255, 255, 255)); blanco.putalpha(a)
    return blanco.resize((360, int(360 * blanco.height / blanco.width)), Image.LANCZOS)

LOGO = None
def armar(cel, pc, salida):
    global LOGO
    LOGO = LOGO or logo()
    fondo = Image.open(pc).convert('RGB')
    r = max(W / fondo.width, H / fondo.height)
    fondo = fondo.resize((int(fondo.width * r) + 1, int(fondo.height * r) + 1), Image.LANCZOS)
    fondo = fondo.crop(((fondo.width - W) // 2, (fondo.height - H) // 2, (fondo.width - W) // 2 + W, (fondo.height - H) // 2 + H))
    fondo = fondo.filter(ImageFilter.GaussianBlur(22))
    fondo = ImageEnhance.Brightness(fondo).enhance(0.82)
    lienzo = fondo.convert('RGBA')
    # Sombra del celular
    sombra = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sombra).rounded_rectangle((790, 130, 1460, 1400), 100, fill=150)
    lienzo.paste(Image.new('RGBA', (W, H), (0, 0, 0, 255)), (0, 0), sombra.filter(ImageFilter.GaussianBlur(28)))
    # Cuerpo: borde fino claro y marco oscuro
    x0, y0, x1, y1 = 780, 108, 1442, 1320
    d = ImageDraw.Draw(lienzo)
    d.rounded_rectangle((x0, y0, x1, y1), 100, fill=(138, 128, 116, 255))
    d.rounded_rectangle((x0 + 4, y0 + 4, x1 - 4, y1 - 4), 96, fill=(14, 14, 14, 255))
    # Pantalla con la portada del celular
    sx0, sy0, sx1, sy1 = 800, 130, 1422, 1320
    tel = Image.open(cel).convert('RGB')
    tel = tel.resize((sx1 - sx0, int(tel.height * (sx1 - sx0) / tel.width)), Image.LANCZOS)
    pantalla = Image.new('RGB', (sx1 - sx0, sy1 - sy0), (0, 0, 0)); pantalla.paste(tel, (0, 0))
    lienzo.paste(pantalla, (sx0, sy0), redondeado(pantalla.size, 78))
    # Isla de la cámara
    d.rounded_rectangle((1060, 146, 1162, 178), 16, fill=(0, 0, 0, 255))
    # Logo
    lienzo.alpha_composite(LOGO, (359, 530))
    lienzo.convert('RGB').resize((600, 400), Image.LANCZOS).save(salida, quality=84, optimize=True, progressive=True)

modelos = json.loads((APP / 'scripts/conversion/modelos-eventos.json').read_text())
hechas, armadas, faltan = 0, 0, []
for m, eventos in modelos:
    if SOLO and m not in SOLO: continue
    for ev in eventos:
        salida = APP / 'public/modelos' / m / f'tienda-{ev}.jpg'
        b = banner(m, ev)
        if b:
            Image.open(b).convert('RGB').resize((600, 400), Image.LANCZOS).save(salida, quality=84, optimize=True, progressive=True)
            hechas += 1
            continue
        cel, pc = CAPTURAS / f'{ev}-{m}-cel.png', CAPTURAS / f'{ev}-{m}-pc.png'
        if cel.exists() and pc.exists():
            armar(cel, pc, salida); armadas += 1
        else:
            faltan.append(f'{m}/{ev}')
print(f'copiadas {hechas}, armadas {armadas}' + (f', sin captura: {" ".join(faltan)}' if faltan else ''))
