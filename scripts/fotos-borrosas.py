#!/usr/bin/env python3
"""Fotos de muestra borrosas para la vista previa del panel.

Donde el cliente todavía no subió fotos, la vista previa muestra las fotos de la demo del
modelo, muy desenfocadas: se entiende dónde va cada foto sin confundirlas con las propias.
Se generan una sola vez (chicas y livianas) y se anotan en modelo.json → "demoBorrosas".

Uso:  python3 scripts/fotos-borrosas.py garden [otro-modelo …]
Necesita Pillow (pip install pillow).
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent / 'public'
LADO, DESENFOQUE, CALIDAD = 600, 0.035, 68  # desenfoque: fracción del lado de la foto

def borrosa(origen: Path, destino: Path):
    im = Image.open(origen).convert('RGB')
    im.thumbnail((LADO, LADO))
    # Las que se ven chicas (testigos, dress code, lugares) necesitan más desenfoque para que se note
    chica = any(x in origen.name for x in ('testigo', 'dress', 'iglesia', 'lugar', 'rsvp', 'instagram'))
    im = im.filter(ImageFilter.GaussianBlur(max(im.size) * DESENFOQUE * (2.2 if chica else 1)))
    destino.parent.mkdir(parents=True, exist_ok=True)
    im.save(destino, 'JPEG', quality=CALIDAD, optimize=True, progressive=True)

# Las comunes (dress code, testigos, lugares)
for f in sorted((RAIZ / 'comun/img').glob('demo-*.jpg')):
    borrosa(f, RAIZ / 'comun/img/borrosas' / f.name)

for modelo in sys.argv[1:]:
    carpeta = RAIZ / 'modelos' / modelo
    manifiesto = {}
    for tipo in sorted(p for p in (carpeta / 'demo').iterdir() if p.is_dir()):
        fotos = sorted(f for f in tipo.glob('*.jpg'))
        for f in fotos:
            borrosa(f, tipo / 'borrosas' / f.name)
        nombres = {f.name for f in fotos}
        portada = sorted(n for n in nombres if n.startswith('hero-banner')) or (['foto1.jpg'] if 'foto1.jpg' in nombres else [])
        galeria = sorted((n for n in nombres if re.match(r'foto\d+\.jpg$', n)), key=lambda n: int(n[4:-4]))
        manifiesto[tipo.name] = {'portada': portada, 'galeria': galeria,
                                 **{k: f'{k}.jpg' for k in ('rsvp', 'instagram') if f'{k}.jpg' in nombres},
                                 'testigos': sorted(n for n in nombres if n.startswith('testigo'))}
    ruta = carpeta / 'modelo.json'
    datos = json.loads(ruta.read_text())
    datos['demoBorrosas'] = manifiesto
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + '\n')
    print(modelo, {k: len(v['galeria']) for k, v in manifiesto.items()})
