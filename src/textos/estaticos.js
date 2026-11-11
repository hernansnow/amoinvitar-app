// README (ronda 44) · Textos fijos que algunos modelos traen escritos en español dentro del HTML (cuenta regresiva, «Redes
// oficiales de la fiesta», «¡Gracias por acompañarme!», Travel…). En las invitaciones y demos en otro idioma se cambian por
// su traducción (solo si el texto es exactamente ese: lo que escribe el cliente no se toca).
// [en, pt, fr, it, de, nl, ca]
const L = ['en', 'pt', 'fr', 'it', 'de', 'nl', 'ca'];
const regalo = (dia) => [
  `The best gift is having you with me on ${dia[0]}, but if you'd like to give me something, here are the details.`,
  `O melhor presente é você estar comigo ${dia[1]}, mas se quiser me dar um presente, aqui estão os dados.`,
  `Le plus beau cadeau est votre présence ${dia[2]}, mais si vous souhaitez m’offrir quelque chose, voici les informations.`,
  `Il regalo più bello è la tua presenza ${dia[3]}, ma se desideri farmi un regalo, ecco i dati.`,
  `Das schönste Geschenk ist, dass du ${dia[4]} dabei bist. Wenn du mir trotzdem etwas schenken möchtest, findest du hier die Daten.`,
  `Het mooiste cadeau is dat je erbij bent ${dia[5]}, maar als je me iets wilt geven, vind je hier de gegevens.`,
  `El millor regal és que m'acompanyis ${dia[6]}, però si vols fer-me un regal, aquí tens les dades.`,
];
const DIA_IMPORTANTE = ['such an important day', 'neste dia tão importante', 'en ce jour si important', 'in questo giorno così importante', 'an diesem wichtigen Tag', 'op deze belangrijke dag', 'en aquest dia tan important'];
const DIA_HERMOSO = ['this beautiful day', 'neste dia tão lindo', 'en ce beau jour', 'in questo giorno speciale', 'an diesem schönen Tag', 'op deze mooie dag', 'en aquest dia tan bonic'];
const DIA_GRANDE = ['my big day', 'no meu grande dia', 'pour mon grand jour', 'nel mio grande giorno', 'an meinem großen Tag', 'op mijn grote dag', 'en el meu gran dia'];
const sinPunto = (a) => a.map((x) => x.replace(/\.$/, ''));
const gracias = (yo, excl) => (yo
  ? ['Thank you for being with me', 'Obrigado por me acompanhar', 'Merci d’être à mes côtés', 'Grazie per essere con me', 'Danke, dass du dabei bist', 'Bedankt dat je erbij bent', 'Gràcies per acompanyar-me']
  : ['Thank you for being with us', 'Obrigado por nos acompanhar', 'Merci d’être à nos côtés', 'Grazie per essere con noi', 'Danke, dass ihr dabei seid', 'Bedankt dat jullie erbij zijn', 'Gràcies per acompanyar-nos']
).map((x, i) => (excl ? (i === 2 ? `${x} !` : `${x}!`) : x));
const album = (mio) => [
  `Tap the button and upload all the photos and videos you take during the party to ${mio ? 'my' : 'our'} shared album, instantly, no app needed.`,
  `Toque no botão e envie todas as fotos e vídeos que tirar durante a festa para o ${mio ? 'meu' : 'nosso'} álbum colaborativo, na hora, sem baixar nenhum app.`,
  `Appuyez sur le bouton et envoyez toutes les photos et vidéos que vous prendrez pendant la fête dans ${mio ? 'mon' : 'notre'} album partagé, instantanément, sans télécharger d’application.`,
  `Tocca il pulsante e carica tutte le foto e i video che scatti durante la festa nel ${mio ? 'mio' : 'nostro'} album condiviso, all’istante, senza scaricare nessuna app.`,
  `Tippe auf den Button und lade alle Fotos und Videos, die du auf der Party machst, sofort in ${mio ? 'mein' : 'unser'} gemeinsames Album hoch – ganz ohne App.`,
  `Tik op de knop en upload alle foto’s en video’s die je tijdens het feest maakt meteen naar ${mio ? 'mijn' : 'ons'} gedeelde album, zonder app.`,
  `Fes clic al botó i puja totes les fotos i vídeos que facis durant la festa al ${mio ? 'meu' : 'nostre'} àlbum col·laboratiu, a l'instant, sense descarregar cap app.`,
];
const redes = (de) => ({
  evento: ['Official event socials', 'Redes oficiais do evento', 'Réseaux officiels de l’événement', 'Social ufficiali dell’evento', 'Offizielle Kanäle des Events', 'Officiële kanalen van het evenement', 'Xarxes oficials de l’esdeveniment'],
  fiesta: ['Official party socials', 'Redes oficiais da festa', 'Réseaux officiels de la fête', 'Social ufficiali della festa', 'Offizielle Kanäle der Party', 'Officiële kanalen van het feest', 'Xarxes oficials de la festa'],
  boda: ['Official wedding socials', 'Redes oficiais do casamento', 'Réseaux officiels du mariage', 'Social ufficiali del matrimonio', 'Offizielle Kanäle der Hochzeit', 'Officiële kanalen van de bruiloft', 'Xarxes oficials del casament'],
}[de]);
const luna = ['Your presence is the best gift, but if you wish, you can contribute to our honeymoon', 'O nosso melhor presente é a sua presença, mas se quiser, pode contribuir para a nossa lua de mel',
  'Votre présence est notre plus beau cadeau, mais si vous le souhaitez, vous pouvez participer à notre voyage de noces', 'Il regalo più bello è la tua presenza, ma se vuoi puoi contribuire alla nostra luna di miele',
  'Das schönste Geschenk ist, dass du dabei bist. Wenn du möchtest, kannst du gern etwas zu unseren Flitterwochen beitragen', 'Het mooiste cadeau is dat je erbij bent, maar als je wilt, kun je bijdragen aan onze huwelijksreis',
  'El nostre millor regal és que ens acompanyis, però si ho vols, pots col·laborar amb la nostra lluna de mel'];
