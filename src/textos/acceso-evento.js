// README (ronda 78): en las pantallas de acceso, PIN y «Buscá tu mesa», arriba de los nombres va el tipo de evento
// («Boda de», «Fiesta de 15 de»…). Va en una tabla aparte porque cada idioma lo arma distinto.
const FRASES = {
  es: { boda: 'Boda de', 15: 'Fiesta de 15 de', bautismo: 'Bautismo de', comunion: 'Primera Comunión de', cumple: 'Cumpleaños de', infantil: 'Cumpleaños de', graduacion: 'Graduación de', babyshower: 'Baby shower de', revelacion: 'Revelación de género de', navidad: 'Navidad con' },
  'es-es': { bautismo: 'Bautizo de' },
  en: { boda: 'The wedding of', 15: 'The quinceañera of', bautismo: 'The baptism of', comunion: 'The First Communion of', cumple: 'The birthday of', infantil: 'The birthday of', graduacion: 'The graduation of', babyshower: 'The baby shower of', revelacion: 'The gender reveal of', navidad: 'Christmas with' },
  pt: { boda: 'Casamento de', 15: 'Festa de 15 anos de', bautismo: 'Batizado de', comunion: 'Primeira Comunhão de', cumple: 'Aniversário de', infantil: 'Aniversário de', graduacion: 'Formatura de', babyshower: 'Chá de bebê de', revelacion: 'Chá revelação de', navidad: 'Natal com' },
  'pt-pt': { babyshower: 'Baby shower de' },
  fr: { boda: 'Mariage de', 15: 'Les 15 ans de', bautismo: 'Baptême de', comunion: 'Première communion de', cumple: 'Anniversaire de', infantil: 'Anniversaire de', graduacion: 'Remise de diplôme de', babyshower: 'Baby shower de', revelacion: 'Gender reveal de', navidad: 'Noël avec' },
  it: { boda: 'Matrimonio di', 15: 'Festa dei 15 anni di', bautismo: 'Battesimo di', comunion: 'Prima Comunione di', cumple: 'Compleanno di', infantil: 'Compleanno di', graduacion: 'Laurea di', babyshower: 'Baby shower di', revelacion: 'Gender reveal di', navidad: 'Natale con' },
  de: { boda: 'Hochzeit von', 15: 'Quinceañera von', bautismo: 'Taufe von', comunion: 'Erstkommunion von', cumple: 'Geburtstag von', infantil: 'Geburtstag von', graduacion: 'Abschlussfeier von', babyshower: 'Babyparty von', revelacion: 'Gender Reveal von', navidad: 'Weihnachten mit' },
  nl: { boda: 'Bruiloft van', 15: 'Quinceañera van', bautismo: 'Doop van', comunion: 'Eerste communie van', cumple: 'Verjaardag van', infantil: 'Verjaardag van', graduacion: 'Diploma-uitreiking van', babyshower: 'Babyshower van', revelacion: 'Gender reveal van', navidad: 'Kerst met' },
  ca: { boda: 'Casament de', 15: 'Festa dels 15 de', bautismo: 'Bateig de', comunion: 'Primera Comunió de', cumple: 'Aniversari de', infantil: 'Aniversari de', graduacion: 'Graduació de', babyshower: 'Baby shower de', revelacion: 'Revelació de gènere de', navidad: 'Nadal amb' },
};

// tipo: id del evento (boda, 15…); variante: es, es-ar, es-es, en, pt, pt-pt… Sin tipo conocido (corporativo), vacío.
export function eventoDe(tipo, variante = 'es') {
  const v = String(variante || 'es').toLowerCase(), base = v.slice(0, 2);
  return FRASES[v]?.[tipo] || FRASES[base]?.[tipo] || '';
}
