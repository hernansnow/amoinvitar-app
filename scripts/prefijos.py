# Genera public/panel/prefijos.json: zona horaria → prefijo telefónico y un número de ejemplo.
# Uso: python3 -I scripts/prefijos.py <carpeta del paquete libphonenumber-js (MIT)> src/datos/zonas.js public/panel/prefijos.json
# Zona → país sale de /usr/share/zoneinfo/zone.tab; país → prefijo y ejemplo, de libphonenumber-js.
import json, sys, re
lpn, zonas_js, salida = sys.argv[1], sys.argv[2], sys.argv[3]
meta = json.load(open(lpn + '/metadata.min.json'))
ejemplos = json.load(open(lpn + '/examples.mobile.json'))
iso_cod = {}
for cod, paises in meta['country_calling_codes'].items():
    for p in paises: iso_cod.setdefault(p, cod)
tz_iso = {}
for f in ['/usr/share/zoneinfo/zone.tab']:
    for l in open(f):
        if l.startswith('#') or not l.strip(): continue
        c = l.split('\t'); tz_iso[c[2].strip()] = c[0]
zonas = json.loads(re.search(r'export const ZONAS = (\[.*\]);', open(zonas_js).read(), re.S).group(1))
out, falta = {}, []
for z in zonas:
    iso = tz_iso.get(z['v'])
    cod = iso_cod.get(iso)
    if not cod: falta.append(z['v']); continue
    ej = ejemplos.get(iso, '')
    out[z['v']] = {'cod': '+' + cod, 'ej': ('+' + cod + ' ' + ej) if ej else '+' + cod}
json.dump(out, open(salida, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'zonas; sin prefijo:', falta[:10], len(falta))
