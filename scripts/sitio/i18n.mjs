// README (ronda 40/42) · Traducción de las páginas de la web nueva (inglés, portugués, francés, italiano, alemán, neerlandés).
// El español es la fuente: scripts/sitio/i18n/fuente.json guarda los textos (en orden) y scripts/sitio/i18n/<idioma>.json trae
// la traducción por número ("12": "…"). Lo que no tiene traducción queda en español.
// Portugal (pt-pt) sale del portugués de Brasil con las palabras de allá (aPortugal); si existe i18n/pt-pt.json, lo pisa.
// Cuando se cambia un texto en español, corre `npm run sitio:i18n` para ver qué quedó sin traducir.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const fuente = JSON.parse(readFileSync(join(AQUI, 'i18n/fuente.json'), 'utf8'));
// clave de la web → archivo de traducción
export const ARCHIVO = { en: 'en', 'en-gb': 'en', 'pt-br': 'pt', 'pt-pt': 'pt', fr: 'fr', it: 'it', de: 'de', nl: 'nl' };
export const IDIOMAS = Object.keys(ARCHIVO).filter((l) => existsSync(join(AQUI, `i18n/${ARCHIVO[l]}.json`)));
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const leer = (f) => (existsSync(join(AQUI, f)) ? JSON.parse(readFileSync(join(AQUI, f), 'utf8')) : {});

// Portugués de Brasil → de Portugal (las palabras que cambian). README (ronda 44): con «tu» (tu/teu, podes, cria…), más cercano y joven
const PT = {
  celular: 'telemóvel', celulares: 'telemóveis', tela: 'ecrã', telas: 'ecrãs', equipe: 'equipa', equipes: 'equipas', arquivo: 'ficheiro',
  arquivos: 'ficheiros', cadastro: 'registo', cadastre: 'registe', cadastrar: 'registar', registro: 'registo', registros: 'registos',
  registrar: 'registar', contato: 'contacto', contatos: 'contactos', 'ônibus': 'autocarro', baixar: 'descarregar', baixe: 'descarregue',
  aplicativo: 'aplicação', aplicativos: 'aplicações', 'usuário': 'utilizador', 'usuários': 'utilizadores', fato: 'facto', planejar: 'planear',
  planejamento: 'planeamento', planeje: 'planeie', 'cardápio': 'menu', 'bebê': 'bebé', 'bebês': 'bebés', 'chá de bebê': 'baby shower',
  'câmera': 'câmara', gerenciar: 'gerir', gerencie: 'gira', gerenciamento: 'gestão', gerencia: 'gere', senha: 'palavra-passe', senhas: 'palavras-passe',
  excluir: 'eliminar', exclua: 'elimine', salvar: 'guardar', salve: 'guarde', 'pôster': 'póster', 'econômico': 'económico', 'gênero': 'género',
  'prêmio': 'prémio', 'prêmios': 'prémios', 'acadêmico': 'académico', 'ônus': 'ónus', 'tênis': 'ténis', 'você mesmo': 'tu próprio',
  conosco: 'connosco', cadastros: 'registos', curtem: 'adoram', curtir: 'aproveitar', 'seção': 'secção', 'seções': 'secções', controle: 'controlo', ingresso: 'bilhete', ingressos: 'bilhetes',
  baixa: 'descarrega', baixam: 'descarregam', 'ótimo': 'ótimo', 'time': 'equipa', compartilhar: 'partilhar', compartilhe: 'partilhe', compartilha: 'partilha', compartilhado: 'partilhado', compartilhada: 'partilhada',
};
const RE_PT = new RegExp(`(?<![\\p{L}])(${Object.keys(PT).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}])`, 'giu');
// «você» → «tu»: el verbo pasa a la segunda persona y el pronombre se cae («Você pode» → «Podes»)
const TU_IRREG = { tem: 'tens', 'vê': 'vês', pode: 'podes', quer: 'queres', vai: 'vais', faz: 'fazes', 'é': 'és', 'está': 'estás', fez: 'fizeste', der: 'deres',
  enviou: 'enviaste', 'pôde': 'pudeste', 'dá': 'dás', diz: 'dizes', traz: 'trazes', sabe: 'sabes', consegue: 'consegues' };
