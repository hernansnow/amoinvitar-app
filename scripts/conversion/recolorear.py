#!/usr/bin/env python3
"""Íconos para las versiones de bautismo y comunión de los modelos de 15.

  recolorear.py icono <icono.png> <referencia.png|#hex> <salida.png>
      El ícono exclusivo (pila bautismal, cáliz…) pintado con el color de la imagen que reemplaza
      (el promedio de sus píxeles visibles, por ejemplo la corona dorada del diseño).
  recolorear.py cinta <cinta.png> <salida.png>
      La cinta "Mis 15" de Cinema y Luxury sin el texto del medio (el texto lo pone la invitación).
"""
import sys
from PIL import Image

def color_de(ref):
    if ref.startswith('#'):
        h = ref.lstrip('#'); h = ''.join(c * 2 for c in h) if len(h) == 3 else h
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    im = Image.open(ref).convert('RGBA')
    px = [p for p in (im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()) if p[3] > 200]
    if not px: return (167, 137, 119)
    return tuple(sum(p[i] for p in px) // len(px) for i in range(3))

def icono(origen, ref, salida):
    r, g, b = color_de(ref)
    im = Image.open(origen).convert('RGBA')
    alfa = im.getchannel('A')
    pintado = Image.new('RGBA', im.size, (r, g, b, 255))
    pintado.putalpha(alfa)
    pintado.save(salida, optimize=True)

def cinta(origen, salida):
    im = Image.open(origen).convert('RGBA')
    w, h = im.size
    px = im.load()
    # El texto está calado: los huecos transparentes que no tocan el borde de la imagen se rellenan con el color de la cinta
    from collections import Counter, deque
    fondo = Counter(px[x, y][:3] for x in range(int(w * .3), int(w * .7)) for y in range(h) if px[x, y][3] > 240).most_common(1)[0][0]
    afuera = [[False] * h for _ in range(w)]
    cola = deque()
    for x in range(w):
        cola.append((x, 0)); cola.append((x, h - 1))
    for y in range(h):
        cola.append((0, y)); cola.append((w - 1, y))
    while cola:
        x, y = cola.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or afuera[x][y] or px[x, y][3] > 128: continue
        afuera[x][y] = True
        cola.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    for x in range(w):
        for y in range(h):
            if not afuera[x][y] and px[x, y][3] < 250:
                px[x, y] = (*fondo, 255)
    im.save(salida, optimize=True)

if __name__ == '__main__':
    modo, *a = sys.argv[1:]
    {'icono': icono, 'cinta': cinta}[modo](*a)
