// README (ronda 44) · Las demos en otros idiomas: nombres de muestra del idioma (solo en la demo; las miniaturas no
// cambian), roles de los padrinos, titular de la cuenta («John Doe»…) y el itinerario. Las claves son el texto en inglés.
// Idiomas: pt, fr, it, de, nl, ca (el inglés y el español ya están en demos.js).

const L = ['en', 'pt', 'fr', 'it', 'de', 'nl', 'ca'];
const tabla = (filas) => Object.fromEntries(Object.entries(filas).map(([k, v]) => [k, Object.fromEntries(L.map((l, i) => [l, v[i]]))]));

// Nombre de muestra → [en, pt, fr, it, de, nl, ca]. «Nombre|b» = el segundo nombre de la pareja (Ale/Gaby pueden ser de los dos)
const NOMBRES = tabla({
  // Ellas
  Agus: ['Abby', 'Gabi', 'Agathe', 'Agnese', 'Anja', 'Anouk', 'Agnès'],
  Ale: ['Alex', 'Alê', 'Alix', 'Ale', 'Alex', 'Lex', 'Àlex'],
  Ana: ['Anna', 'Ana', 'Anna', 'Anna', 'Anna', 'Anna', 'Anna'],
  Ariadna: ['Ariana', 'Ariana', 'Ariane', 'Arianna', 'Ariane', 'Ariane', 'Ariadna'],
  'Aylén': ['Ellen', 'Helena', 'Hélène', 'Elena', 'Helene', 'Eline', 'Helena'],
  Camila: ['Camilla', 'Camila', 'Camille', 'Camilla', 'Camilla', 'Camilla', 'Camil·la'],
  Fanny: ['Fanny', 'Fanny', 'Fanny', 'Fanny', 'Fanny', 'Fanny', 'Fanny'],
  Flor: ['Lily', 'Flor', 'Fleur', 'Flora', 'Flora', 'Floor', 'Flor'],
  Juliana: ['Julia', 'Juliana', 'Julie', 'Giulia', 'Julia', 'Julia', 'Júlia'],
  Valeria: ['Valerie', 'Valéria', 'Valérie', 'Valeria', 'Valerie', 'Valerie', 'Valèria'],
  Karen: ['Karen', 'Karen', 'Karine', 'Karen', 'Karin', 'Karin', 'Karen'],
  Lau: ['Laurie', 'Laura', 'Laure', 'Laura', 'Laura', 'Laura', 'Laura'],
  Laura: ['Laura', 'Laura', 'Laure', 'Laura', 'Laura', 'Laura', 'Laura'],
  Melisa: ['Melissa', 'Melissa', 'Mélissa', 'Melissa', 'Melissa', 'Melissa', 'Melisa'],
  Natalia: ['Natalie', 'Natália', 'Nathalie', 'Natalia', 'Natalie', 'Natalie', 'Natàlia'],
  Paula: ['Paula', 'Paula', 'Pauline', 'Paola', 'Paula', 'Paula', 'Paula'],
  Priscila: ['Priscilla', 'Priscila', 'Priscille', 'Priscilla', 'Priscilla', 'Priscilla', 'Priscil·la'],
  'Rocío': ['Rose', 'Rosa', 'Rose', 'Rosa', 'Rosa', 'Roos', 'Rosa'],
  Romi: ['Romy', 'Romi', 'Romy', 'Romina', 'Romy', 'Romy', 'Romina'],
  Sabri: ['Sabrina', 'Sabrina', 'Sabrina', 'Sabrina', 'Sabrina', 'Sabrina', 'Sabrina'],
  Sofi: ['Sophie', 'Sofia', 'Sophie', 'Sofia', 'Sophie', 'Sofie', 'Sofia'],
  Sol: ['Stella', 'Sol', 'Solène', 'Stella', 'Stella', 'Sol', 'Estel'],
  Vani: ['Vanessa', 'Vanessa', 'Vanessa', 'Vanessa', 'Vanessa', 'Vanessa', 'Vanessa'],
  Victoria: ['Victoria', 'Vitória', 'Victoire', 'Vittoria', 'Viktoria', 'Victoria', 'Victòria'],
  Mariana: ['Marianne', 'Mariana', 'Marianne', 'Marianna', 'Marianne', 'Marianne', 'Mariona'],
  'Fátima': ['Faith', 'Fátima', 'Élise', 'Federica', 'Frieda', 'Fleur', 'Fàtima'],
  Mariel: ['Meryl', 'Mariela', 'Muriel', 'Mariella', 'Marlene', 'Mariël', 'Mariel'],
  Cinthia: ['Cynthia', 'Cíntia', 'Cynthia', 'Cinzia', 'Cynthia', 'Cynthia', 'Cíntia'],
  Abi: ['Abby', 'Bia', 'Abby', 'Abi', 'Abby', 'Abby', 'Abi'],
  Lucila: ['Lucy', 'Lúcia', 'Lucie', 'Lucia', 'Lucie', 'Lucie', 'Llúcia'],
  Martina: ['Tina', 'Martina', 'Martine', 'Martina', 'Martina', 'Martine', 'Martina'],
  // Ellos
  Fran: ['Frank', 'Chico', 'François', 'Franco', 'Franz', 'Frans', 'Francesc'],
  Bruno: ['Bruno', 'Bruno', 'Bruno', 'Bruno', 'Bruno', 'Bruno', 'Bru'],
  Alen: ['Allen', 'Alan', 'Alain', 'Alessio', 'Alan', 'Alan', 'Alan'],
  Mario: ['Mario', 'Mário', 'Marius', 'Mario', 'Mario', 'Mario', 'Mari'],
  'Matías': ['Matt', 'Matias', 'Mathias', 'Mattia', 'Matthias', 'Matthijs', 'Macià'],
  Gustavo: ['Gus', 'Gustavo', 'Gustave', 'Gustavo', 'Gustav', 'Guus', 'Gustau'],
  Pablo: ['Paul', 'Paulo', 'Paul', 'Paolo', 'Paul', 'Paul', 'Pau'],
  Pabli: ['Paulie', 'Paulinho', 'Paulo', 'Paolino', 'Pauli', 'Paul', 'Pau'],
  Rei: ['Ray', 'Rei', 'Rémy', 'Remo', 'René', 'Rein', 'Rei'],
  Gonza: ['Greg', 'Guga', 'Gaston', 'Gino', 'Georg', 'Gijs', 'Gonçal'],
  Gonzalo: ['Gordon', 'Gonçalo', 'Gaspard', 'Giorgio', 'Georg', 'Gerard', 'Gonçal'],
  Mateo: ['Matthew', 'Mateus', 'Mathéo', 'Matteo', 'Matthias', 'Mats', 'Mateu'],
  Mariano: ['Marvin', 'Mariano', 'Marin', 'Mariano', 'Marian', 'Marijn', 'Marià'],
  Marian: ['Marvin', 'Mário', 'Marin', 'Mariano', 'Marian', 'Marijn', 'Marià'],
  Facundo: ['Felix', 'Fábio', 'Fabien', 'Fabio', 'Felix', 'Floris', 'Fèlix'],
  Alejo: ['Alex', 'Alexandre', 'Alexis', 'Alessio', 'Alexander', 'Alexander', 'Aleix'],
  'Nicolás': ['Nicholas', 'Nicolau', 'Nicolas', 'Nicola', 'Niklas', 'Nick', 'Nicolau'],
  Jorge: ['George', 'Jorge', 'Georges', 'Giorgio', 'Jörg', 'Joris', 'Jordi'],
  'Gaby|b': ['Gabe', 'Gabriel', 'Gabriel', 'Gabriele', 'Gabriel', 'Gabriël', 'Gabriel'],
  'Ale|b': ['Alex', 'Alê', 'Alex', 'Ale', 'Alex', 'Alex', 'Àlex'],
  Lean: ['Leon', 'Léo', 'Léon', 'Leo', 'Leon', 'Leon', 'Lleó'],
  Dani: ['Danny', 'Dani', 'Dany', 'Dani', 'Dani', 'Daan', 'Dani'],
  Marcos: ['Mark', 'Marcos', 'Marc', 'Marco', 'Markus', 'Mark', 'Marc'],
  'Martín': ['Martin', 'Martim', 'Martin', 'Martino', 'Martin', 'Maarten', 'Martí'],
  'Agustín': ['Austin', 'Augusto', 'Augustin', 'Agostino', 'August', 'Guus', 'Agustí'],
  // Otros eventos
  'Dani & Marce': ['Danny & Marc', 'Dani & Marcelo', 'Dany & Marc', 'Dani & Marco', 'Dani & Marc', 'Daan & Marc', 'Dani & Marc'],
  'Familia Pérez': ['The Parker Family', 'Família Pereira', 'Famille Petit', 'Famiglia Rossi', 'Familie Müller', 'Familie de Vries', 'Família Puig'],
  'Instituto Superior': ['State College', 'Instituto Superior', 'Institut Supérieur', 'Istituto Superiore', 'Hochschule', 'Hogeschool', 'Institut Superior'],
});