const aTuVerbo = (v) => {
  const l = v.toLowerCase();
  if (TU_IRREG[l]) return TU_IRREG[l];
  if (/rá$/.test(l)) return l + 's';                    // verá → verás
  if (/ou$/.test(l)) return l.replace(/ou$/, 'aste');   // escolheu… (pocos)
  if (/[ae]$/.test(l)) return l + 's';                  // paga → pagas, decide → decides
  if (/[aei]r$/.test(l)) return l + 'es';               // (quando) você testar → testares
  return null;
};
const PRON = '(?:os|as|o|a|nos|me|se|lhe|lhes)';
const TU_IMP = { crie: 'cria', veja: 'vê', encontre: 'encontra', escolha: 'escolhe', personalize: 'personaliza', experimente: 'experimenta', pague: 'paga',
  partilhe: 'partilha', conte: 'conta', abra: 'abre', ative: 'ativa', complete: 'completa', selecione: 'seleciona', 'peça': 'pede', receba: 'recebe',
  escreva: 'escreve', adicione: 'adiciona', comece: 'começa', descarregue: 'descarrega', organize: 'organiza', descubra: 'descobre', teste: 'testa',
  envie: 'envia', monte: 'monta', prepare: 'prepara', fale: 'fala', acesse: 'acede', clique: 'clica', toque: 'toca', use: 'usa', aproveite: 'aproveita',
  confira: 'vê', deixe: 'deixa', gira: 'gere', guarde: 'guarda', registe: 'regista', elimine: 'elimina', planeie: 'planeia', diga: 'diz', mande: 'manda',
  convide: 'convida', mostre: 'mostra', faça: 'faz', escaneie: 'digitaliza', suba: 'carrega', some: 'soma', reserve: 'reserva', informe: 'indica', indique: 'indica', preencha: 'preenche',
  escolha: 'escolhe', defina: 'define', carregue: 'carrega', adicione: 'adiciona', edite: 'edita', baixe: 'descarrega' };
