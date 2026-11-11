// README (ronda 44) · La página /bodas le habla a la pareja: de «tú» a «ustedes» (o «vosotros» en España) y, en los otros
// idiomas, al plural (voi, ihr, jullie, vocês). Se aplica solo a esa página y no toca lo que va dirigido a los invitados
// («Busca tu mesa», «¡Comparte tus fotos!») ni lo de profesionales. El francés («vous») y el inglés («you») ya sirven.

const mayus = (o, n) => (o[0] !== o[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n);
const B = (p) => `(?<![\\p{L}\\p{N}_-])(?:${p})(?![\\p{L}\\p{N}_-])`;
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tablaRe = (t) => new RegExp(B(Object.keys(t).sort((a, b) => b.length - a.length).map(esc).join('|')), 'giu');
const reemplaza = (s, t, re, i) => s.replace(re, (m) => { const v = t[m.toLowerCase()]; return v === undefined ? m : mayus(m, Array.isArray(v) ? v[i] : v); });
const imperativos = (t, re, tabla, i) => t.replace(re, (m, a, v) => { const n = tabla[v.toLowerCase()]; return a + mayus(v, Array.isArray(n) ? n[i] : n); });
const reImp = (tabla, conj) => new RegExp(`(^\\s*|[.!?¡¿:;,·—–(]\\s*|(?<![\\p{L}])(?:${conj})\\s+)(${Object.keys(tabla).map(esc).join('|')})(?![\\p{L}])`, 'giu');

// ── Español: [ustedes, vosotros] ──
// Presente, subjuntivo, imperativos con pronombre y pronombres (siempre son de la segunda persona)
const ES = {
  compartes: ['comparten', 'compartís'], gestionas: ['gestionan', 'gestionáis'], descargas: ['descargan', 'descargáis'], pagas: ['pagan', 'pagáis'],
  ves: ['ven', 'veis'], guardas: ['guardan', 'guardáis'], administras: ['administran', 'administráis'], editas: ['editan', 'editáis'],
  organizas: ['organizan', 'organizáis'], puedes: ['pueden', 'podéis'], tienes: ['tienen', 'tenéis'], corriges: ['corrigen', 'corregís'],
  'diseñas': ['diseñan', 'diseñáis'], decides: ['deciden', 'decidís'], sabes: ['saben', 'sabéis'], evitas: ['evitan', 'evitáis'], armas: ['arman', 'armáis'],
  quieres: ['quieren', 'queréis'], necesitas: ['necesitan', 'necesitáis'], eliges: ['eligen', 'elegís'], recibes: ['reciben', 'recibís'], mandas: ['mandan', 'mandáis'],
  prefieres: ['prefieren', 'preferís'], haces: ['hacen', 'hacéis'], empiezas: ['empiezan', 'empezáis'], personalizas: ['personalizan', 'personalizáis'],
  activas: ['activan', 'activáis'], completas: ['completan', 'completáis'], cambias: ['cambian', 'cambiáis'], subes: ['suben', 'subís'], sumas: ['suman', 'sumáis'],
  agregas: ['agregan', 'agregáis'], 'envías': ['envían', 'enviáis'], usas: ['usan', 'usáis'], buscas: ['buscan', 'buscáis'], miras: ['miran', 'miráis'],
  creas: ['crean', 'creáis'], publicas: ['publican', 'publicáis'], cargas: ['cargan', 'cargáis'], eres: ['son', 'sois'], 'estás': ['están', 'estáis'],
  vas: ['van', 'vais'], preparas: ['preparan', 'preparáis'], contratas: ['contratan', 'contratáis'], invitas: ['invitan', 'invitáis'], imprimes: ['imprimen', 'imprimís'],
  decidas: ['decidan', 'decidáis'], quieras: ['quieran', 'queráis'], elijas: ['elijan', 'elijáis'], prefieras: ['prefieran', 'prefiráis'], tengas: ['tengan', 'tengáis'],
  puedas: ['puedan', 'podáis'], necesites: ['necesiten', 'necesitéis'], pagues: ['paguen', 'paguéis'], publiques: ['publiquen', 'publiquéis'],
  'diséñala': ['diséñenla', 'diseñadla'], 'mírala': ['mírenla', 'miradla'], 'míralo': ['mírenlo', 'miradlo'], 'pruébala': ['pruébenla', 'probadla'],
  'pruébalo': ['pruébenlo', 'probadlo'], 'personalízala': ['personalícenla', 'personalizadla'], 'escríbenos': ['escríbannos', 'escribidnos'],
  'cuéntanos': ['cuéntennos', 'contadnos'], 'compártela': ['compártanla', 'compartidla'], 'descárgala': ['descárguenla', 'descargadla'],
  'elígelo': ['elíjanlo', 'elegidlo'], 'olvídate': ['olvídense', 'olvidaos'],
  'tú': ['ustedes', 'vosotros'], ti: ['ustedes', 'vosotros'], contigo: ['con ustedes', 'con vosotros'], te: ['les', 'os'],
  tuyo: ['suyo', 'vuestro'], tuya: ['suya', 'vuestra'], tuyos: ['suyos', 'vuestros'], tuyas: ['suyas', 'vuestras'],
};
// Imperativos sueltos: solo al empezar una frase o después de «y» / «o» (si no, pueden ser la tercera persona: «el panel crea…»)
const ES_IMP = {
  prueba: ['prueben', 'probad'], elige: ['elijan', 'elegid'], personaliza: ['personalicen', 'personalizad'], mira: ['miren', 'mirad'],
  encuentra: ['encuentren', 'encontrad'], comparte: ['compartan', 'compartid'], cuenta: ['cuenten', 'contad'], abre: ['abran', 'abrid'],
  administra: ['administren', 'administrad'], completa: ['completen', 'completad'], selecciona: ['seleccionen', 'seleccionad'], pide: ['pidan', 'pedid'],
  activa: ['activen', 'activad'], paga: ['paguen', 'pagad'], recibe: ['reciban', 'recibid'], crea: ['creen', 'cread'], suma: ['sumen', 'sumad'],
  descarga: ['descarguen', 'descargad'], 'diseña': ['diseñen', 'diseñad'], empieza: ['empiecen', 'empezad'], gestiona: ['gestionen', 'gestionad'],
  organiza: ['organicen', 'organizad'], reserva: ['reserven', 'reservad'], haz: ['hagan', 'haced'], escribe: ['escriban', 'escribid'],
  agrega: ['agreguen', 'agregad'], publica: ['publiquen', 'publicad'], ahorra: ['ahorren', 'ahorrad'],
};
const RE_ES = tablaRe(ES);
const RE_ES_IMP = reImp(ES_IMP, 'y|o');
// Posesivos: «tu boda» → «su boda» / «vuestra boda» (el género, por la palabra que sigue)
const FEM = /^(boda|invitaci[oó]n|cuenta|historia|sesi[oó]n|fiesta|lista|moneda|fecha|celebraci[oó]n|familia|foto|p[aá]gina|mesa|empresa|marca|web|idea|m[uú]sica|direcci[oó]n|agenda|galer[ií]a|tarjeta|portada|confirmaci[oó]n|propia|ciudad|pareja|vida|computadora|billetera)$/i;
const MASC = /^(d[ií]a|mapa|tema|idioma|programa|sistema|problema|planeta|clima)$/i;
const posesivo = (t, i) => t.replace(/(?<![\p{L}])(tus?)(\s+)(\p{L}+)/giu, (m, p, sp, w) => {
  const plu = p.length === 3;
  if (i === 0) return mayus(p, plu ? 'sus' : 'su') + sp + w;
  const base = plu ? w.replace(/e?s$/i, '') : w;
  const fem = !MASC.test(base) && (FEM.test(base) || FEM.test(w) || /a$/i.test(base) || /(ión|dad)$/i.test(base));
  return mayus(p, `vuestr${fem ? 'a' : 'o'}${plu ? 's' : ''}`) + sp + w;
});
// Frases que se escriben enteras (pedidas así)
const FRASES_ES = [
  [/Compartes por WhatsApp, tus invitados confirman asistencia con un clic, tú gestionas y descargas la lista\. Además, van a agendar la fecha, ver el mapa, elegir menú, conocer el código de vestimenta, regalos, mesa asignada, sugerir canciones, álbum QR y mucho más\./,
    ['Lo comparten por WhatsApp, sus invitados confirman asistencia con un clic, ustedes gestionan y descargan la lista. Además, pueden agendar la fecha, ver el mapa, elegir menú, conocer el código de vestimenta, regalos, mesa asignada, sugerir canciones, álbum QR y mucho más.',
      'Lo compartís por WhatsApp, vuestros invitados confirman asistencia con un clic, y vosotros gestionáis y descargáis la lista. Además, pueden agendar la fecha, ver el mapa, elegir menú, conocer el código de vestimenta, los regalos, su mesa asignada, sugerir canciones, acceder al álbum QR y mucho más.']],
];
// Las preguntas frecuentes las hace la pareja: «¿Puedo…? ¿mis invitados?» → «¿Podemos…? ¿nuestros invitados?»
const YO = { puedo: 'podemos', pago: 'pagamos', 'envío': 'enviamos', veo: 'vemos', necesito: 'necesitamos', tengo: 'tenemos', quiero: 'queremos',
  hago: 'hacemos', 'mío': 'nuestro', 'mía': 'nuestra', mis: 'nuestros', mi: 'nuestro' };
const RE_YO = tablaRe(YO);
const preguntas = (t) => t.replace(/¿[^?]*\?/g, (q) => q.replace(RE_YO, (m) => mayus(m, YO[m.toLowerCase()]))
  .replace(/nuestro(\s+)(invitaci[oó]n|boda|fiesta|lista|p[aá]gina)/giu, 'nuestra$1$2'));
export function aPluralEs(t, modo) {
  const i = modo === 'vosotros' ? 1 : 0;
  for (const [re, v] of FRASES_ES) t = t.replace(re, v[i]);
  t = preguntas(t);
  t = posesivo(t, i);
  // «tu» al final de un trozo (lo que sigue es un enlace): «con tu <a>propio video</a>»
  t = t.replace(/(?<![\p{L}])(tu)(\s*)$/u, (m, p, sp) => (i ? 'vuestro' : 'su') + sp);
  t = imperativos(t, RE_ES_IMP, ES_IMP, i);
  return reemplaza(t, ES, RE_ES, i);
}

// ── Italiano: tu → voi ──
const IT = { tu: 'voi', tuo: 'vostro', tua: 'vostra', tuoi: 'vostri', tue: 'vostre', ti: 'vi', puoi: 'potete', hai: 'avete', sei: 'siete', vuoi: 'volete',
  ricevi: 'ricevete', vedi: 'vedete', paghi: 'pagate', gestisci: 'gestite', scarichi: 'scaricate', decidi: 'decidete', personalizzi: 'personalizzate',
  crei: 'create', modifichi: 'modificate', organizzi: 'organizzate', sai: 'sapete', devi: 'dovete', provala: 'provatela', guardala: 'guardatela',
  scrivici: 'scriveteci', progettala: 'progettatela', raccontaci: 'raccontateci', condividila: 'condividetela', pubblichi: 'pubblicate',
  crealo: 'createlo', creala: 'createla', guardalo: 'guardatelo', provalo: 'provatelo', personalizzalo: 'personalizzatelo', personalizzala: 'personalizzatela',
  scegli: 'scegliete', aggiungi: 'aggiungete', ami: 'amate', preferisci: 'preferite', inviti: 'invitate', organizzala: 'organizzatela' };
const IT_IMP = { prova: 'provate', paga: 'pagate', scegli: 'scegliete', personalizza: 'personalizzate', guarda: 'guardate', condividi: 'condividete',
  racconta: 'raccontate', apri: 'aprite', completa: 'completate', seleziona: 'selezionate', attiva: 'attivate', crea: 'create', trova: 'trovate',
  aggiungi: 'aggiungete', inizia: 'iniziate', scarica: 'scaricate', organizza: 'organizzate', chiedi: 'chiedete' };
const RE_IT = tablaRe(IT), RE_IT_IMP = reImp(IT_IMP, 'e');

// ── Alemán: du → ihr ──
const DE = { du: 'ihr', dich: 'euch', dir: 'euch', dein: 'euer', deine: 'eure', deinen: 'euren', deinem: 'eurem', deiner: 'eurer', deines: 'eures',
  kannst: 'könnt', hast: 'habt', bist: 'seid', willst: 'wollt', siehst: 'seht', bekommst: 'bekommt', zahlst: 'zahlt', bezahlst: 'bezahlt', teilst: 'teilt',
  verwaltest: 'verwaltet', 'lädst': 'ladet', entscheidest: 'entscheidet', gestaltest: 'gestaltet', erstellst: 'erstellt', 'wählst': 'wählt', brauchst: 'braucht',
  'weißt': 'wisst', musst: 'müsst', 'erhältst': 'erhaltet', organisierst: 'organisiert', bearbeitest: 'bearbeitet', korrigierst: 'korrigiert', vermeidest: 'vermeidet',
  findest: 'findet', schickst: 'schickt', sendest: 'sendet', legst: 'legt', 'fügst': 'fügt', aktivierst: 'aktiviert', richtest: 'richtet', probierst: 'probiert',
  probier: 'probiert', probiere: 'probiert', 'wähle': 'wählt', gestalte: 'gestaltet', sieh: 'seht', zahle: 'zahlt', teile: 'teilt', 'erzähle': 'erzählt', 'erzähl': 'erzählt',
  'öffne': 'öffnet', verwalte: 'verwaltet', 'fülle': 'füllt', aktiviere: 'aktiviert', schreib: 'schreibt', schreibe: 'schreibt', finde: 'findet', erstelle: 'erstellt',
  entdecke: 'entdeckt', starte: 'startet', personalisiere: 'personalisiert', 'füge': 'fügt', lege: 'legt' };
const RE_DE = tablaRe(DE);

// ── Neerlandés: je → jullie (con el verbo en plural: «kun je» → «kunnen jullie») ──
const NL_VERBO = { kun: 'kunnen', kan: 'kunnen', heb: 'hebben', hebt: 'hebben', bent: 'zijn', ben: 'zijn', wil: 'willen', wilt: 'willen', zie: 'zien', ziet: 'zien',
  krijg: 'krijgen', krijgt: 'krijgen', betaal: 'betalen', betaalt: 'betalen', deel: 'delen', deelt: 'delen', beheer: 'beheren', beheert: 'beheren', download: 'downloaden',
  downloadt: 'downloaden', kies: 'kiezen', kiest: 'kiezen', ontwerp: 'ontwerpen', ontwerpt: 'ontwerpen', maak: 'maken', maakt: 'maken', weet: 'weten', moet: 'moeten',
  ontvang: 'ontvangen', ontvangt: 'ontvangen', beslis: 'beslissen', beslist: 'beslissen', voeg: 'voegen', voegt: 'voegen', stel: 'stellen', stelt: 'stellen',
  vind: 'vinden', vindt: 'vinden', stuur: 'sturen', stuurt: 'sturen', organiseer: 'organiseren', organiseert: 'organiseren', bewerk: 'bewerken', bewerkt: 'bewerken',
  personaliseer: 'personaliseren', personaliseert: 'personaliseren', regel: 'regelen', regelt: 'regelen', zet: 'zetten', past: 'passen', pas: 'passen' };
const NL = { jouw: 'jullie', je: 'jullie', jij: 'jullie', jou: 'jullie', downloadt: 'downloaden', 'de jouwe': 'die van jullie', 'het jouwe': 'dat van jullie' };
const RE_NL = tablaRe(NL);
function aPluralNl(t) {
  t = t.replace(/(?<![\p{L}])(\p{L}+)\s+(je|jij)(?![\p{L}])/giu, (m, v) => (NL_VERBO[v.toLowerCase()] ? `${mayus(v, NL_VERBO[v.toLowerCase()])} jullie` : m));
  t = t.replace(/(?<![\p{L}])(je|jij)\s+(\p{L}+)(?![\p{L}])/giu, (m, p, v) => (NL_VERBO[v.toLowerCase()] ? `${mayus(p, 'jullie')} ${NL_VERBO[v.toLowerCase()]}` : m));
  return reemplaza(t, NL, RE_NL, 0);
}

// ── Portugués: você → vocês (el verbo cambia solo después de «você»); en Portugal, teu → vosso ──
const PT_VERBO = { pode: 'podem', tem: 'têm', recebe: 'recebem', 'vê': 'veem', paga: 'pagam', compartilha: 'compartilham', partilha: 'partilham',
  gerencia: 'gerenciam', gere: 'gerem', baixa: 'baixam', descarrega: 'descarregam', decide: 'decidem', personaliza: 'personalizam', escolhe: 'escolhem',
  quer: 'querem', precisa: 'precisam', sabe: 'sabem', cria: 'criam', organiza: 'organizam', edita: 'editam', corrige: 'corrigem', evita: 'evitam',
  'está': 'estão', 'é': 'são', vai: 'vão', faz: 'fazem', envia: 'enviam', adiciona: 'adicionam', monta: 'montam', acompanha: 'acompanham' };
// Imperativos (al empezar la frase o después de «e»)
const PT_IMP = { crie: 'criem', veja: 'vejam', encontre: 'encontrem', escolha: 'escolham', personalize: 'personalizem', experimente: 'experimentem',
  pague: 'paguem', compartilhe: 'compartilhem', partilhe: 'partilhem', conte: 'contem', abra: 'abram', ative: 'ativem', complete: 'completem', selecione: 'selecionem',
  'peça': 'peçam', receba: 'recebam', escreva: 'escrevam', adicione: 'adicionem', comece: 'comecem', gerencie: 'gerenciem', baixe: 'baixem', descarregue: 'descarreguem',
  organize: 'organizem', descubra: 'descubram', teste: 'testem', crie: 'criem', mostre: 'mostrem', envie: 'enviem', monte: 'montem', prepare: 'preparem' };
const RE_PT_IMP = reImp(PT_IMP, 'e');
const PT = { 'você': 'vocês', teu: 'vosso', tua: 'vossa', teus: 'vossos', tuas: 'vossas', contigo: 'convosco', ti: 'vocês',
  // Portugal (tu): las formas de «tu» pasan a «vocês»
  podes: 'podem', tens: 'têm', 'vês': 'veem', pagas: 'pagam', decides: 'decidem', recebes: 'recebem', crias: 'criam', partilhas: 'partilham', geres: 'gerem',
  envias: 'enviam', montas: 'montam', organizas: 'organizam', escolhes: 'escolhem', sabes: 'sabem', precisas: 'precisam', guardas: 'guardam',
  administras: 'administram', personalizas: 'personalizam', queres: 'querem', vais: 'vão', 'és': 'são', 'estás': 'estão', fazes: 'fazem', descarregas: 'descarregam',
  'verás': 'verão', 'terás': 'terão', consegues: 'conseguem', controlas: 'controlam', acompanhas: 'acompanham', compras: 'compram', usas: 'usam', abres: 'abrem' };
// Imperativos de «tu» (Portugal) → «vocês»
const PT_TU_IMP = { cria: 'criem', 'vê': 'vejam', encontra: 'encontrem', escolhe: 'escolham', personaliza: 'personalizem', experimenta: 'experimentem', paga: 'paguem',
  partilha: 'partilhem', conta: 'contem', abre: 'abram', ativa: 'ativem', completa: 'completem', seleciona: 'selecionem', pede: 'peçam', recebe: 'recebam',
  escreve: 'escrevam', adiciona: 'adicionem', 'começa': 'comecem', descarrega: 'descarreguem', organiza: 'organizem', descobre: 'descubram', testa: 'testem',
  envia: 'enviem', monta: 'montem', prepara: 'preparem', fala: 'falem', gere: 'giram', guarda: 'guardem', convida: 'convidem', mostra: 'mostrem' };
const RE_PT_TU_IMP = reImp(PT_TU_IMP, 'e');
const RE_PT = tablaRe(PT);

export function aPluralOtro(t, idioma) {
  if (idioma === 'nl') return aPluralNl(t);
  if (idioma === 'it') return reemplaza(imperativos(t, RE_IT_IMP, IT_IMP, 0), IT, RE_IT, 0);
  if (idioma === 'de') return reemplaza(t, DE, RE_DE, 0);
  if (idioma === 'pt') {
    t = t.replace(/(?<![\p{L}])(você)\s+(não\s+)?(\p{L}+)(?![\p{L}])/giu, (m, p, n, v) => (PT_VERBO[v.toLowerCase()] ? `${mayus(p, 'vocês')} ${n || ''}${PT_VERBO[v.toLowerCase()]}` : m));
    // «vocês gerenciam e baixa» → «… e baixam»
    t = t.replace(/(vocês\s+\p{L}+m\s+e\s+)(\p{L}+)(?![\p{L}])/giu, (m, a, v) => a + (PT_VERBO[v.toLowerCase()] || v));
    t = imperativos(t, RE_PT_IMP, PT_IMP, 0);
    t = imperativos(t, RE_PT_TU_IMP, PT_TU_IMP, 0);
    t = t.replace(/(?<![\p{L}])(\p{L}+)-te(?![\p{L}])/gu, '$1-vos');
    return reemplaza(t, PT, RE_PT, 0);
  }
  return t;
}

// Lo que NO se pasa al plural: cabecera y pie del sitio, profesionales, opiniones, scripts; y los textos para los invitados
const FUERA = /(<head>[\s\S]*?<\/head>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<section[^>]*id="para-profesionales"[\s\S]*?<\/section>|<div class="pros[\s\S]*?<\/div>\s*<\/div>|<figure class="opinion">[\s\S]*?<\/figure>|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/;
const INVITADOS = /Busca tu mesa|Comparte tus fotos|Escanea el código y sube tus fotos|Find your table|Share your photos|Scan the code/i;
export function pluralizarHtml(html, f) {
  return html.split(FUERA).map((p, i) => (i % 2 ? p : p.split(/(<[^>]+>)/).map((x, j) => {
    if (j % 2) return x.replace(/\b(alt|title|aria-label|placeholder)="([^"]*)"/g, (m, a, v) => `${a}="${f(v)}"`);
    // Lo que leen los invitados queda igual, también dentro de una frase más larga
    const guardados = [];
    const y = x.replace(/«?Busca tu mesa»?|¡?Comparte tus fotos!?|Escanea el código y sube tus fotos/g, (m) => { guardados.push(m); return `\u0001${guardados.length - 1}\u0001`; });
    return f(y).replace(/\u0001(\d+)\u0001/g, (m, n) => guardados[n]);
  }).join(''))).join('');
}
