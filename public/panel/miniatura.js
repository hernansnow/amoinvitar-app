// Miniatura para compartir el link (WhatsApp, Facebook…): 1200 × 630.
// Se arma en el navegador del cliente con un canvas y se sube como JPG,
// así el servidor no tiene que dibujar nada.
//   · con foto y "imagen sola": la foto recortada en su punto de interés
//   · con foto y "imagen y nombres": la foto con un degradé y los nombres
//   · sin ninguna foto: el fondo del diseño con los nombres

const ANCHO = 1200, ALTO = 630;

function cargar(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}

function cubrir(ctx, img, pos = '50% 50%') {
  const [px, py] = pos.split(' ').map((x) => parseFloat(x) / 100);
  const escala = Math.max(ANCHO / img.width, ALTO / img.height);
  const w = img.width * escala, h = img.height * escala;
  ctx.drawImage(img, (ANCHO - w) * (isNaN(px) ? 0.5 : px), (ALTO - h) * (isNaN(py) ? 0.5 : py), w, h);
}

function textoQueEntre(ctx, texto, fuente, tam, max) {
  let t = tam;
  do { ctx.font = `${t}px ${fuente}`; t -= 4; } while (ctx.measureText(texto).width > max && t > 40);
}

export async function armarMiniatura({ foto, pos, nombres, fecha, conTexto, estilo = {} }) {
  const fTit = `"${estilo.fuenteTitulos || 'Great Vibes'}"`, fTxt = `"${estilo.fuenteTexto || 'Jost'}"`;
  await Promise.all([document.fonts.load(`120px ${fTit}`, nombres), document.fonts.load(`34px ${fTxt}`)]).catch(() => {});
  const c = document.createElement('canvas');
  c.width = ANCHO; c.height = ALTO;
  const ctx = c.getContext('2d');
  const sinFoto = !foto;
  const conNombres = conTexto || sinFoto;

  if (foto) cubrir(ctx, await cargar(foto), pos);
  else {
    ctx.fillStyle = estilo.colorFondo || '#86a388';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    if (estilo.fondo) { try { cubrir(ctx, await cargar(estilo.fondo)); } catch { /* sin fondo */ } }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
  }

  if (conNombres) {
    if (!sinFoto) {
      const g = ctx.createLinearGradient(0, ALTO * 0.35, 0, ALTO);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.6)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, ANCHO, ALTO);
    }
    const color = sinFoto ? (estilo.colorTitulos || '#a78977') : '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.shadowColor = sinFoto ? 'transparent' : 'rgba(0,0,0,.35)'; ctx.shadowBlur = 12;
    const yNombres = sinFoto ? ALTO / 2 + 30 : ALTO - 130;
    textoQueEntre(ctx, nombres, fTit, 140, ANCHO - 120);
    ctx.fillText(nombres, ANCHO / 2, yNombres);
    if (fecha) {
      ctx.font = `500 34px ${fTxt}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
      ctx.fillText(fecha, ANCHO / 2, yNombres + 70);
    }
  }
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.85));
}

// Achica una foto antes de subirla (más rápido para el cliente y para los invitados)
export async function achicarFoto(archivo, lado = 1800) {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) throw new Error('Formato no permitido');
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  if (escala === 1 && archivo.size < 900 * 1024 && archivo.type !== 'image/png') return archivo;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * escala); c.height = Math.round(bmp.height * escala);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const tipo = archivo.type === 'image/png' && /logo/i.test(archivo.name) ? 'image/png' : 'image/jpeg';
  return new Promise((ok) => c.toBlob((b) => ok(new File([b], archivo.name.replace(/\.\w+$/, tipo === 'image/png' ? '.png' : '.jpg'), { type: tipo })), tipo, 0.84));
}
