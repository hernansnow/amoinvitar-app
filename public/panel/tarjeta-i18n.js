// README (ronda 99): textos de las tarjetas (Save The Date y agradecimiento) en el idioma de la invitación.
// En castellano no se toca nada (los textos de siempre). En los otros idiomas: las frases del evento, los saludos,
// las citas y los textos fijos de los diseños. «Save the date» queda igual (se usa así en todos los idiomas).
// Cada idioma: [singular, plural] donde el texto depende de si son una o dos personas.

const F = (evento, exclama, inv1, inv2) => ({ evento, exclama, invitamos: [inv1, inv2 || inv1] });

export const TARJETA_I18N = {
  en: {
    frases: {
      boda: F('Our wedding', 'We’re getting married!', 'You’re invited to celebrate\nour wedding', 'You’re invited to celebrate\nour wedding'),
      15: F('My quinceañera', 'My quinceañera!', 'You’re invited to celebrate my 15th birthday', 'You’re invited to celebrate her 15th birthday'),
      bautismo: F('My baptism', 'My baptism!', 'You’re invited to celebrate my baptism', 'You’re invited to celebrate our baptism'),
      comunion: F('My first communion', 'My first communion!', 'You’re invited to celebrate my first communion', 'You’re invited to celebrate our first communion'),
      cumple: F('My birthday', 'My birthday!', 'You’re invited to celebrate my birthday', 'You’re invited to celebrate our birthday'),
      infantil: F('My birthday', 'My birthday!', 'You’re invited to celebrate my birthday', 'You’re invited to celebrate our birthday'),
      graduacion: F('My graduation', 'I’m graduating!', 'You’re invited to celebrate my graduation', 'You’re invited to celebrate our graduation'),
      babyshower: F('Baby shower', 'Baby shower!', 'You’re invited to celebrate\nthe baby’s arrival'),
      revelacion: F('Gender reveal', 'Boy or girl?', 'You’re invited to find out\nif it’s a boy or a girl'),
    },
    teEsperamos: ['I hope to see you', 'We hope to see you'], acompanar: ['I hope you can join me', 'We hope you can join us'],
    exclamaBoda: 'We’re getting married!', exclama15: 'My quinceañera!',
    rsvpAntes: 'RSVP before {fecha}',
    mensaje: 'Thank you for being with us on such a special day. It was a pleasure to share it with you.',
    citaMomentos: '“Some moments in life are special on their own. Sharing them with the people we love makes them unforgettable”',
    citaFelices: '“The happy moments in life become wonderful when we’re lucky enough to share them with our dearest family and friends.”',
    graciasAcomp: ['Thank you for being with me and making it unforgettable!', 'Thank you for being with us and making it unforgettable for us!'],
    teQueremos: ['Love you!', 'We love you!'],
    fijos: {
      'Próximamente la invitación formal': 'Formal invitation to follow', 'Nuestra boda': 'Our wedding', '¡Gracias!': 'Thank you!', '¡Nos casamos!': 'We’re getting married!',
      'Nos casamos': 'We’re getting married', 'Agenda la fecha': 'Save the date', 'Mis quince años': 'My quinceañera', 'Mis quince': 'My quince',
      'Te esperamos el': 'We hope to see you on', 'a las {horaCorta}': 'at {horaCorta}', 'Tarjeta de embarque a la boda': 'Boarding pass to the wedding',
      'Fecha': 'Date', 'Destino': 'Destination',
    },
  },
  pt: {
    frases: {
      boda: F('Nosso casamento', 'Vamos nos casar!', 'Convidamos você para celebrar\nnosso casamento', 'Convidamos você para celebrar\nnosso casamento'),
      15: F('Meus 15 anos', 'Meus quinze anos!', 'Convido você para celebrar meus 15 anos', 'Convidamos você para celebrar os 15 anos'),
      bautismo: F('Meu batizado', 'Meu batizado!', 'Convido você para celebrar meu batizado', 'Convidamos você para celebrar nosso batizado'),
      comunion: F('Minha primeira comunhão', 'Minha primeira comunhão!', 'Convido você para celebrar minha primeira comunhão', 'Convidamos você para celebrar nossa primeira comunhão'),
      cumple: F('Meu aniversário', 'Meu aniversário!', 'Convido você para celebrar meu aniversário', 'Convidamos você para celebrar nosso aniversário'),
      infantil: F('Meu aniversário', 'Meu niver!', 'Convido você para celebrar meu aniversário', 'Convidamos você para celebrar nosso aniversário'),
      graduacion: F('Minha formatura', 'Vou me formar!', 'Convido você para celebrar minha formatura', 'Convidamos você para celebrar nossa formatura'),
      babyshower: F('Chá de bebê', 'Chá de bebê!', 'Convidamos você para celebrar\na chegada do bebê'),
      revelacion: F('Chá revelação', 'Menino ou menina?', 'Convidamos você para descobrir\nse é menino ou menina'),
    },
    teEsperamos: ['Espero você', 'Esperamos você'], acompanar: ['Espero que você possa me acompanhar', 'Esperamos que você possa nos acompanhar'],
    exclamaBoda: 'Vamos nos casar!', exclama15: 'Meus quinze!',
    rsvpAntes: 'Confirme presença até {fecha}',
    mensaje: 'Obrigado por nos acompanhar em um dia tão especial. Foi um prazer compartilhá-lo com vocês.',
    citaMomentos: '“Há momentos na vida que são especiais por si só. Compartilhá-los com as pessoas que amamos os torna inesquecíveis”',
    citaFelices: '“Os momentos felizes da vida se tornam incríveis quando temos a sorte de compartilhá-los com a família e os amigos mais queridos.”',
    graciasAcomp: ['Obrigado por me acompanhar e tornar este dia inesquecível!', 'Obrigado por nos acompanhar e tornar este dia inesquecível para nós!'],
    teQueremos: ['Amo você!', 'Amamos você!'],
    fijos: {
      'Próximamente la invitación formal': 'Em breve, o convite oficial', 'Nuestra boda': 'Nosso casamento', '¡Gracias!': 'Obrigado!', '¡Nos casamos!': 'Vamos nos casar!',
      'Nos casamos': 'Vamos nos casar', 'Agenda la fecha': 'Reserve a data', 'Mis quince años': 'Meus 15 anos', 'Mis quince': 'Meus quinze',
      'Te esperamos el': 'Esperamos você em', 'a las {horaCorta}': 'às {horaCorta}', 'Tarjeta de embarque a la boda': 'Cartão de embarque para o casamento',
      'Fecha': 'Data', 'Destino': 'Destino',
    },
  },
  fr: {
    frases: {
      boda: F('Notre mariage', 'Nous nous marions !', 'Nous vous invitons à célébrer\nnotre mariage', 'Nous vous invitons à célébrer\nnotre mariage'),
      15: F('Mes 15 ans', 'Mes quinze ans !', 'Je vous invite à fêter mes 15 ans', 'Nous vous invitons à fêter ses 15 ans'),
      bautismo: F('Mon baptême', 'Mon baptême !', 'Je vous invite à célébrer mon baptême', 'Nous vous invitons à célébrer notre baptême'),
      comunion: F('Ma première communion', 'Ma première communion !', 'Je vous invite à célébrer ma première communion', 'Nous vous invitons à célébrer notre première communion'),
      cumple: F('Mon anniversaire', 'Mon anniversaire !', 'Je vous invite à fêter mon anniversaire', 'Nous vous invitons à fêter notre anniversaire'),
      infantil: F('Mon anniversaire', 'Mon anniv !', 'Je vous invite à fêter mon anniversaire', 'Nous vous invitons à fêter notre anniversaire'),
      graduacion: F('Mon diplôme', 'Je suis diplômé !', 'Je vous invite à fêter mon diplôme', 'Nous vous invitons à fêter notre diplôme'),
      babyshower: F('Baby shower', 'Baby shower !', 'Nous vous invitons à fêter\nl’arrivée du bébé'),
      revelacion: F('Gender reveal', 'Garçon ou fille ?', 'Nous vous invitons à découvrir\nsi c’est un garçon ou une fille'),
    },
    teEsperamos: ['Je vous attends', 'Nous vous attendons'], acompanar: ['J’espère que vous pourrez venir', 'Nous espérons que vous pourrez venir'],
    exclamaBoda: 'Nous nous marions !', exclama15: 'Mes quinze ans !',
    rsvpAntes: 'Merci de répondre avant le {fecha}',
    mensaje: 'Merci d’avoir été avec nous en ce jour si spécial. Ce fut un plaisir de le partager avec vous.',
    citaMomentos: '« Certains moments de la vie sont spéciaux en eux-mêmes. Les partager avec ceux que l’on aime les rend inoubliables »',
    citaFelices: '« Les moments heureux de la vie deviennent merveilleux quand on a la chance de les partager avec sa famille et ses amis les plus chers. »',
    graciasAcomp: ['Merci d’avoir été là et de l’avoir rendu inoubliable !', 'Merci d’avoir été là et de l’avoir rendu inoubliable pour nous !'],
    teQueremos: ['Je vous aime !', 'Nous vous aimons !'],
    fijos: {
      'Próximamente la invitación formal': 'Invitation officielle à suivre', 'Nuestra boda': 'Notre mariage', '¡Gracias!': 'Merci !', '¡Nos casamos!': 'Nous nous marions !',
      'Nos casamos': 'Nous nous marions', 'Agenda la fecha': 'Réservez la date', 'Mis quince años': 'Mes 15 ans', 'Mis quince': 'Mes quinze ans',
      'Te esperamos el': 'Nous vous attendons le', 'a las {horaCorta}': 'à {horaCorta}', 'Tarjeta de embarque a la boda': 'Carte d’embarquement pour le mariage',
      'Fecha': 'Date', 'Destino': 'Destination',
    },
  },
  it: {
    frases: {
      boda: F('Il nostro matrimonio', 'Ci sposiamo!', 'Ti invitiamo a celebrare\nil nostro matrimonio', 'Ti invitiamo a celebrare\nil nostro matrimonio'),
      15: F('I miei 15 anni', 'I miei quindici anni!', 'Ti invito a festeggiare i miei 15 anni', 'Ti invitiamo a festeggiare i suoi 15 anni'),
      bautismo: F('Il mio battesimo', 'Il mio battesimo!', 'Ti invito a celebrare il mio battesimo', 'Ti invitiamo a celebrare il nostro battesimo'),
      comunion: F('La mia prima comunione', 'La mia prima comunione!', 'Ti invito a celebrare la mia prima comunione', 'Ti invitiamo a celebrare la nostra prima comunione'),
      cumple: F('Il mio compleanno', 'Il mio compleanno!', 'Ti invito a festeggiare il mio compleanno', 'Ti invitiamo a festeggiare il nostro compleanno'),
      infantil: F('Il mio compleanno', 'Il mio compleanno!', 'Ti invito a festeggiare il mio compleanno', 'Ti invitiamo a festeggiare il nostro compleanno'),
      graduacion: F('La mia laurea', 'Mi laureo!', 'Ti invito a festeggiare la mia laurea', 'Ti invitiamo a festeggiare la nostra laurea'),
      babyshower: F('Baby shower', 'Baby shower!', 'Ti invitiamo a festeggiare\nl’arrivo del bebè'),
      revelacion: F('Gender reveal', 'Maschio o femmina?', 'Ti invitiamo a scoprire\nse è maschio o femmina'),
    },
    teEsperamos: ['Ti aspetto', 'Ti aspettiamo'], acompanar: ['Spero che tu possa esserci', 'Speriamo che tu possa esserci'],
    exclamaBoda: 'Ci sposiamo!', exclama15: 'I miei quindici anni!',
    rsvpAntes: 'Conferma entro il {fecha}',
    mensaje: 'Grazie per essere stati con noi in un giorno così speciale. È stato un piacere condividerlo con voi.',
    citaMomentos: '“Ci sono momenti nella vita che sono speciali di per sé. Condividerli con le persone che amiamo li rende indimenticabili”',
    citaFelices: '“I momenti felici della vita diventano meravigliosi quando abbiamo la fortuna di condividerli con la famiglia e gli amici più cari.”',
    graciasAcomp: ['Grazie per essere stati con me e averlo reso indimenticabile!', 'Grazie per essere stati con noi e averlo reso indimenticabile per noi!'],
    teQueremos: ['Ti voglio bene!', 'Vi vogliamo bene!'],
    fijos: {
      'Próximamente la invitación formal': 'A breve l’invito ufficiale', 'Nuestra boda': 'Il nostro matrimonio', '¡Gracias!': 'Grazie!', '¡Nos casamos!': 'Ci sposiamo!',
      'Nos casamos': 'Ci sposiamo', 'Agenda la fecha': 'Segna la data', 'Mis quince años': 'I miei 15 anni', 'Mis quince': 'I miei quindici',
      'Te esperamos el': 'Ti aspettiamo il', 'a las {horaCorta}': 'alle {horaCorta}', 'Tarjeta de embarque a la boda': 'Carta d’imbarco per il matrimonio',
      'Fecha': 'Data', 'Destino': 'Destinazione',
    },
  },
  de: {
    frases: {
      boda: F('Unsere Hochzeit', 'Wir heiraten!', 'Wir laden dich ein,\nunsere Hochzeit zu feiern', 'Wir laden dich ein,\nunsere Hochzeit zu feiern'),
      15: F('Mein 15. Geburtstag', 'Meine Quinceañera!', 'Ich lade dich zu meinem 15. Geburtstag ein', 'Wir laden dich zu ihrem 15. Geburtstag ein'),
      bautismo: F('Meine Taufe', 'Meine Taufe!', 'Ich lade dich zu meiner Taufe ein', 'Wir laden dich zu unserer Taufe ein'),
      comunion: F('Meine Erstkommunion', 'Meine Erstkommunion!', 'Ich lade dich zu meiner Erstkommunion ein', 'Wir laden dich zu unserer Erstkommunion ein'),
      cumple: F('Mein Geburtstag', 'Mein Geburtstag!', 'Ich lade dich zu meinem Geburtstag ein', 'Wir laden dich zu unserem Geburtstag ein'),
      infantil: F('Mein Geburtstag', 'Mein Geburtstag!', 'Ich lade dich zu meinem Geburtstag ein', 'Wir laden dich zu unserem Geburtstag ein'),
      graduacion: F('Mein Abschluss', 'Ich habe meinen Abschluss!', 'Ich lade dich ein, meinen Abschluss zu feiern', 'Wir laden dich ein, unseren Abschluss zu feiern'),
      babyshower: F('Babyparty', 'Babyparty!', 'Wir laden dich ein,\ndie Ankunft des Babys zu feiern'),
      revelacion: F('Gender Reveal', 'Junge oder Mädchen?', 'Wir laden dich ein herauszufinden,\nob es ein Junge oder ein Mädchen wird'),
    },
    teEsperamos: ['Ich freue mich auf dich', 'Wir freuen uns auf dich'], acompanar: ['Ich hoffe, du kannst dabei sein', 'Wir hoffen, du kannst dabei sein'],
    exclamaBoda: 'Wir heiraten!', exclama15: 'Meine Quinceañera!',
    rsvpAntes: 'Bitte antworte bis zum {fecha}',
    mensaje: 'Danke, dass ihr an diesem besonderen Tag bei uns wart. Es war uns eine Freude, ihn mit euch zu teilen.',
    citaMomentos: '„Manche Momente im Leben sind schon für sich besonders. Wenn wir sie mit den Menschen teilen, die wir lieben, werden sie unvergesslich“',
    citaFelices: '„Die glücklichen Momente des Lebens werden wunderbar, wenn wir das Glück haben, sie mit unserer Familie und unseren liebsten Freunden zu teilen.“',
    graciasAcomp: ['Danke, dass du dabei warst und den Tag unvergesslich gemacht hast!', 'Danke, dass ihr dabei wart und den Tag für uns unvergesslich gemacht habt!'],
    teQueremos: ['Hab dich lieb!', 'Wir haben dich lieb!'],
    fijos: {
      'Próximamente la invitación formal': 'Die offizielle Einladung folgt', 'Nuestra boda': 'Unsere Hochzeit', '¡Gracias!': 'Danke!', '¡Nos casamos!': 'Wir heiraten!',
      'Nos casamos': 'Wir heiraten', 'Agenda la fecha': 'Merkt euch das Datum', 'Mis quince años': 'Mein 15. Geburtstag', 'Mis quince': 'Meine Quince',
      'Te esperamos el': 'Wir freuen uns auf dich am', 'a las {horaCorta}': 'um {horaCorta}', 'Tarjeta de embarque a la boda': 'Bordkarte zur Hochzeit',
      'Fecha': 'Datum', 'Destino': 'Ziel',
    },
  },
  nl: {
    frases: {
      boda: F('Onze bruiloft', 'We gaan trouwen!', 'We nodigen je uit\nom onze bruiloft te vieren', 'We nodigen je uit\nom onze bruiloft te vieren'),
      15: F('Mijn 15e verjaardag', 'Mijn quinceañera!', 'Ik nodig je uit om mijn 15e verjaardag te vieren', 'We nodigen je uit om haar 15e verjaardag te vieren'),
      bautismo: F('Mijn doop', 'Mijn doop!', 'Ik nodig je uit om mijn doop te vieren', 'We nodigen je uit om onze doop te vieren'),
      comunion: F('Mijn eerste communie', 'Mijn eerste communie!', 'Ik nodig je uit om mijn eerste communie te vieren', 'We nodigen je uit om onze eerste communie te vieren'),
      cumple: F('Mijn verjaardag', 'Mijn verjaardag!', 'Ik nodig je uit om mijn verjaardag te vieren', 'We nodigen je uit om onze verjaardag te vieren'),
      infantil: F('Mijn verjaardag', 'Mijn verjaardag!', 'Ik nodig je uit om mijn verjaardag te vieren', 'We nodigen je uit om onze verjaardag te vieren'),
      graduacion: F('Mijn diploma-uitreiking', 'Ik studeer af!', 'Ik nodig je uit om mijn diploma te vieren', 'We nodigen je uit om ons diploma te vieren'),
      babyshower: F('Babyshower', 'Babyshower!', 'We nodigen je uit\nom de komst van de baby te vieren'),
      revelacion: F('Gender reveal', 'Jongen of meisje?', 'We nodigen je uit om te ontdekken\nof het een jongen of een meisje is'),
    },
    teEsperamos: ['Ik verwacht je', 'We verwachten je'], acompanar: ['Ik hoop dat je erbij kunt zijn', 'We hopen dat je erbij kunt zijn'],
    exclamaBoda: 'We gaan trouwen!', exclama15: 'Mijn quinceañera!',
    rsvpAntes: 'Graag reageren vóór {fecha}',
    mensaje: 'Bedankt dat jullie er waren op zo’n bijzondere dag. Het was een genoegen hem met jullie te delen.',
    citaMomentos: '“Sommige momenten in het leven zijn op zichzelf al bijzonder. Ze delen met de mensen van wie we houden, maakt ze onvergetelijk”',
    citaFelices: '“De gelukkige momenten in het leven worden geweldig als we het geluk hebben ze te delen met onze liefste familie en vrienden.”',
    graciasAcomp: ['Bedankt dat je erbij was en het onvergetelijk hebt gemaakt!', 'Bedankt dat je erbij was en het voor ons onvergetelijk hebt gemaakt!'],
    teQueremos: ['Ik hou van je!', 'We houden van je!'],
    fijos: {
      'Próximamente la invitación formal': 'De officiële uitnodiging volgt', 'Nuestra boda': 'Onze bruiloft', '¡Gracias!': 'Bedankt!', '¡Nos casamos!': 'We gaan trouwen!',
      'Nos casamos': 'We gaan trouwen', 'Agenda la fecha': 'Noteer de datum', 'Mis quince años': 'Mijn 15e verjaardag', 'Mis quince': 'Mijn quince',
      'Te esperamos el': 'We verwachten je op', 'a las {horaCorta}': 'om {horaCorta}', 'Tarjeta de embarque a la boda': 'Instapkaart naar de bruiloft',
      'Fecha': 'Datum', 'Destino': 'Bestemming',
    },
  },
};

// Un texto fijo del diseño traducido, con los mismos cortes de línea que el original (repartidos por palabras)
const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
export function traducirFijo(texto, base) {
  const d = TARJETA_I18N[base]; if (!d || texto == null) return texto;
  const s = String(texto), n = norm(s);
  const exacto = d.fijos[n] ?? Object.entries(d.fijos).find(([k]) => k.toLowerCase() === n.toLowerCase())?.[1];
  if (exacto == null) return texto;
  const cortes = (s.match(/\n/g) || []).length;
  if (!cortes) return s === s.toUpperCase() && /[a-z]/i.test(s) ? exacto.toUpperCase() : exacto;
  const pal = exacto.split(' '), lineas = cortes + 1, por = Math.ceil(pal.length / lineas);
  const out = Array.from({ length: lineas }, (_, i) => pal.slice(i * por, (i + 1) * por).join(' ')).filter(Boolean).join('\n');
  return s === s.toUpperCase() && /[a-z]/i.test(s) ? out.toUpperCase() : out;
}
