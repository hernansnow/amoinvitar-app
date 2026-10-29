// Lee la lista de invitados desde un Excel (.xlsx) o un CSV, sin librerías.
// Un .xlsx es un ZIP con XML adentro: se lee la primera hoja con las
// herramientas del navegador (DecompressionStream).
// Columnas: si hay títulos ("Nombre", "Pases", "Mesa"…) se usan en cualquier
// orden; si no, se toman A = nombre, B = pases extra, C = mesa.

const TITULOS = {
  nombre: /^(nombre|nombres|invitado|invitados|familia|name|guest)/,
  pases: /(pase|acompa|extra|plus|adicional|cupo|lugares)/,
  mesa: /^(mesa|table|n.? de mesa)/,
  integrantes: /(integrante|miembro|quienes|quiénes|members)/,
  telefono: /(tel|cel|whats|movil|móvil|phone)/,
};

export async function leerPlanilla(archivo) {
  const esXlsx = /\.xlsx$/i.test(archivo.name) || archivo.type.includes('spreadsheetml');
  if (/\.vcf$/i.test(archivo.name) || /vcard/i.test(archivo.type)) return leerVcf(await archivo.text());
  if (/\.xls$/i.test(archivo.name)) throw new Error('Guardar el Excel como .xlsx (o .csv) y volver a subirlo');
  const filas = esXlsx ? await filasXlsx(await archivo.arrayBuffer()) : filasCsv(await archivo.text());
  return aInvitados(filas);
}

function aInvitados(filas) {
  filas = filas.map((f) => f.map((x) => String(x ?? '').trim())).filter((f) => f.some(Boolean));
  if (!filas.length) return [];
  const cab = filas[0].map((x) => x.toLowerCase());
  const col = Object.fromEntries(Object.entries(TITULOS).map(([k, re]) => [k, cab.findIndex((x) => re.test(x))]));
  const conTitulos = col.nombre >= 0;
  const idx = conTitulos ? col : { nombre: 0, pases: 1, mesa: 2 };
  return (conTitulos ? filas.slice(1) : filas).map((f) => ({
    nombre: (f[idx.nombre] || '').slice(0, 80),
    pases: Math.max(0, parseInt(f[idx.pases], 10) || 0),
    mesa: idx.mesa >= 0 ? (f[idx.mesa] || '').slice(0, 20) : '',
    integrantes: idx.integrantes >= 0 ? (f[idx.integrantes] || '').slice(0, 400) : '',
    telefono: idx.telefono >= 0 ? (f[idx.telefono] || '').slice(0, 30) : '',
  })).filter((i) => i.nombre);
}

// Contactos exportados del celular (.vcf, vCard): nombre y primer teléfono de cada uno
export function leerVcf(texto) {
  const lineas = texto.replace(/\r?\n[ \t]/g, '').split(/\r?\n/); // las líneas largas siguen con un espacio
  const salida = []; let c = null;
  const valor = (l) => {
    const [cab, ...resto] = l.split(':'); let v = resto.join(':');
    if (/ENCODING=QUOTED-PRINTABLE/i.test(cab)) {
      const bytes = []; v.replace(/=([0-9A-F]{2})|(.)/gi, (_, hex, ch) => { if (hex) bytes.push(parseInt(hex, 16)); else bytes.push(...new TextEncoder().encode(ch)); return ''; });
      v = new TextDecoder().decode(new Uint8Array(bytes));
    }
    return v.replace(/\\([,;\\])/g, '$1').trim();
  };
  for (const l of lineas) {
    if (/^BEGIN:VCARD/i.test(l)) c = { nombre: '', telefono: '', n: '' };
    else if (/^END:VCARD/i.test(l) && c) { const nombre = c.nombre || c.n; if (nombre) salida.push({ nombre: nombre.slice(0, 80), pases: 0, mesa: '', telefono: c.telefono }); c = null; }
    else if (c && /^FN[:;]/i.test(l)) c.nombre = valor(l);
    else if (c && /^N[:;]/i.test(l)) { const [ap, nom] = valor(l).split(';'); c.n = [nom, ap].filter(Boolean).join(' ').trim(); }
    else if (c && /^(item\d+\.)?TEL[:;]/i.test(l) && !c.telefono) c.telefono = valor(l).replace(/[^\d+]/g, '');
  }
  return salida;
}

function filasCsv(texto) {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/);
  const sep = [';', '\t', ','].find((s) => lineas[0]?.includes(s)) || ',';
  return lineas.map((l) => {
    const celdas = []; let actual = '', comillas = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (comillas) { if (c === '"' && l[i + 1] === '"') { actual += '"'; i++; } else if (c === '"') comillas = false; else actual += c; }
      else if (c === '"') comillas = true;
      else if (c === sep) { celdas.push(actual); actual = ''; }
      else actual += c;
    }
    celdas.push(actual);
    return celdas;
  });
}

// ── ZIP mínimo: busca los archivos en el directorio central ─────────────
async function archivosZip(buf) {
  const d = new DataView(buf);
  let fin = buf.byteLength - 22;
  while (fin >= 0 && d.getUint32(fin, true) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('El archivo no es un Excel válido');
  const total = d.getUint16(fin + 10, true);
  let p = d.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  const salida = {};
  for (let n = 0; n < total; n++) {
    const metodo = d.getUint16(p + 10, true), tam = d.getUint32(p + 20, true);
    const lnom = d.getUint16(p + 28, true), lext = d.getUint16(p + 30, true), lcom = d.getUint16(p + 32, true);
    const local = d.getUint32(p + 42, true);
    const nombre = dec.decode(new Uint8Array(buf, p + 46, lnom));
    salida[nombre] = async () => {
      const ini = local + 30 + d.getUint16(local + 26, true) + d.getUint16(local + 28, true);
      const datos = new Uint8Array(buf, ini, tam);
      if (metodo === 0) return dec.decode(datos);
      const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(flujo).text();
    };
    p += 46 + lnom + lext + lcom;
  }
  return salida;
}

async function filasXlsx(buf) {
  const z = await archivosZip(buf);
  const xml = (t) => new DOMParser().parseFromString(t, 'application/xml');
  const compartidos = z['xl/sharedStrings.xml']
    ? [...xml(await z['xl/sharedStrings.xml']()).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''))
    : [];
  const hoja = Object.keys(z).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  if (!hoja) throw new Error('El Excel no tiene hojas');
  const doc = xml(await z[hoja]());
  const col = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  return [...doc.getElementsByTagName('row')].map((fila) => {
    const celdas = [];
    for (const c of fila.getElementsByTagName('c')) {
      const tipo = c.getAttribute('t');
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      const texto = tipo === 's' ? compartidos[Number(v)] ?? ''
        : tipo === 'inlineStr' ? [...c.getElementsByTagName('t')].map((t) => t.textContent).join('')
          : v;
      celdas[col(c.getAttribute('r') || 'A')] = texto;
    }
    return Array.from(celdas, (x) => x ?? '');
  });
}