const RE_TU_IMP = new RegExp(`(^\\s*|[.!?:;,·—–(]\\s*|(?<![\\p{L}])(?:e|ou)\\s+)(${Object.keys(TU_IMP).join('|')})(?![\\p{L}])`, 'giu');
const may1 = (o, n) => (o[0] !== o[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n);
export function aTu(t) {
  let x = String(t);
  // «Você (não/já/também/só) (os) pode» → «(Não/Já…) (os) podes»
  x = x.replace(new RegExp(`(?<![\\p{L}])(você)\\s+((?:não|já|também|só|ainda|sempre)\\s+)?(${PRON}\\s+)?(\\p{L}+)(?![\\p{L}])`, 'giu'), (m, p, adv, pr, v) => {
    const n = aTuVerbo(v);
    if (!n) return m;
    const pr2 = pr ? pr.replace(/^se(\s)/i, 'te$1') : '';
    const out = `\u0002${adv || ''}${pr2}${n}`; // marca: esta frase le habla a «tu» con un verbo conjugado
    return p[0] === 'V' ? out.replace(/^(\u0002)?(.)/, (z, mk, c) => (mk || '') + c.toUpperCase()) : out;
  });
  // «ajudamos você» → «ajudamos-te»; «para você» → «para ti»; «com você» → «contigo»
  x = x.replace(/(?<![\p{L}])(\p{L}+mos|poupa|leva|ajuda|acompanha|orienta)\s+você(?![\p{L}])/giu, '$1-te');
  x = x.replace(/(?<![\p{L}])com você(?![\p{L}])/giu, (m) => may1(m, 'contigo'));
  x = x.replace(/(?<![\p{L}])(para|de|por|sem|a|até|entre)\s+você(?![\p{L}])/giu, '$1 ti');
  x = x.replace(/(?<![\p{L}])você(?![\p{L}])/giu, (m) => may1(m, 'tu'));
  // Imperativos (de «você» a «tu»)
  x = x.replace(RE_TU_IMP, (m, a, v) => a + may1(v, TU_IMP[v.toLowerCase()]));
  // Verbos encadenados después de uno de «tu»: «vês quem vem, organiza mesas e descarrega» → «organizas… e descarregas»
  x = x.split(/(?<=[.!?:])\s+/).map((f) => {
    if (!f.includes('\u0002') || /cada (pessoa|convidad)/i.test(f)) return f;
    return f.replace(/((?:,|\be|\bnão)\s+)(organiza|descarrega|edita|paga|vê|gere|adiciona|recebe|escolhe|personaliza|guarda|administra|cria|decide|monta|partilha|envia|controla|acompanha|exporta|corrige|muda)(?![\p{L}])/giu,
      (m, a, v) => a + (v.toLowerCase() === 'vê' ? 'vês' : v + 's'));
  }).join(' ');
  // Futuro de subjuntivo: «quando quiser» → «quando quiseres»
  x = x.replace(/(?<![\p{L}])(que|se|quando|como|onde|enquanto|que mais)\s+(quiser|puder|precisar|gostar|preferir|desejar|escolher|tiver|fizer|decidir)(?![\p{L}])/giu, (m, a, v) => `${a} ${v}es`);
  // Posesivos: seu → teu (menos lo que es de cada invitado o de ellos: «Deixam seus recados»)
  x = x.split(/(?<=[.!?])\s+/).map((f) => (/cada (pessoa|convidad)/i.test(f) ? f
    : f.replace(/(?<![\p{L}])(\p{L}+\s+)?(seu|sua|seus|suas)(?![\p{L}])/giu, (m, ant, p) => (ant && /m\s+$/.test(ant) && !/^(com|sem|em)\s/i.test(ant) ? m
      : (ant || '') + may1(p, { seu: 'teu', sua: 'tua', seus: 'teus', suas: 'tuas' }[p.toLowerCase()]))))).join(' ');
  // En Portugal el posesivo lleva artículo: «teu convite» → «o teu convite», «de teu» → «do teu», «com teu» → «com o teu»
  const ART = { teu: 'o', tua: 'a', teus: 'os', tuas: 'as', meu: 'o', minha: 'a', meus: 'os', minhas: 'as' };
  const CONTR = { de: { o: 'do', a: 'da', os: 'dos', as: 'das' }, em: { o: 'no', a: 'na', os: 'nos', as: 'nas' }, por: { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas' }, a: { o: 'ao', a: 'à', os: 'aos', as: 'às' } };
  x = x.replace(/(?<![\p{L}])(?:(\p{L}+)(\s+))?(teu|tua|teus|tuas|meu|minha|meus|minhas)(?=\s+\p{L}|\s*$)/giu, (m, ant, sp, p) => {
    const art = ART[p.toLowerCase()], a = (ant || '').toLowerCase();
    if (/^(o|a|os|as|do|da|dos|das|no|na|nos|nas|ao|à|aos|às|pelo|pela|pelos|pelas|um|uma|este|esta|esse|essa)$/.test(a)) return m;
    if (CONTR[a]) return `${may1(ant, CONTR[a][art])}${sp}${p.toLowerCase()}`;
    return ant ? `${ant}${sp}${art} ${p.toLowerCase()}` : `${may1(p, art)} ${p.toLowerCase()}`;
  });
  return x.replace(/\u0002/g, '');
}
const INF = (v) => v.replace(/ando$/, 'ar').replace(/endo$/, 'er').replace(/indo$/, 'ir');
export function aPortugal(t) {
  return String(t)
    .replace(RE_PT, (m) => { const n = PT[m.toLowerCase()]; return m[0] !== m[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n; })
    .replace(/(?<![\p{L}])em um(?![\p{L}])/gu, 'num').replace(/(?<![\p{L}])em uma(?![\p{L}])/gu, 'numa').replace(/(?<![\p{L}])Em um(?![\p{L}])/gu, 'Num')
    // gerúndio → «a» + infinitivo: «estão confirmando» → «estão a confirmar»
    .replace(/(?<![\p{L}])(estou|está|estão|estamos|ficam|fica|continua|continuam)\s+(\p{L}+(?:ando|endo|indo))(?![\p{L}])/giu, (m, a, v) => `${a} a ${INF(v)}`)
    .replace(/^[\s\S]*$/, (z) => aTu(z));
}

// README (ronda 44): inglés británico (Reino Unido, Irlanda, Australia, Nueva Zelanda) a partir del inglés: ortografía y palabras
const GB = { color: 'colour', colors: 'colours', colored: 'coloured', colorful: 'colourful', favorite: 'favourite', favorites: 'favourites', favor: 'favour',
  honor: 'honour', honored: 'honoured', behavior: 'behaviour', center: 'centre', centers: 'centres', centered: 'centred', gray: 'grey', catalog: 'catalogue',
  catalogs: 'catalogues', jewelry: 'jewellery', traveling: 'travelling', traveler: 'traveller', travelers: 'travellers', canceled: 'cancelled', canceling: 'cancelling',
  labeled: 'labelled', modeling: 'modelling', 'cell phone': 'mobile', 'cell phones': 'mobiles', cellphone: 'mobile', cellphones: 'mobiles', mom: 'mum', moms: 'mums',
  'zip code': 'postcode', 'check out': 'check out', license: 'licence', 'math': 'maths', fulfill: 'fulfil', enrollment: 'enrolment' };
const RE_GB = new RegExp(`(?<![\\p{L}])(${Object.keys(GB).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}])`, 'giu');
// -ize / -ization → -ise / -isation (customize, personalize, organize, realize, recognize, apologize, memorize, finalize, optimize, prioritize…)
const RE_IZE = /(?<![\p{L}])(custom|personal|organ|real|recogn|apolog|memor|final|optim|priorit|synchron|summar|categor|author|util|minim|maxim|special|visual|emphas|characteri)(iz)(e|es|ed|ing|ation|ations|er|ers)(?![\p{L}])/giu;
export function aBritanico(t) {
  return String(t)
    .replace(RE_GB, (m) => { const n = GB[m.toLowerCase()]; return m[0] !== m[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n; })
    .replace(RE_IZE, (m, a, z, b) => a + (z === 'IZ' ? 'IS' : 'is') + b)
    .replace(/(?<![\p{L}])(analy)z(e|es|ed|ing)(?![\p{L}])/giu, '$1s$2');
}

export function cargaMapa(clave) {
  const tr = leer(`i18n/${ARCHIVO[clave]}.json`);
  const propio = clave === 'pt-pt' ? leer('i18n/pt-pt.json') : {};
  const m = new Map();
  for (const [i, v0] of Object.entries(tr)) {
    if (fuente[i] == null || !v0) continue;
    const v = propio[i] || (clave === 'pt-pt' ? aPortugal(v0) : clave === 'en-gb' ? aBritanico(v0) : v0);
    m.set(fuente[i], v);
  }
  return m;
}

const ATRIB = /\b(alt|title|placeholder|aria-label)="([^"]*)"/g;
const ESC = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
export function traducir(html, mapa, lang) {
  const trozos = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<figure class="opinion">[\s\S]*?<\/figure>|<[^>]+>)/);
  const out = trozos.map((x, i) => {
    if (i % 2 === 0) {
      const t = norm(x);
      if (!t || !mapa.has(t)) return x;
      return x.replace(/^(\s*)[\s\S]*?(\s*)$/, (m, a, b) => a + mapa.get(t) + b);
    }
    if (/^<script/.test(x) && /application\/ld\+json/.test(x)) return x.replace(/"((?:[^"\\]|\\.)*)"/g, (m, v) => { const s = norm(JSON.parse(m)); return mapa.has(s) ? JSON.stringify(mapa.get(s)) : m; });
    if (/^<(script|style|figure)/.test(x)) return x;
    // <title> y <meta content> también se traducen
    return x.replace(ATRIB, (m, a, v) => (mapa.has(v.trim()) ? `${a}="${ESC(mapa.get(v.trim()))}"` : m))
      .replace(/\b(content)="([^"]*)"/, (m, a, v) => (mapa.has(v.trim()) ? `${a}="${ESC(mapa.get(v.trim()))}"` : m));
  }).join('');
  return out.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
}

// Textos de las páginas generadas que no tienen traducción todavía (para completar los archivos de idioma)
export function sinTraducir(paginas, mapa) {
  const f = new Set();
  for (const h of paginas) {
    const limpio = h.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<figure class="opinion">[\s\S]*?<\/figure>/g, '');
    for (const m of limpio.matchAll(/>([^<>]+)</g)) { const t = norm(m[1]); if (t.length > 1 && /[A-Za-zÁÉÍÓÚáéíóúñ]/.test(t) && !mapa.has(t)) f.add(t); }
  }
  return [...f];
}