const prepara = (que) => ({
  mi: ['Get ready for my party!', 'Prepare-se para a minha festa!', 'Préparez-vous pour ma fête !', 'Preparati per la mia festa!', 'Mach dich bereit für meine Party!', 'Maak je klaar voor mijn feest!', "Prepara't per a la meva festa!"],
  boda: ['Get ready for our wedding!', 'Prepare-se para o nosso casamento!', 'Préparez-vous pour notre mariage !', 'Preparati per il nostro matrimonio!', 'Mach dich bereit für unsere Hochzeit!', 'Maak je klaar voor onze bruiloft!', "Prepara't per al nostre casament!"],
}[que]);
const embarque = (a) => ({
  boda: ['Boarding pass to the Wedding', 'Cartão de embarque para o Casamento', 'Carte d’embarquement pour le Mariage', 'Carta d’imbarco per il Matrimonio', 'Bordkarte zur Hochzeit', 'Instapkaart naar de Bruiloft', "Targeta d'embarcament al Casament"],
  fiesta: ['Boarding pass to the Party', 'Cartão de embarque para a Festa', 'Carte d’embarquement pour la Fête', 'Carta d’imbarco per la Festa', 'Bordkarte zur Party', 'Instapkaart naar het Feest', "Targeta d'embarcament a la Festa"],
}[a]);