// Nombres de la demo en el idioma de la demo (en español, los de siempre)
export function nombresDemo(nombres, idioma) {
  if (!nombres || !L.includes(idioma)) return nombres;
  const n = (v, slot) => (NOMBRES[`${v}|${slot}`] || NOMBRES[v])?.[idioma] || v;
  return Object.fromEntries(Object.entries(nombres).map(([k, v]) => [k, typeof v === 'string' ? n(v, k) : v]));
}

// Padrinos / testigos de la demo: [nombre de él, nombre de ella] y roles
export const PERSONAS = tabla({
  hombre: ['John Smith', 'João Ferreira', 'Jean Martin', 'Giovanni Rossi', 'Johann Müller', 'Jan de Jong', 'Joan Puig'],
  mujer: ['Emily Johnson', 'Marta Gomes', 'Marie Dubois', 'Marta Bianchi', 'Marie Schmidt', 'Marieke Jansen', 'Marta Vidal'],
  titular: ['John Doe', 'Fulano de Tal', 'Jean Dupont', 'Mario Rossi', 'Max Mustermann', 'Jan Jansen', 'Joan Fulano'],
  rolHermano: ["GROOM'S BROTHER", 'IRMÃO DO NOIVO', 'FRÈRE DU MARIÉ', 'FRATELLO DELLO SPOSO', 'BRUDER DES BRÄUTIGAMS', 'BROER VAN DE BRUIDEGOM', 'GERMÀ DEL NUVI'],
  rolAmigaNovia: ["BRIDE'S BEST FRIEND", 'MELHOR AMIGA DA NOIVA', 'MEILLEURE AMIE DE LA MARIÉE', 'MIGLIORE AMICA DELLA SPOSA', 'BESTE FREUNDIN DER BRAUT', 'BESTE VRIENDIN VAN DE BRUID', 'MILLOR AMIGA DE LA NÚVIA'],
  rolAmigo: ['BEST FRIEND', 'MELHOR AMIGO', 'MEILLEUR AMI', 'MIGLIORE AMICO', 'BESTER FREUND', 'BESTE VRIEND', 'MILLOR AMIC'],
  rolAmiga: ['BEST FRIEND', 'MELHOR AMIGA', 'MEILLEURE AMIE', 'MIGLIORE AMICA', 'BESTE FREUNDIN', 'BESTE VRIENDIN', 'MILLOR AMIGA'],
  rolPadrino: ['GODFATHER', 'PADRINHO', 'PARRAIN', 'PADRINO', 'PATE', 'PETER', 'PADRÍ'],
  rolMadrina: ['GODMOTHER', 'MADRINHA', 'MARRAINE', 'MADRINA', 'PATIN', 'METER', 'PADRINA'],
  titularEtiqueta: ['Account holder', 'Titular', 'Titulaire', 'Intestatario', 'Kontoinhaber', 'Rekeninghouder', 'Titular'],
  lista: ['Registry', 'Lista', 'Liste', 'Lista', 'Wunschliste', 'Lijst', 'Llista'],
});

