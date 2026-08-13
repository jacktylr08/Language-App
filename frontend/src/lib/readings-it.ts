/**
 * Italian reading passages.
 *
 * Same contract as the Spanish set in readings.ts — short texts a learner
 * reads for comprehension, tapping any word for a gloss rather than reaching
 * for a full translation. `minWeek` gates each one against course progress,
 * exactly as the tutor's level ceiling does, so nothing appears containing
 * grammar the learner has not met.
 *
 * The glossaries are deliberately generous. A passage where you have to tap
 * three words and one of them has no gloss is a passage you abandon, and the
 * whole premise of extensive reading is that you keep going.
 */
import type { ReadingPassage } from './readings';

export const READINGS_IT: ReadingPassage[] = [
  {
    slug: 'la-mia-famiglia',
    title: 'La mia famiglia',
    emoji: '👨‍👩‍👧',
    minWeek: 1,
    blurb: 'Meet a small family, in the simplest Italian there is.',
    text: `Ciao! Mi chiamo Anna. Sono italiana. Ho una famiglia piccola.

Mio padre si chiama Carlo. Mia madre si chiama Elena. Ho un fratello. Si chiama Paolo.

Abitiamo in una casa a Roma. La casa è piccola ma bella. Mi piace molto la mia famiglia.`,
    glossary: {
      mi: 'me / myself',
      chiamo: 'I call (mi chiamo = "I am called")',
      chiama: 'is called',
      si: 'himself / herself',
      sono: 'I am',
      ho: 'I have',
      una: 'a (feminine)',
      un: 'a (masculine)',
      mio: 'my (masculine)',
      mia: 'my (feminine)',
      abitiamo: 'we live',
      in: 'in',
      a: 'at / to / in',
      ma: 'but',
      piace: 'is pleasing (mi piace = I like)',
      molto: 'very / a lot',
      italiana: 'Italian (feminine)',
    },
  },
  {
    slug: 'la-mia-giornata',
    title: 'La mia giornata',
    emoji: '🌅',
    minWeek: 2,
    blurb: 'A day from breakfast to bedtime, one simple sentence at a time.',
    text: `Ogni giorno faccio colazione alle otto. Bevo un caffè e mangio il pane.

Poi lavoro. Lavoro in un ufficio a Milano. Il lavoro è difficile ma mi piace.

La sera torno a casa. Guardo un film o leggo un libro. Alle undici vado a letto.`,
    glossary: {
      ogni: 'every',
      giorno: 'day',
      faccio: 'I do / I make',
      colazione: 'breakfast',
      alle: 'at (with times)',
      otto: 'eight',
      bevo: 'I drink',
      e: 'and',
      mangio: 'I eat',
      poi: 'then',
      lavoro: 'I work / the work',
      ufficio: 'office',
      difficile: 'difficult',
      sera: 'evening',
      torno: 'I return',
      guardo: 'I watch',
      film: 'film',
      o: 'or',
      leggo: 'I read',
      undici: 'eleven',
      vado: 'I go',
      letto: 'bed',
    },
  },
  {
    slug: 'al-bar',
    title: 'Al bar',
    emoji: '☕',
    minWeek: 3,
    blurb: 'Ordering a coffee — the most Italian scene there is.',
    text: `Entro nel bar. C'è molta gente. Il barista è simpatico.

«Buongiorno! Cosa prende?»
«Un caffè, per favore. E un cornetto.»
«Subito. Sono due euro e cinquanta.»

Pago e bevo il caffè in piedi, come fanno gli italiani. È molto buono.`,
    glossary: {
      entro: 'I enter',
      nel: 'in the',
      bar: 'bar / café',
      "c'è": 'there is',
      molta: 'a lot of',
      gente: 'people',
      barista: 'barista',
      simpatico: 'nice, friendly',
      prende: 'you take / you have',
      cornetto: 'croissant',
      subito: 'right away',
      due: 'two',
      euro: 'euro',
      cinquanta: 'fifty',
      pago: 'I pay',
      bevo: 'I drink',
      piedi: 'feet (in piedi = standing up)',
      come: 'like / how',
      fanno: 'they do',
      gli: 'the (masculine plural)',
      italiani: 'Italians',
    },
  },
  {
    slug: 'la-citta-di-roma',
    title: 'La città di Roma',
    emoji: '🏛️',
    minWeek: 4,
    blurb: 'A short tour of the city, in the present tense.',
    text: `Roma è una città molto antica e molto bella. Ci sono chiese, piazze e fontane dappertutto.

La gente cammina piano. Mangia bene. Parla molto e ride spesso.

Ogni sera le piazze sono piene di gente. I bambini giocano, i vecchi parlano, e tutti mangiano il gelato.`,
    glossary: {
      antica: 'ancient, old',
      ci: 'there',
      sono: 'are',
      chiese: 'churches',
      piazze: 'squares',
      fontane: 'fountains',
      dappertutto: 'everywhere',
      cammina: 'walks',
      piano: 'slowly',
      mangia: 'eats',
      parla: 'speaks',
      ride: 'laughs',
      spesso: 'often',
      piene: 'full',
      bambini: 'children',
      giocano: 'play',
      vecchi: 'old people',
      tutti: 'everyone',
      mangiano: 'eat',
      gelato: 'ice cream',
    },
  },
  {
    slug: 'una-lettera-a-marco',
    title: 'Una lettera a Marco',
    emoji: '✉️',
    minWeek: 5,
    blurb: 'A friendly letter — questions, plans and a bit of news.',
    text: `Caro Marco,

come stai? Io sto bene. Studio italiano ogni giorno e capisco sempre di più.

Dove abiti adesso? Lavori ancora a Firenze? Quando vieni a Londra?

Io arrivo in Italia a giugno. Possiamo vederci? Voglio conoscere la tua città.

Un abbraccio,
Anna`,
    glossary: {
      caro: 'dear',
      sto: 'I am (feeling)',
      studio: 'I study',
      capisco: 'I understand',
      sempre: 'always',
      di: 'of',
      più: 'more (sempre di più = more and more)',
      abiti: 'you live',
      adesso: 'now',
      lavori: 'you work',
      ancora: 'still',
      quando: 'when',
      vieni: 'you come',
      arrivo: 'I arrive',
      giugno: 'June',
      possiamo: 'we can',
      vederci: 'to see each other',
      voglio: 'I want',
      conoscere: 'to get to know',
      tua: 'your',
      abbraccio: 'hug',
    },
  },
  {
    slug: 'il-mercato',
    title: 'Il mercato',
    emoji: '🍅',
    minWeek: 6,
    blurb: 'Saturday morning at the market, with prices and small talk.',
    text: `Il sabato mattina vado sempre al mercato. È vicino a casa mia, a dieci minuti a piedi.

Compro il pane, il formaggio e la frutta. Il formaggio qui è ottimo e non costa molto.

«Quanto costa questo?» chiedo.
«Tre euro al chilo», dice la signora. «È freschissimo.»

Compro due chili. Poi torno a casa e faccio il pranzo.`,
    glossary: {
      sabato: 'Saturday',
      mattina: 'morning',
      vicino: 'near',
      dieci: 'ten',
      minuti: 'minutes',
      piedi: 'feet (a piedi = on foot)',
      compro: 'I buy',
      frutta: 'fruit',
      qui: 'here',
      ottimo: 'excellent',
      costa: 'costs',
      questo: 'this',
      chiedo: 'I ask',
      tre: 'three',
      chilo: 'kilo',
      dice: 'says',
      signora: 'lady',
      freschissimo: 'very fresh',
      chili: 'kilos',
      pranzo: 'lunch',
    },
  },
  {
    slug: 'un-weekend-a-firenze',
    title: 'Un weekend a Firenze',
    emoji: '🌉',
    minWeek: 9,
    blurb: 'A weekend told in the past tense — where they went and what they did.',
    text: `Il weekend scorso sono andato a Firenze con Marco. Siamo partiti venerdì sera in treno.

Sabato abbiamo visitato il Duomo. Ho fatto molte foto. Poi abbiamo mangiato in una piccola trattoria vicino al fiume.

Domenica ha piovuto tutto il giorno, così siamo rimasti in albergo. Abbiamo letto e parlato per ore.

Siamo tornati lunedì mattina. È stato un weekend bellissimo.`,
    glossary: {
      scorso: 'last, past',
      andato: 'gone',
      partiti: 'left, departed',
      venerdì: 'Friday',
      treno: 'train',
      visitato: 'visited',
      duomo: 'cathedral',
      fatto: 'done, made',
      foto: 'photos',
      mangiato: 'eaten',
      trattoria: 'small restaurant',
      fiume: 'river',
      domenica: 'Sunday',
      piovuto: 'rained',
      così: 'so',
      rimasti: 'stayed, remained',
      albergo: 'hotel',
      letto: 'read',
      parlato: 'talked',
      ore: 'hours',
      tornati: 'returned',
      lunedì: 'Monday',
      stato: 'been',
    },
  },
  {
    slug: 'quando-ero-bambino',
    title: 'Quando ero bambino',
    emoji: '🧒',
    minWeek: 10,
    blurb: 'Childhood memories — the imperfect tense doing what it does best.',
    text: `Quando ero bambino abitavo in un paese piccolo vicino al mare.

Ogni estate andavo in spiaggia con mio fratello. Nuotavamo tutto il giorno e la sera mangiavamo il pesce che prendeva nostro nonno.

La casa era vecchia e non c'era il riscaldamento. D'inverno faceva molto freddo, ma eravamo felici.

Adesso abito in città. Mi manca il mare.`,
    glossary: {
      quando: 'when',
      ero: 'I was',
      abitavo: 'I used to live',
      paese: 'village, town',
      estate: 'summer',
      andavo: 'I used to go',
      spiaggia: 'beach',
      nuotavamo: 'we used to swim',
      mangiavamo: 'we used to eat',
      pesce: 'fish',
      che: 'that, which',
      prendeva: 'used to catch',
      nostro: 'our',
      nonno: 'grandfather',
      era: 'was',
      "c'era": 'there was',
      riscaldamento: 'heating',
      inverno: 'winter',
      faceva: 'it was (weather)',
      freddo: 'cold',
      eravamo: 'we were',
      felici: 'happy',
      manca: 'is missing (mi manca = I miss)',
    },
  },
  {
    slug: 'la-telefonata',
    title: 'La telefonata',
    emoji: '📞',
    minWeek: 11,
    blurb: 'Two tenses working together — a phone call that interrupts a quiet evening.',
    text: `Ieri sera leggevo tranquillamente sul divano. Faceva freddo fuori e pioveva.

Improvvisamente ha suonato il telefono. Era Giulia.

«Sei libero domani?» ha chiesto. «Andiamo al cinema?»

Non avevo programmi, così ho detto di sì. Poi abbiamo parlato per mezz'ora.

Quando ho chiuso il telefono, era già tardi. Sono andato a letto contento.`,
    glossary: {
      tranquillamente: 'peacefully',
      divano: 'sofa',
      fuori: 'outside',
      pioveva: 'it was raining',
      improvvisamente: 'suddenly',
      suonato: 'rang',
      telefono: 'telephone',
      libero: 'free',
      chiesto: 'asked',
      andiamo: 'shall we go',
      cinema: 'cinema',
      avevo: 'I had',
      programmi: 'plans',
      detto: 'said',
      mezz: 'half',
      ora: 'hour',
      chiuso: 'closed, hung up',
      già: 'already',
      tardi: 'late',
      contento: 'happy',
    },
  },
  {
    slug: 'i-programmi-per-lestate',
    title: "I programmi per l'estate",
    emoji: '🏖️',
    minWeek: 12,
    blurb: 'Summer plans, told in the present tense the way Italians actually do.',
    text: `Quest'estate vado in Sicilia. Parto il quindici luglio e resto tre settimane.

Prima passo qualche giorno a Palermo. Conosco una ragazza lì, si chiama Chiara, e mi fa vedere la città.

Poi vado al mare. Voglio nuotare ogni giorno e mangiare molto pesce.

Alla fine torno a Roma. Il lavoro ricomincia a settembre, ma non ci penso ancora.`,
    glossary: {
      quest: 'this',
      sicilia: 'Sicily',
      parto: 'I leave',
      quindici: 'fifteen',
      luglio: 'July',
      resto: 'I stay',
      settimane: 'weeks',
      passo: 'I spend',
      qualche: 'a few',
      palermo: 'Palermo',
      ragazza: 'girl',
      lì: 'there',
      fa: 'makes / does',
      vedere: 'to see',
      nuotare: 'to swim',
      ricomincia: 'starts again',
      settembre: 'September',
      penso: 'I think',
      ancora: 'yet',
    },
  },
  {
    slug: 'il-colloquio',
    title: 'Il colloquio',
    emoji: '💼',
    minWeek: 17,
    blurb: 'A job interview, with pronouns doing the work.',
    text: `Stamattina avevo un colloquio importante. Mi sono svegliato presto e mi sono vestito bene.

Quando sono arrivato, la segretaria mi ha accolto e mi ha detto di aspettare. L'ho ringraziata e mi sono seduto.

Il direttore mi ha fatto molte domande. Gliele ho risposte con calma. Mi ha chiesto dei miei progetti e gli ho spiegato tutto.

Alla fine mi ha detto: «La richiameremo». Non so cosa significhi, ma sono contento di come è andata.`,
    glossary: {
      colloquio: 'interview',
      svegliato: 'woken up',
      vestito: 'dressed',
      segretaria: 'secretary',
      accolto: 'welcomed',
      aspettare: 'to wait',
      ringraziata: 'thanked (her)',
      seduto: 'sat down',
      direttore: 'director, manager',
      gliele: 'them to him',
      risposte: 'answered',
      calma: 'calm',
      chiesto: 'asked',
      spiegato: 'explained',
      richiameremo: 'we will call back',
      significhi: 'it means',
      andata: 'gone',
    },
  },
  {
    slug: 'una-giornata-storta',
    title: 'Una giornata storta',
    emoji: '🌧️',
    minWeek: 19,
    blurb: 'Everything goes wrong — told with the imperative and a lot of feeling.',
    text: `Ieri è stata una giornata storta. Mi sono svegliato tardi perché la sveglia non ha suonato.

Sono uscito di corsa. «Non correre!» mi ha gridato mia madre. «Fai colazione!» Ma non avevo tempo.

Alla stazione ho scoperto che avevo dimenticato il portafoglio. Sono tornato a casa, l'ho preso, e ho perso il treno.

Quando finalmente sono arrivato in ufficio, il mio capo mi ha guardato e ha detto solo: «Stai tranquillo, capita a tutti».`,
    glossary: {
      storta: 'crooked (giornata storta = a bad day)',
      sveglia: 'alarm clock',
      suonato: 'rung',
      uscito: 'gone out',
      corsa: 'run (di corsa = in a rush)',
      correre: 'to run',
      gridato: 'shouted',
      scoperto: 'discovered',
      dimenticato: 'forgotten',
      portafoglio: 'wallet',
      perso: 'missed, lost',
      finalmente: 'finally',
      capo: 'boss',
      guardato: 'looked at',
      tranquillo: 'calm',
      capita: 'it happens',
      tutti: 'everyone',
    },
  },
  {
    slug: 'se-avessi-piu-tempo',
    title: 'Se avessi più tempo',
    emoji: '🌠',
    minWeek: 21,
    blurb: 'Daydreaming in the conditional and the subjunctive.',
    text: `Se avessi più tempo libero, farei molte cose diverse.

Imparerei a suonare il pianoforte. Viaggerei in tutta l'Italia, non solo nelle grandi città. Andrei nei paesi piccoli, dove la gente parla ancora il dialetto.

Se fossi più coraggioso, lascerei il mio lavoro e aprirei un piccolo ristorante. Penso che sarebbe difficile, ma credo che ne varrebbe la pena.

Comunque, magari un giorno. Intanto studio l'italiano — è già un buon inizio.`,
    glossary: {
      avessi: 'I had (subjunctive)',
      farei: 'I would do',
      imparerei: 'I would learn',
      suonare: 'to play (an instrument)',
      pianoforte: 'piano',
      viaggerei: 'I would travel',
      tutta: 'all',
      solo: 'only',
      paesi: 'villages, towns',
      dialetto: 'dialect',
      fossi: 'I were (subjunctive)',
      coraggioso: 'brave',
      lascerei: 'I would leave',
      aprirei: 'I would open',
      varrebbe: 'it would be worth',
      pena: 'trouble (valere la pena = to be worth it)',
      magari: 'maybe',
      intanto: 'in the meantime',
      inizio: 'start',
    },
  },
  {
    slug: 'la-lettera-di-nonna',
    title: 'La lettera di nonna',
    emoji: '📜',
    minWeek: 23,
    blurb: 'A grandmother writes — the whole course, in one letter.',
    text: `Caro nipote,

come stai? Spero che tu stia bene e che il lavoro vada come vuoi.

Qui tutto tranquillo. Il tempo è cambiato, fa più freddo, però il giardino è ancora bello. Ieri ho raccolto gli ultimi pomodori.

Mi ha telefonato tua sorella. Mi ha detto che verrà a trovarmi a Natale. Sarebbe bello se venissi anche tu. Non ci vediamo da troppo tempo.

Comunque, non ti preoccupare se sei occupato. Capisco benissimo. Ma sappi che qui c'è sempre un piatto per te.

Ti abbraccio forte,
Nonna`,
    glossary: {
      nipote: 'grandson, nephew',
      stia: 'you are (subjunctive)',
      vada: 'it goes (subjunctive)',
      cambiato: 'changed',
      giardino: 'garden',
      raccolto: 'picked, harvested',
      ultimi: 'last',
      pomodori: 'tomatoes',
      telefonato: 'phoned',
      trovarmi: 'to visit me',
      natale: 'Christmas',
      venissi: 'you came (subjunctive)',
      troppo: 'too',
      occupato: 'busy',
      sappi: 'know (imperative)',
      piatto: 'plate, dish',
      abbraccio: 'I hug',
      forte: 'strongly, tightly',
    },
  },
];