const TABLA = {
  'días': ['days', 'dias', 'jours', 'giorni', 'Tage', 'dagen', 'dies'],
  'Días': ['Days', 'Dias', 'Jours', 'Giorni', 'Tage', 'Dagen', 'Dies'],
  Horas: ['Hours', 'Horas', 'Heures', 'Ore', 'Stunden', 'Uren', 'Hores'],
  horas: ['hours', 'horas', 'heures', 'ore', 'Stunden', 'uren', 'hores'],
  Minutos: ['Minutes', 'Minutos', 'Minutes', 'Minuti', 'Minuten', 'Minuten', 'Minuts'],
  minutos: ['minutes', 'minutos', 'minutes', 'minuti', 'Minuten', 'minuten', 'minuts'],
  Segundos: ['Seconds', 'Segundos', 'Secondes', 'Secondi', 'Sekunden', 'Seconden', 'Segons'],
  segundos: ['seconds', 'segundos', 'secondes', 'secondi', 'Sekunden', 'seconden', 'segons'],
  'LA FIESTA COMIENZA EN': ['THE PARTY STARTS IN', 'A FESTA COMEÇA EM', 'LA FÊTE COMMENCE DANS', 'LA FESTA INIZIA TRA', 'DIE PARTY BEGINNT IN', 'HET FEEST BEGINT OVER', 'LA FESTA COMENÇA EN'],
  'Celebración': ['Celebration', 'Celebração', 'Célébration', 'Celebrazione', 'Feier', 'Viering', 'Celebració'],
  Ceremonia: ['Ceremony', 'Cerimônia', 'Cérémonie', 'Cerimonia', 'Trauung', 'Ceremonie', 'Cerimònia'],
  Fiesta: ['Party', 'Festa', 'Fête', 'Festa', 'Party', 'Feest', 'Festa'],
  FECHA: ['DATE', 'DATA', 'DATE', 'DATA', 'DATUM', 'DATUM', 'DATA'],
  Embarque: ['Boarding', 'Embarque', 'Embarquement', 'Imbarco', 'Boarding', 'Boarding', 'Embarcament'],
  'Plan de Vuelo': ['Flight Plan', 'Plano de Voo', 'Plan de vol', 'Piano di volo', 'Flugplan', 'Vluchtplan', 'Pla de vol'],
  'Nuestro Viaje': ['Our Journey', 'Nossa Viagem', 'Notre Voyage', 'Il nostro Viaggio', 'Unsere Reise', 'Onze Reis', 'El nostre Viatge'],
  'Nuestra Boda': ['Our Wedding', 'Nosso Casamento', 'Notre Mariage', 'Il nostro Matrimonio', 'Unsere Hochzeit', 'Onze Bruiloft', 'El nostre Casament'],
  'Mi Fiesta': ['My Party', 'Minha Festa', 'Ma Fête', 'La mia Festa', 'Meine Party', 'Mijn Feest', 'La meva Festa'],
  'La boda del año': ['The wedding of the year', 'O casamento do ano', 'Le mariage de l’année', 'Il matrimonio dell’anno', 'Die Hochzeit des Jahres', 'De bruiloft van het jaar', "El casament de l'any"],
  'La fiesta del año': ['The party of the year', 'A festa do ano', 'La fête de l’année', 'La festa dell’anno', 'Die Party des Jahres', 'Het feest van het jaar', "La festa de l'any"],
  'Los Papás': ['The Parents', 'Os Pais', 'Les Parents', 'I Genitori', 'Die Eltern', 'De Ouders', 'Els Pares'],
  'Los Anfitriones': ['The Hosts', 'Os Anfitriões', 'Nos Hôtes', 'I Padroni di casa', 'Die Gastgeber', 'De Gastheren', 'Els Amfitrions'],
  Regalos: ['Gifts', 'Presentes', 'Cadeaux', 'Regali', 'Geschenke', 'Cadeaus', 'Regals'],
  'Agenda la fecha': ['Save the date', 'Salve a data', 'Notez la date', 'Segna la data', 'Termin speichern', 'Zet in je agenda', 'Desa la data'],
  '¿Cómo llegar?': ['How to get there', 'Como chegar?', 'Comment venir ?', 'Come arrivare?', 'Anfahrt', 'Route', 'Com arribar-hi?'],
  'Reserva tu lugar en el formulario de confirmación.': ['Save your seat in the RSVP form.', 'Reserve o seu lugar no formulário de confirmação.', 'Réservez votre place dans le formulaire de confirmation.', 'Prenota il tuo posto nel modulo di conferma.', 'Reserviere deinen Platz im Antwortformular.', 'Reserveer je plek via het bevestigingsformulier.', 'Reserva el teu lloc al formulari de confirmació.'],
  '¡Es el momento del año más lindo para regalar! Trae tu regalo que habrá lugar bajo el árbol.': ['It’s the most wonderful time of the year for gifts! Bring yours—there will be room under the tree.', 'É a época mais bonita do ano para presentear! Traga o seu presente, que haverá lugar debaixo da árvore.', 'C’est le plus beau moment de l’année pour offrir ! Apportez votre cadeau, il y aura de la place sous le sapin.', 'È il momento più bello dell’anno per fare regali! Porta il tuo, ci sarà posto sotto l’albero.', 'Die schönste Zeit des Jahres zum Schenken! Bring dein Geschenk mit – unter dem Baum ist Platz.', 'Het is de mooiste tijd van het jaar om cadeaus te geven! Neem je cadeau mee, er is plek onder de boom.', "És el moment més bonic de l'any per regalar! Porta el teu regal, que hi haurà lloc sota l'arbre."],
  'El mejor regalo es que nos acompañes para celebrar juntos, pero si deseas hacer un regalo, habrá un cofre en la fiesta o aquí te dejo los datos bancarios.': ['The best gift is celebrating together, but if you’d like to give a gift, there will be a gift box at the party, or here are the bank details.', 'O melhor presente é celebrarmos juntos, mas se quiser dar um presente, haverá uma caixa na festa ou aqui estão os dados bancários.', 'Le plus beau cadeau est de célébrer ensemble, mais si vous souhaitez offrir quelque chose, il y aura une urne à la fête, ou voici nos coordonnées bancaires.', 'Il regalo più bello è festeggiare insieme, ma se vuoi fare un regalo, ci sarà una scatola alla festa oppure ecco i dati bancari.', 'Das schönste Geschenk ist, gemeinsam zu feiern. Wenn du etwas schenken möchtest, gibt es auf der Party eine Geschenkbox – oder hier sind die Bankdaten.', 'Het mooiste cadeau is samen vieren, maar als je iets wilt geven, staat er op het feest een cadeaudoos of vind je hier de bankgegevens.', 'El millor regal és celebrar-ho junts, però si vols fer un regal, hi haurà una capsa a la festa o aquí tens les dades bancàries.'],
  'El mejor regalo es que me acompañes en este día tan importante, pero si deseas hacerme un regalo aquí te dejo los datos.': regalo(DIA_IMPORTANTE),
  'El mejor regalo es que me acompañes en este hermoso día, pero si deseas hacerme un regalo aquí te dejo los datos.': regalo(DIA_HERMOSO),
  'El mejor regalo es que me acompañes en mi gran día, pero si deseas hacerme un regalo aquí te dejo los datos.': regalo(DIA_GRANDE),
  'El mejor regalo es que me acompañes en mi gran día, pero si deseas hacerme un regalo aquí te dejo los datos': sinPunto(regalo(DIA_GRANDE)),
  'Nuestro mejor regalo es que nos acompañes, pero si lo deseas, puedes colaborar con nuestra luna de miel 😉': luna.map((x) => `${x} 😉`),
  'Nuestro mejor regalo es que nos acompañes, pero si lo deseas, puedes colaborar con nuestra luna de miel.': luna.map((x) => `${x}.`),
  'Haz clic en el botón y sube todas las fotos y videos que tomes durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.': album(true),
  'Haz clic en el botón y sube todas las fotos y videos que tomes durante la fiesta a nuestro álbum colaborativo, al instante, sin descargar ninguna app.': album(false),
  'Gracias por acompañarme': gracias(true, false), '¡Gracias por acompañarme!': gracias(true, true),
  'Gracias por acompañarnos': gracias(false, false), '¡Gracias por acompañarnos!': gracias(false, true),
  'Prepárate para mi fiesta!': prepara('mi'), '¡Prepárate para mi fiesta!': prepara('mi'),
  '¡Prepárate para nuestra boda!': prepara('boda'), '¡Prepárate para nuestro casamiento!': prepara('boda'),
  'Redes oficiales del evento': redes('evento'), 'Redes oficiales de la fiesta': redes('fiesta'), 'Redes oficiales de la boda': redes('boda'),
  'Tarjeta de embarque a la Boda': embarque('boda'), 'Tarjeta de embarque a la Fiesta': embarque('fiesta'),
  'HERMANO DEL NOVIO': ["GROOM'S BROTHER", 'IRMÃO DO NOIVO', 'FRÈRE DU MARIÉ', 'FRATELLO DELLO SPOSO', 'BRUDER DES BRÄUTIGAMS', 'BROER VAN DE BRUIDEGOM', 'GERMÀ DEL NUVI'],
  'MEJOR AMIGA DE LA NOVIA': ["BRIDE'S BEST FRIEND", 'MELHOR AMIGA DA NOIVA', 'MEILLEURE AMIE DE LA MARIÉE', 'MIGLIORE AMICA DELLA SPOSA', 'BESTE FREUNDIN DER BRAUT', 'BESTE VRIENDIN VAN DE BRUID', 'MILLOR AMIGA DE LA NÚVIA'],
  'MEJOR AMIGA DE LA PAREJA': ["COUPLE'S BEST FRIEND", 'MELHOR AMIGA DO CASAL', 'MEILLEURE AMIE DU COUPLE', 'MIGLIORE AMICA DELLA COPPIA', 'BESTE FREUNDIN DES PAARES', 'BESTE VRIENDIN VAN HET STEL', 'MILLOR AMIGA DE LA PARELLA'],
  'MEJOR AMIGO DEL NOVIO': ["GROOM'S BEST FRIEND", 'MELHOR AMIGO DO NOIVO', 'MEILLEUR AMI DU MARIÉ', 'MIGLIORE AMICO DELLO SPOSO', 'BESTER FREUND DES BRÄUTIGAMS', 'BESTE VRIEND VAN DE BRUIDEGOM', 'MILLOR AMIC DEL NUVI'],
};
// Prefijo de Travel («Tripulación – Testigos»)
export const PREFIJOS = { 'Tripulación – ': ['Crew – ', 'Tripulação – ', 'Équipage – ', 'Equipaggio – ', 'Crew – ', 'Bemanning – ', 'Tripulació – '] };

const MAPA = Object.fromEntries(L.map((l, i) => [l, new Map(Object.entries(TABLA).map(([k, v]) => [k.replace(/\s+/g, ' '), v[i]]))]));
export const traducePrefijo = (pre, variante) => { const i = L.indexOf(String(variante).slice(0, 2)); return i < 0 || !PREFIJOS[pre] ? pre : PREFIJOS[pre][i]; };

// En el HTML ya armado: cada texto suelto que sea exactamente uno de la tabla, en el idioma de la invitación
export function traducirEstaticos(html, variante) {
  const m = MAPA[String(variante || '').slice(0, 2)];
  if (!m || String(variante).startsWith('es')) return html;
  return html.replace(/>([^<>]+)</g, (todo, t) => {
    // Los espacios duros (&#160;) de los costados se mantienen
    const [, ini, medio, fin] = /^((?:\s|&#160;|&nbsp;)*)([\s\S]*?)((?:\s|&#160;|&nbsp;)*)$/.exec(t);
    const k = medio.replace(/&#160;|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const tr = k && m.get(k);
    return tr ? `>${ini}${tr}${fin}<` : todo;
  });
}