// Itinerario de la demo (clave: el texto en inglés) → [en, pt, fr, it, de, nl, ca]
export const ITINERARIO_IDIOMAS = tabla({
  Ceremony: ['Ceremony', 'Cerimônia', 'Cérémonie', 'Cerimonia', 'Trauung', 'Ceremonie', 'Cerimònia'],
  Reception: ['Reception', 'Recepção', 'Réception', 'Ricevimento', 'Empfang', 'Receptie', 'Recepció'],
  Dinner: ['Dinner', 'Jantar', 'Dîner', 'Cena', 'Abendessen', 'Diner', 'Sopar'],
  'First dance': ['First dance', 'Primeira dança', 'Première danse', 'Primo ballo', 'Eröffnungstanz', 'Openingsdans', 'Primer ball'],
  Waltz: ['Waltz', 'Valsa', 'Valse', 'Valzer', 'Walzer', 'Wals', 'Vals'],
  Cake: ['Cake', 'Bolo', 'Gâteau', 'Torta', 'Torte', 'Taart', 'Pastís'],
  Party: ['Party', 'Festa', 'Fête', 'Festa', 'Party', 'Feest', 'Festa'],
  'Grand entrance': ['Grand entrance', 'Entrada', 'Grande entrée', 'Ingresso', 'Großer Auftritt', 'Grote entree', 'Entrada'],
  Baptism: ['Baptism', 'Batizado', 'Baptême', 'Battesimo', 'Taufe', 'Doop', 'Bateig'],
  Lunch: ['Lunch', 'Almoço', 'Déjeuner', 'Pranzo', 'Mittagessen', 'Lunch', 'Dinar'],
  Mass: ['Mass', 'Missa', 'Messe', 'Messa', 'Messe', 'Mis', 'Missa'],
  Welcome: ['Welcome', 'Boas-vindas', 'Accueil', 'Benvenuto', 'Willkommen', 'Welkom', 'Benvinguda'],
  Games: ['Games', 'Jogos', 'Jeux', 'Giochi', 'Spiele', 'Spelletjes', 'Jocs'],
  'Boy or girl?': ['Boy or girl?', 'Menino ou menina?', 'Garçon ou fille ?', 'Maschio o femmina?', 'Junge oder Mädchen?', 'Jongen of meisje?', 'Nen o nena?'],
  'Welcome cocktail': ['Welcome cocktail', 'Coquetel de boas-vindas', 'Cocktail de bienvenue', 'Aperitivo di benvenuto', 'Begrüßungscocktail', 'Welkomstdrankje', 'Còctel de benvinguda'],
  Sparklers: ['Sparklers', 'Velas de faísca', 'Cierges magiques', 'Stelline', 'Wunderkerzen', 'Sterretjes', 'Bengales'],
  'Dinner time!': ['Dinner time!', 'Hora do jantar!', 'À table !', 'A cena!', 'Zeit fürs Essen!', 'Aan tafel!', 'A sopar!'],
  'Christmas karaoke': ['Christmas karaoke', 'Karaokê de Natal', 'Karaoké de Noël', 'Karaoke natalizio', 'Weihnachtskaraoke', 'Kerstkaraoke', 'Karaoke de Nadal'],
  'Toasts by the tree': ['Toasts by the tree', 'Brindes junto à árvore', "Toasts au pied du sapin", "Brindisi vicino all'albero", 'Anstoßen am Baum', 'Proosten bij de boom', "Brindis al costat de l'arbre"],
  'Gift exchange': ['Gift exchange', 'Troca de presentes', 'Échange de cadeaux', 'Scambio di regali', 'Geschenketausch', 'Cadeautjes uitwisselen', 'Intercanvi de regals'],
  'Welcome to the adventure!': ['Welcome to the adventure!', 'Bem-vindos à aventura!', "Bienvenue dans l'aventure !", "Benvenuti all'avventura!", 'Willkommen zum Abenteuer!', 'Welkom bij het avontuur!', "Benvinguts a l'aventura!"],
  'Special entertainment': ['Special entertainment', 'Animação especial', 'Animation spéciale', 'Animazione speciale', 'Besonderes Programm', 'Speciale show', 'Animació especial'],
  'Snack time': ['Snack time', 'Hora do lanche', "C'est l'heure du goûter", 'Merenda', 'Snackpause', 'Tijd voor een hapje', 'Hora de berenar'],
  'Piñata time': ['Piñata time', 'Hora da piñata', "C'est l'heure de la piñata", 'Ora della pentolaccia', 'Piñata-Zeit', 'Tijd voor de piñata', 'Hora de la piñata'],
  'Cake and wishes': ['Cake and wishes', 'Bolo e desejos', 'Gâteau et vœux', 'Torta e desideri', 'Torte und Wünsche', 'Taart en wensen', 'Pastís i desitjos'],
  'Gifts and goodbye': ['Gifts and goodbye', 'Presentes e despedida', 'Cadeaux et au revoir', 'Regali e saluti', 'Geschenke und Abschied', 'Cadeaus en afscheid', 'Regals i comiat'],
  "Graduate's welcome": ["Graduate's welcome", 'Recepção do formando', 'Accueil du diplômé', 'Benvenuto del laureato', 'Empfang der Absolventen', 'Ontvangst van de geslaagde', 'Rebuda del graduat'],
  'Thank-you words': ['Thank-you words', 'Palavras de agradecimento', 'Mots de remerciement', 'Parole di ringraziamento', 'Dankesworte', 'Dankwoordje', "Paraules d'agraïment"],
  'Let the party begin!': ['Let the party begin!', 'Que comece a festa!', 'Que la fête commence !', 'Che la festa abbia inizio!', 'Lasst die Party beginnen!', 'Laat het feest beginnen!', 'Que comenci la festa!'],
  'Let the dancing begin!': ['Let the dancing begin!', 'Que comece a dança!', 'Que la danse commence !', 'Che le danze abbiano inizio!', 'Auf die Tanzfläche!', 'Laat het dansen beginnen!', 'Que comenci el ball!'],
  'Dance till we drop': ['Dance till we drop', 'Dançar até cansar', "Danser jusqu'au bout de la nuit", 'Ballare fino allo sfinimento', 'Tanzen bis zum Umfallen', 'Dansen tot we erbij neervallen', 'Ballar fins que el cos aguanti'],
  Farewell: ['Farewell', 'Despedida', 'Au revoir', 'Saluti', 'Abschied', 'Afscheid', 'Comiat'],
  'Welcome! (Hugs and photos)': ['Welcome! (Hugs and photos)', 'Bem-vindos! (Abraços e fotos)', 'Bienvenue ! (Câlins et photos)', 'Benvenuti! (Abbracci e foto)', 'Willkommen! (Umarmungen und Fotos)', 'Welkom! (Knuffels en foto’s)', 'Benvinguts! (Abraçades i fotos)'],
  'Time to eat': ['Time to eat', 'Hora de comer', "C'est l'heure de manger", 'Si mangia', 'Zeit zum Essen', 'Tijd om te eten', 'Hora de menjar'],
  'Let the games begin!': ['Let the games begin!', 'Que comecem os jogos!', 'Que les jeux commencent !', 'Che i giochi abbiano inizio!', 'Lasst die Spiele beginnen!', 'Laat de spelletjes beginnen!', 'Que comencin els jocs!'],
  'Cake and wishes for the baby': ['Cake and wishes for the baby', 'Bolo e desejos para o bebê', 'Gâteau et vœux pour bébé', 'Torta e auguri per il bebè', 'Torte und Wünsche fürs Baby', 'Taart en wensen voor de baby', 'Pastís i desitjos per al nadó'],
  'Cake and goodbye': ['Cake and goodbye', 'Bolo e despedida', 'Gâteau et au revoir', 'Torta e saluti', 'Torte und Abschied', 'Taart en afscheid', 'Pastís i comiat'],
  'Breaking the ice': ['Breaking the ice', 'Quebrando o gelo', 'On brise la glace', 'Rompere il ghiaccio', 'Das Eis brechen', 'Het ijs breken', 'Trencant el gel'],
});
export const IDIOMAS_DEMO = L;
