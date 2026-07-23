/**
 * Extensive-reading module (LingQ-style) — short passages the learner reads
 * for comprehension, tapping any word for an instant gloss instead of a
 * full translation. Words that map to the app's tracked vocabulary feed
 * straight into the same word-strength/FSRS pipeline as everywhere else
 * (see reconcileReadingProgress): tapped for help = review it sooner; read
 * straight through without ever tapping = a real recognition win.
 */
import { getAllVocab } from './curriculum';
import { recordWordResult } from './progress';

export interface ReadingPassage {
  slug: string;
  title: string;
  emoji: string;
  /** Course week required to unlock — the same ceiling concept the tutor uses. */
  minWeek: number;
  /** One-sentence trailer shown on the picker card. */
  blurb: string;
  /** Spanish text. Paragraphs separated by a blank line. */
  text: string;
  /** Extra glosses for words not in the tracked curriculum vocab (connectors, names, etc). */
  glossary?: Record<string, string>;
}

export const READINGS: ReadingPassage[] = [
  {
    slug: 'mi-familia',
    title: 'Mi familia',
    emoji: '👨‍👩‍👧',
    minWeek: 1,
    blurb: 'Meet a small family, in the simplest Spanish there is.',
    text: `¡Hola! Me llamo Ana. Soy de España. Tengo una familia pequeña.

Mi padre se llama Carlos. Mi madre se llama Elena. Tengo un hermano. Se llama Pablo.

Vivimos en una casa en Madrid. La casa es pequeña pero bonita. Me gusta mucho mi familia.`,
    glossary: {
      'me': 'me / myself',
      'llamo': 'I call (me llamo = "I am called")',
      'llama': 'is called',
      'soy': 'I am',
      'de': 'from',
      'tengo': 'I have',
      'una': 'a (feminine)',
      'un': 'a (masculine)',
      'se': '(reflexive marker)',
      'vivimos': 'we live',
      'en': 'in',
      'pero': 'but',
      'es': 'is',
      'mi': 'my',
    },
  },
  {
    slug: 'en-la-cocina',
    title: 'En la cocina',
    emoji: '🍳',
    minWeek: 2,
    blurb: 'A tiny scene in the kitchen — simple nouns, simple sentences.',
    text: `Mi casa tiene una cocina pequeña. En la cocina hay una mesa y cuatro sillas.

Por la mañana, mi madre prepara el desayuno. Hay pan, café y fruta en la mesa. Mi padre bebe café. Yo bebo leche.

Me gusta la cocina de mi casa. Es pequeña, pero muy bonita.`,
    glossary: {
      'tiene': 'has',
      'una': 'a (feminine)',
      'en': 'in',
      'hay': 'there is/are',
      'y': 'and',
      'cuatro': 'four',
      'sillas': 'chairs',
      'por': 'in / through',
      'mañana': 'morning',
      'mi': 'my',
      'prepara': 'prepares',
      'el': 'the',
      'yo': 'I',
      'me': 'me / myself',
      'gusta': 'is pleasing (me gusta = "I like")',
      'de': 'of',
      'es': 'is',
      'pero': 'but',
      'muy': 'very',
    },
  },
  {
    slug: 'un-dia-normal',
    title: 'Un día normal',
    emoji: '☀️',
    minWeek: 5,
    blurb: 'A completely ordinary day — verbs in action.',
    text: `Todos los días me levanto a las siete. Primero, tomo un café. Después, como el desayuno con mi familia.

Trabajo en una oficina cerca de mi casa. Empiezo a las nueve y termino a las cinco. Como con mis compañeros a las dos.

Por la noche, ceno en casa y hablo con mi hermano. A veces vemos la televisión juntos. Me acuesto a las once.`,
    glossary: {
      'todos': 'every / all',
      'los': 'the (plural)',
      'me': 'myself',
      'a': 'at / to',
      'las': 'the (plural, feminine) / o\'clock',
      'primero': 'first',
      'después': 'afterward',
      'con': 'with',
      'cerca': 'near',
      'nueve': 'nine',
      'cinco': 'five',
      'mis': 'my (plural)',
      'dos': 'two',
      'por': 'in / through',
      'noche': 'night',
      'a veces': 'sometimes',
      'vemos': 'we watch',
      'juntos': 'together',
      'once': 'eleven',
    },
  },
  {
    slug: 'mi-rutina-diaria',
    title: 'Mi rutina diaria',
    emoji: '🧴',
    minWeek: 6,
    blurb: 'A regular day, described with the verbs you now actually own.',
    text: `Yo soy estudiante y también trabajo. Vivo en un apartamento pequeño con mi hermana. Ella es enfermera y trabaja en un hospital.

Cada mañana, me levanto temprano. Estudio español una hora antes del trabajo. Después, tomo el autobús. El autobús está cerca de mi casa.

Mi trabajo está en el centro. Trabajo con personas muy simpáticas. A las dos, como con mis compañeros. Hablamos de todo — de fútbol, de familia, de planes para el fin de semana.

Por la tarde, estoy cansado, pero contento. Vuelvo a casa, ceno con mi hermana y leemos un poco antes de dormir. Es una vida simple, pero me gusta mucho.`,
    glossary: {
      'soy': 'I am',
      'también': 'also',
      'vivo': 'I live',
      'un': 'a (masculine)',
      'con': 'with',
      'ella': 'she',
      'es': 'is',
      'cada': 'every',
      'me': 'myself',
      'levanto': 'I get up',
      'temprano': 'early',
      'una': 'a / one (feminine)',
      'antes': 'before',
      'del': 'of the',
      'después': 'afterward',
      'tomo': 'I take',
      'el': 'the',
      'está': 'is (location/state)',
      'cerca': 'near',
      'de': 'of / from',
      'mi': 'my',
      'las': 'the (plural, feminine) / o\'clock',
      'mis': 'my (plural)',
      'todo': 'everything',
      'para': 'for',
      'fin de semana': 'weekend',
      'pero': 'but',
      'contento': 'content / happy',
      'vuelvo': 'I return',
      'un poco': 'a little',
      'vida': 'life',
    },
  },
  {
    slug: 'donde-esta-la-estacion',
    title: '¿Dónde está la estación?',
    emoji: '🧭',
    minWeek: 8,
    blurb: 'A lost tourist, a helpful local, and a lot of directions.',
    text: `Un turista busca la estación de tren. No sabe dónde está, así que pregunta a una mujer en la calle.

—Perdón, señora. ¿Dónde está la estación de tren, por favor?

—Está lejos de aquí —responde ella—. Sigue todo recto por esta calle, después gira a la izquierda en el banco. La estación está a la derecha, cerca del mercado.

—Muchas gracias. ¿Está cerca del centro?

—Sí, está muy cerca. A pie, son quince minutos, más o menos.

El turista camina por la calle. Ve el banco, gira a la izquierda y encuentra la estación sin problema. Llega justo a tiempo para su tren.`,
    glossary: {
      'un': 'a (masculine)',
      'busca': 'looks for',
      'de': 'of / from',
      'no': 'not / no',
      'sabe': 'knows',
      'dónde': 'where',
      'así que': 'so',
      'pregunta': 'asks',
      'una': 'a (feminine)',
      'mujer': 'woman',
      'en': 'in / on',
      'calle': 'street',
      'está': 'is (location/state)',
      'ella': 'she',
      'esta': 'this (feminine)',
      'gira': 'turn(s)',
      'a la izquierda': 'to the left',
      'a la derecha': 'to the right',
      'del': 'of the',
      'centro': 'centre',
      'sí': 'yes',
      'muy': 'very',
      'a pie': 'on foot',
      'son': 'are',
      'quince': 'fifteen',
      'minutos': 'minutes',
      'más o menos': 'more or less',
      've': 'sees',
      'encuentra': 'finds',
      'sin': 'without',
      'llega': 'arrives',
      'justo a tiempo': 'just in time',
      'su': 'his/her',
    },
  },
  {
    slug: 'el-fin-de-semana-pasado',
    title: 'El fin de semana pasado',
    emoji: '🌅',
    minWeek: 9,
    blurb: 'What actually happened last weekend — told in the past.',
    text: `El sábado pasado fue un día especial. Me desperté tarde, a las diez. No trabajé.

Por la mañana, fui al mercado con mi madre. Compramos fruta y pan. Después, comimos juntos en un restaurante pequeño cerca del centro.

Por la tarde, mis amigos vinieron a mi casa. Hablamos, jugamos juegos y escuchamos música. Fue una tarde muy divertida.

El domingo, descansé todo el día. Leí un libro y dormí una siesta. Fue un fin de semana perfecto.`,
    glossary: {
      'el': 'the',
      'pasado': 'past / last',
      'fue': 'was / went (from ser/ir)',
      'tarde': 'late / afternoon',
      'no': 'not / no',
      'mañana': 'morning / tomorrow',
      'al': 'to the',
      'del': 'of the',
      'centro': 'downtown / center',
      'vinieron': 'came',
      'jugamos': 'we played',
      'escuchamos': 'we listened',
      'muy': 'very',
      'divertida': 'fun',
      'todo': 'all / the whole',
      'leí': 'I read',
      'dormí': 'I slept',
      'perfecto': 'perfect',
    },
  },
  {
    slug: 'ayer-en-el-trabajo',
    title: 'Ayer en el trabajo',
    emoji: '💼',
    minWeek: 10,
    blurb: 'A busy day at work, told with preterite and irregular verbs.',
    text: `Ayer fue un día muy ocupado. Me desperté tarde porque no oí el despertador, así que llegué al trabajo con veinte minutos de retraso.

Mi jefa no dijo nada, pero yo me sentí un poco nervioso. Tuve tres reuniones antes del mediodía y escribí muchos correos electrónicos.

A la una, comí rápido en mi escritorio — no tuve tiempo para salir. Por la tarde, un compañero vino a pedirme ayuda con un proyecto difícil. Trabajamos juntos hasta las seis.

Cuando por fin salí de la oficina, estaba muy cansado. Fui a casa, cené algo ligero y me acosté temprano. Hoy espero un día más tranquilo.`,
    glossary: {
      'ayer': 'yesterday',
      'fue': 'was / went',
      'un': 'a (masculine)',
      'me': 'myself / to me',
      'desperté': 'woke up',
      'porque': 'because',
      'no': 'not',
      'oí': 'I heard',
      'así que': 'so',
      'llegué': 'I arrived',
      'al': 'to the',
      'con': 'with',
      'de': 'of',
      'retraso': 'delay',
      'jefa': 'boss (female)',
      'dijo': 'said',
      'nada': 'nothing',
      'pero': 'but',
      'yo': 'I',
      'sentí': 'I felt',
      'un poco': 'a little',
      'tuve': 'I had',
      'reuniones': 'meetings',
      'antes': 'before',
      'del': 'of the',
      'mediodía': 'midday',
      'escribí': 'I wrote',
      'muchos': 'many',
      'correos electrónicos': 'emails',
      'a la una': 'at one o\'clock',
      'comí': 'I ate',
      'rápido': 'quickly',
      'escritorio': 'desk',
      'tiempo': 'time',
      'para': 'to / in order to',
      'salir': 'to go out',
      'compañero': 'colleague',
      'vino': 'came',
      'pedirme': 'to ask me',
      'ayuda': 'help',
      'proyecto': 'project',
      'difícil': 'difficult',
      'hasta': 'until',
      'seis': 'six',
      'cuando': 'when',
      'por fin': 'finally',
      'salí': 'I left',
      'oficina': 'office',
      'estaba': 'I was (imperfect)',
      'fui': 'I went',
      'cené': 'I had dinner',
      'algo': 'something',
      'ligero': 'light',
      'acosté': 'went to bed',
      'temprano': 'early',
      'hoy': 'today',
      'espero': 'I hope for',
      'tranquilo': 'calm',
    },
  },
  {
    slug: 'un-viaje-inolvidable',
    title: 'Un viaje inolvidable',
    emoji: '🧳',
    minWeek: 12,
    blurb: 'A holiday story from start to finish — first, then, finally.',
    text: `El verano pasado, mi familia y yo hicimos un viaje a Sevilla. Primero, tomamos un tren muy temprano por la mañana. El viaje duró tres horas, así que dormí un poco durante el camino.

Cuando llegamos, hacía muchísimo calor. Fuimos directamente al hotel para dejar las maletas, y después salimos a explorar la ciudad. Vimos la catedral, caminamos por el barrio de Triana y comimos tapas en un bar pequeño cerca del río.

Por la tarde, mis padres querían descansar, pero mi hermana y yo decidimos seguir explorando. Encontramos una plaza preciosa con música en vivo, y bailamos un poco, aunque no sabíamos bailar flamenco muy bien.

Al día siguiente, visitamos el Real Alcázar. Fue impresionante — nunca había visto un palacio tan bonito. Luego, antes de volver a casa, compramos algunos regalos para nuestros amigos.

Al final, fue un viaje corto pero inolvidable. Espero que podamos volver a Sevilla algún día, quizás en otra época del año, cuando haga menos calor.`,
    glossary: {
      'verano': 'summer',
      'pasado': 'last/past',
      'hicimos': 'we made/did',
      'un': 'a (masculine)',
      'viaje': 'trip',
      'primero': 'first',
      'tomamos': 'we took',
      'temprano': 'early',
      'duró': 'lasted',
      'así que': 'so',
      'dormí': 'I slept',
      'durante': 'during',
      'camino': 'journey/way',
      'cuando': 'when',
      'llegamos': 'we arrived',
      'hacía': 'it was (weather)',
      'muchísimo': 'a great deal of',
      'calor': 'heat',
      'fuimos': 'we went',
      'directamente': 'directly',
      'para': 'to / in order to',
      'dejar': 'to leave/drop off',
      'maletas': 'suitcases',
      'después': 'afterward',
      'salimos': 'we went out',
      'explorar': 'to explore',
      'vimos': 'we saw',
      'catedral': 'cathedral',
      'caminamos': 'we walked',
      'barrio': 'neighbourhood',
      'comimos': 'we ate',
      'cerca': 'near',
      'río': 'river',
      'mis': 'my (plural)',
      'querían': 'wanted (imperfect)',
      'descansar': 'to rest',
      'pero': 'but',
      'decidimos': 'we decided',
      'seguir': 'to keep on',
      'encontramos': 'we found',
      'plaza': 'square',
      'preciosa': 'beautiful',
      'en vivo': 'live',
      'bailamos': 'we danced',
      'aunque': 'even though',
      'sabíamos': 'we knew how to',
      'al día siguiente': 'the next day',
      'visitamos': 'we visited',
      'fue': 'was / went',
      'impresionante': 'impressive',
      'nunca': 'never',
      'había visto': 'had seen',
      'palacio': 'palace',
      'tan': 'so',
      'luego': 'then',
      'antes': 'before',
      'volver': 'to return',
      'compramos': 'we bought',
      'algunos': 'some',
      'regalos': 'gifts',
      'nuestros': 'our',
      'al final': 'in the end',
      'corto': 'short',
      'inolvidable': 'unforgettable',
      'espero': 'I hope',
      'podamos': 'we can (subjunctive)',
      'algún día': 'someday',
      'quizás': 'perhaps',
      'otra': 'another',
      'época': 'time of year / season',
      'año': 'year',
      'haga': 'it is (weather, subjunctive)',
      'menos': 'less',
    },
  },
  {
    slug: 'en-el-mercado',
    title: 'En el mercado',
    emoji: '🍎',
    minWeek: 13,
    blurb: 'Opinions, prices, and a little haggling at the market.',
    text: `A mí me encanta ir al mercado los sábados. Hay tanta gente, tantos colores y tantos olores.

—Buenos días, señora. ¿Cuánto cuestan estas manzanas? —pregunté.

—Dos euros el kilo. Son muy dulces —respondió la vendedora.

Me pareció un poco caro, pero las manzanas parecían frescas, así que compré un kilo. También compré tomates, porque me encanta hacer ensalada los domingos.

Al final, gasté más de lo que pensaba, pero no me importó. Creo que la comida fresca vale la pena, aunque cueste un poco más que en el supermercado.`,
    glossary: {
      'a mí': 'to me (emphasis)',
      'encanta': 'delights (me encanta = "I love")',
      'ir': 'to go',
      'hay': 'there is/are',
      'tanta': 'so much',
      'tantos': 'so many',
      'gente': 'people',
      'olores': 'smells',
      'cuánto': 'how much',
      'cuestan': 'do (they) cost',
      'estas': 'these',
      'pregunté': 'I asked',
      'euros': 'euros',
      'kilo': 'kilo',
      'son': 'are',
      'dulces': 'sweet',
      'respondió': 'replied',
      'vendedora': 'saleswoman',
      'pareció': 'seemed (me pareció = "it seemed to me")',
      'un poco': 'a little',
      'caro': 'expensive',
      'parecían': 'seemed',
      'frescas': 'fresh',
      'así que': 'so',
      'compré': 'I bought',
      'también': 'also',
      'porque': 'because',
      'hacer': 'to make',
      'ensalada': 'salad',
      'al final': 'in the end',
      'gasté': 'I spent',
      'más': 'more',
      'pensaba': 'I thought',
      'importó': 'mattered (no me importó = "I didn\'t mind")',
      'creo': 'I think',
      'comida': 'food',
      'vale la pena': "is worth it",
      'aunque': 'even though',
      'cueste': 'it costs (subjunctive)',
      'que': 'than / that',
    },
  },
  {
    slug: 'de-compras-en-la-tienda',
    title: 'De compras en la tienda',
    emoji: '👗',
    minWeek: 14,
    blurb: 'Shopping for clothes, in weather that keeps changing the plan.',
    text: `El sábado hacía mal tiempo — llovía mucho y hacía frío — así que decidí ir de compras al centro comercial en vez de salir al parque.

Entré en una tienda de ropa y una dependienta me preguntó si necesitaba ayuda. Le dije que buscaba un abrigo, porque el mío ya es muy viejo.

Me probé varios abrigos. El primero era demasiado grande; el segundo, demasiado caro. Al final, encontré uno perfecto: no era ni muy grande ni muy pequeño, y además estaba de rebajas.

También compré unos zapatos nuevos, porque los míos están rotos. Pagué con tarjeta y salí de la tienda muy contenta.

Cuando llegué a casa, ya hacía sol. Típico — el día que compro un abrigo, deja de llover.`,
    glossary: {
      'hacía': 'it was (weather, imperfect)',
      'mal': 'bad',
      'tiempo': 'weather / time',
      'llovía': 'it was raining',
      'frío': 'cold',
      'así que': 'so',
      'decidí': 'I decided',
      'ir de compras': 'to go shopping',
      'centro comercial': 'shopping centre',
      'en vez de': 'instead of',
      'salir': 'to go out',
      'entré': 'I went in',
      'una': 'a (feminine)',
      'ropa': 'clothes',
      'dependienta': 'shop assistant',
      'me': 'me / to me',
      'preguntó': 'asked',
      'si': 'if',
      'necesitaba': 'I needed',
      'le': 'to her',
      'dije': 'I said',
      'que': 'that',
      'buscaba': 'I was looking for',
      'porque': 'because',
      'mío': 'mine',
      'ya': 'already',
      'es': 'is',
      'probé': 'I tried on',
      'varios': 'several',
      'primero': 'first',
      'era': 'was (imperfect)',
      'demasiado': 'too',
      'segundo': 'second',
      'caro': 'expensive',
      'al final': 'in the end',
      'encontré': 'I found',
      'ni': 'neither / nor',
      'además': 'besides',
      'estaba': 'was (imperfect)',
      'de rebajas': 'on sale',
      'también': 'also',
      'unos': 'some (masculine)',
      'míos': 'mine (plural)',
      'rotos': 'broken/worn out',
      'pagué': 'I paid',
      'tarjeta': 'card',
      'salí': 'I left',
      'cuando': 'when',
      'llegué': 'I arrived',
      'sol': 'sun',
      'típico': 'typical',
      'deja de': 'stops',
    },
  },
  {
    slug: 'la-ciudad-perfecta',
    title: 'La ciudad perfecta',
    emoji: '🏙️',
    minWeek: 16,
    blurb: 'Comparing three cities, with a healthy dose of por and para.',
    text: `Mucha gente me pregunta cuál es la mejor ciudad de España para vivir. No hay una respuesta perfecta, pero puedo comparar las tres que mejor conozco.

Madrid es más grande que Valencia y tiene más trabajo, sobre todo para quienes trabajan en finanzas o tecnología. Sin embargo, la vida allí es más cara y hay más tráfico.

Valencia, para mí, es la ciudad ideal para vivir bien sin gastar tanto. Es más pequeña que Madrid, pero tiene playa, buen clima todo el año y comida excelente — sobre todo la paella.

Barcelona tiene, quizás, la mejor combinación de playa y ciudad grande, pero también es la más cara de las tres, y por eso muchos jóvenes se van a vivir a otras ciudades.

Al final, para mí la ciudad perfecta depende de lo que buscas: para trabajar, Madrid; para vivir tranquilo, Valencia; para el ambiente, Barcelona. Yo elegiría Valencia, por el clima y por la gente.`,
    glossary: {
      'mucha': 'a lot of',
      'gente': 'people',
      'me': 'me',
      'pregunta': 'asks',
      'cuál': 'which',
      'la': 'the (feminine)',
      'mejor': 'best/better',
      'de': 'of',
      'no': 'not',
      'hay': 'there is',
      'una': 'a (feminine)',
      'respuesta': 'answer',
      'pero': 'but',
      'puedo': 'I can',
      'comparar': 'to compare',
      'las': 'the (plural, feminine)',
      'tres': 'three',
      'que': 'that / which',
      'conozco': 'I know',
      'tiene': 'has',
      'trabajo': 'work',
      'sobre todo': 'especially',
      'quienes': 'those who',
      'finanzas': 'finance',
      'tecnología': 'technology',
      'sin embargo': 'however',
      'vida': 'life',
      'allí': 'there',
      'cara': 'expensive (fem.)',
      'tráfico': 'traffic',
      'gastar': 'to spend',
      'tanto': 'so much',
      'playa': 'beach',
      'clima': 'climate',
      'año': 'year',
      'comida': 'food',
      'excelente': 'excellent',
      'quizás': 'perhaps',
      'combinación': 'combination',
      'también': 'also',
      'jóvenes': 'young people',
      'se van': 'they go/move away',
      'otras': 'other',
      'al final': 'in the end',
      'lo que': 'what',
      'buscas': 'you\'re looking for',
      'tranquilo': 'calm',
      'ambiente': 'atmosphere/vibe',
      'elegiría': 'I would choose',
    },
  },
  {
    slug: 'si-tuviera-mas-tiempo',
    title: 'Si tuviera más tiempo',
    emoji: '💭',
    minWeek: 17,
    blurb: 'Daydreaming in the conditional — what she would do with more time.',
    text: `A veces pienso en lo que haría si tuviera más tiempo libre. Trabajo tantas horas que casi nunca puedo perseguir mis propios intereses.

Si tuviera más tiempo, aprendería a tocar la guitarra. Siempre me ha gustado la música, pero nunca he tenido la oportunidad de estudiarla en serio.

También viajaría más. Me encantaría conocer países que nunca he visitado, sobre todo en América del Sur. Si pudiera, pasaría un mes entero en Argentina.

Sin embargo, sé que estas son solo fantasías. Por ahora, tengo que concentrarme en mi trabajo. Quizás, algún día, las cosas cambien y pueda hacer todo lo que quiero.`,
    glossary: {
      'pienso': 'I think',
      'lo que': 'what / that which',
      'haría': 'I would do',
      'tuviera': 'I had (subjunctive)',
      'libre': 'free',
      'tantas': 'so many',
      'casi': 'almost',
      'nunca': 'never',
      'puedo': 'I can',
      'perseguir': 'to pursue',
      'propios': 'own',
      'intereses': 'interests',
      'aprendería': 'I would learn',
      'tocar': 'to play (an instrument)',
      'siempre': 'always',
      'ha gustado': 'has pleased (me ha gustado = "I have liked")',
      'he tenido': 'I have had',
      'oportunidad': 'opportunity',
      'en serio': 'seriously',
      'viajaría': 'I would travel',
      'encantaría': 'would delight (me encantaría = "I would love")',
      'conocer': 'to get to know / visit',
      'países': 'countries',
      'visitado': 'visited',
      'sobre todo': 'especially',
      'pudiera': 'I could (subjunctive)',
      'pasaría': 'I would spend (time)',
      'entero': 'entire',
      'sin embargo': 'however',
      'sé': 'I know',
      'estas': 'these',
      'solo': 'only',
      'fantasías': 'fantasies',
      'por ahora': 'for now',
      'concentrarme': 'to focus myself',
      'quizás': 'perhaps',
      'algún día': 'someday',
      'cambien': 'change (subjunctive)',
      'pueda': 'I can (subjunctive)',
      'quiero': 'I want',
    },
  },
  {
    slug: 'si-yo-pudiera-cambiar-algo',
    title: 'Si yo pudiera cambiar algo',
    emoji: '🔄',
    minWeek: 19,
    blurb: 'Hypotheticals, regrets, and one negative command to end it all.',
    text: `Si yo pudiera cambiar una cosa de mi vida, no cambiaría dónde vivo ni mi trabajo. Cambiaría cómo hablo conmigo mismo cuando cometo un error.

Cuando era más joven, si me equivocaba, me trataba muy mal — pensaba que si fuera más inteligente, no cometería tantos fallos. Ahora sé que eso no era justo.

Si tuviera que darle un consejo a mi yo del pasado, le diría: "No te preocupes tanto. No hables tan mal de ti mismo. Sé más paciente." Ojalá alguien me hubiera dicho eso antes.

Creo que, si todos fuéramos un poco más amables con nosotros mismos, seríamos más felices y, probablemente, aprenderíamos más rápido — incluso el español.`,
    glossary: {
      'si': 'if',
      'pudiera': 'I could (subjunctive)',
      'cambiar': 'to change',
      'una': 'a (feminine)',
      'cosa': 'thing',
      'no': 'not',
      'cambiaría': 'I would change',
      'dónde': 'where',
      'vivo': 'I live',
      'ni': 'nor',
      'cómo': 'how',
      'conmigo mismo': 'with myself',
      'cuando': 'when',
      'cometo': 'I make (a mistake)',
      'error': 'mistake',
      'era': 'I was (imperfect)',
      'más': 'more',
      'joven': 'young',
      'me equivocaba': 'I would get things wrong',
      'trataba': 'I treated (imperfect)',
      'mal': 'badly',
      'pensaba': 'I thought',
      'fuera': 'I were (subjunctive)',
      'inteligente': 'intelligent',
      'cometería': 'I would make',
      'tantos': 'so many',
      'fallos': 'mistakes',
      'ahora': 'now',
      'sé': 'I know',
      'eso': 'that',
      'justo': 'fair',
      'tuviera que': 'I had to (subjunctive)',
      'darle': 'to give (to someone)',
      'consejo': 'advice',
      'yo del pasado': 'past self',
      'le diría': 'I would tell him/her',
      'te preocupes': 'you worry (subjunctive)',
      'tanto': 'so much',
      'hables': 'you speak (subjunctive)',
      'ti mismo': 'yourself',
      'paciente': 'patient',
      'ojalá': 'I wish',
      'alguien': 'someone',
      'hubiera dicho': 'had said',
      'antes': 'before',
      'creo': 'I believe',
      'todos': 'everyone',
      'fuéramos': 'we were (subjunctive)',
      'un poco': 'a little',
      'amables': 'kind',
      'nosotros mismos': 'ourselves',
      'seríamos': 'we would be',
      'felices': 'happy',
      'probablemente': 'probably',
      'aprenderíamos': 'we would learn',
      'incluso': 'even',
    },
  },
  {
    slug: 'una-decision-dificil',
    title: 'Una decisión difícil',
    emoji: '⚖️',
    minWeek: 21,
    blurb: 'A real dilemma, argued both ways — fluency-level Spanish.',
    text: `Llevo tres años trabajando en la misma empresa. Es un trabajo estable, con un buen sueldo, pero últimamente no me siento satisfecha. La semana pasada me ofrecieron un puesto en otra ciudad, en una empresa más pequeña pero mucho más creativa.

Por un lado, quedarme sería lo más seguro. Conozco bien mi trabajo actual, tengo buenos compañeros y no tendría que mudarme. Por otro lado, llevo meses sintiendo que necesito un cambio. Si no aprovecho esta oportunidad ahora, es posible que no se repita.

Mis padres piensan que debería quedarme donde estoy; dicen que la estabilidad es lo más importante a mi edad. Mis amigos, en cambio, me animan a arriesgarme, argumentando que nunca me arrepentiré de intentarlo, pase lo que pase.

Al final, creo que la decisión depende de lo que valore más: la seguridad de lo conocido, o la posibilidad de crecer haciendo algo que realmente me apasione. Todavía no lo he decidido, pero sé que tengo que elegir pronto.`,
    glossary: {
      'llevo': "I've been (llevo tres años = 'I have been ... for three years')",
      'misma': 'same',
      'empresa': 'company',
      'estable': 'stable',
      'sueldo': 'salary',
      'últimamente': 'lately',
      'siento': 'I feel',
      'satisfecha': 'satisfied',
      'ofrecieron': 'offered',
      'puesto': 'position (job)',
      'otra': 'another',
      'ciudad': 'city',
      'por un lado': 'on one hand',
      'quedarme': 'staying',
      'sería': 'would be',
      'seguro': 'safe',
      'conozco': 'I know (a place/thing)',
      'actual': 'current',
      'tendría': 'I would have to',
      'mudarme': 'to move (house)',
      'por otro lado': 'on the other hand',
      'sintiendo': 'feeling',
      'necesito': 'I need',
      'cambio': 'change',
      'aprovecho': 'I take advantage of',
      'ahora': 'now',
      'repita': 'repeats (subjunctive)',
      'debería': 'I/she should',
      'donde': 'where',
      'estoy': 'I am',
      'dicen': 'they say',
      'importante': 'important',
      'edad': 'age',
      'en cambio': 'on the other hand / instead',
      'animan': 'encourage',
      'arriesgarme': 'to take a risk',
      'argumentando': 'arguing',
      'arrepentiré': 'I will regret',
      'intentarlo': 'trying it',
      'pase lo que pase': 'whatever happens',
      'depende': 'depends',
      'valore': 'I value (subjunctive)',
      'seguridad': 'security',
      'conocido': 'the known',
      'posibilidad': 'possibility',
      'crecer': 'to grow',
      'haciendo': 'doing',
      'realmente': 'really',
      'apasione': 'is passionate to me (subjunctive)',
      'todavía': 'still',
      'decidido': 'decided',
      'elegir': 'to choose',
      'pronto': 'soon',
    },
  },
  {
    slug: 'el-trabajo-de-mis-suenos',
    title: 'El trabajo de mis sueños',
    emoji: '🌟',
    minWeek: 22,
    blurb: 'A candid interview reflection — opinions, work, and a little debate.',
    text: `Ayer tuve una entrevista de trabajo para el puesto que siempre había querido. El entrevistador me hizo preguntas difíciles, sobre todo una: "¿Por qué quiere usted dejar su trabajo actual?"

Le dije la verdad: en mi opinión, un buen trabajo no es solo cuestión de dinero, sino de sentirse útil y de seguir aprendiendo. Llevo cinco años haciendo lo mismo, y aunque tengo experiencia y un buen sueldo, ya no me apasiona.

El entrevistador estuvo de acuerdo conmigo hasta cierto punto, pero también me dijo que la estabilidad importa, sobre todo si tienes familia. Yo respondí que, para mí, arriesgarse un poco vale la pena — al final, se pasa más tiempo trabajando que haciendo casi cualquier otra cosa, así que más vale que ese trabajo signifique algo.

No sé todavía si conseguiré el puesto, pero salí de la entrevista sintiéndome, por primera vez en mucho tiempo, genuinamente emocionada por mi futuro profesional.`,
    glossary: {
      'ayer': 'yesterday',
      'tuve': 'I had',
      'una': 'a (feminine)',
      'entrevista': 'interview',
      'para': 'for',
      'puesto': 'position/job',
      'siempre': 'always',
      'había querido': 'had wanted',
      'entrevistador': 'interviewer',
      'me': 'to me',
      'hizo': 'made/asked',
      'preguntas': 'questions',
      'difíciles': 'difficult',
      'sobre todo': 'especially',
      'por qué': 'why',
      'quiere': 'want (formal you)',
      'usted': 'you (formal)',
      'dejar': 'to leave',
      'su': 'your (formal)',
      'actual': 'current',
      'le': 'to him',
      'dije': 'I said',
      'verdad': 'truth',
      'opinión': 'opinion',
      'solo': 'only',
      'cuestión': 'matter',
      'dinero': 'money',
      'sino': 'but rather',
      'sentirse': 'to feel oneself',
      'útil': 'useful',
      'seguir': 'to keep',
      'aprendiendo': 'learning',
      'llevo': "I've been (for a duration)",
      'cinco': 'five',
      'años': 'years',
      'haciendo': 'doing',
      'lo mismo': 'the same thing',
      'aunque': 'even though',
      'experiencia': 'experience',
      'sueldo': 'salary',
      'ya no': 'no longer',
      'apasiona': 'excites (me apasiona = "I\'m passionate about")',
      'estuvo de acuerdo': 'agreed',
      'conmigo': 'with me',
      'hasta cierto punto': 'up to a point',
      'pero': 'but',
      'también': 'also',
      'importa': 'matters',
      'si': 'if',
      'tienes': 'you have',
      'yo': 'I',
      'respondí': 'I replied',
      'arriesgarse': 'to take a risk',
      'un poco': 'a little',
      'vale la pena': 'is worth it',
      'al final': 'in the end',
      'se pasa': 'one spends',
      'más': 'more',
      'que': 'than',
      'casi': 'almost',
      'cualquier': 'any',
      'otra': 'other',
      'cosa': 'thing',
      'así que': 'so',
      'más vale que': 'it\'s better that',
      'signifique': 'means (subjunctive)',
      'algo': 'something',
      'no sé': 'I don\'t know',
      'todavía': 'yet / still',
      'conseguiré': 'I will get',
      'salí': 'I left',
      'sintiéndome': 'feeling (myself)',
      'por primera vez': 'for the first time',
      'mucho tiempo': 'a long time',
      'genuinamente': 'genuinely',
      'emocionada': 'excited',
      'futuro': 'future',
      'profesional': 'professional',
    },
  },
  {
    slug: 'lo-que-he-aprendido',
    title: 'Lo que he aprendido',
    emoji: '🎓',
    minWeek: 24,
    blurb: 'A reflective capstone piece — six months of Spanish, looking back.',
    text: `Hace seis meses, no sabía decir casi nada en español, más allá de "hola" y "gracias". Ahora, mirando atrás, me sorprende todo lo que he aprendido.

Al principio, todo me parecía imposible: los verbos, los géneros, esos dos verbos "ser" y "estar" que en inglés son solo uno. Sin embargo, poco a poco, cada lección fue construyendo sobre la anterior, y lo que antes parecía un muro se convirtió en un camino.

Lo que más me ha ayudado no ha sido memorizar reglas, sino practicar de verdad — hablar, escuchar, equivocarme y corregirme una y otra vez. Es decir, la constancia importó mucho más que la perfección.

Todavía cometo errores, sobre todo con el subjuntivo, y a veces se me olvida una palabra en medio de una frase. Pero, en general, ya puedo mantener una conversación real, contar una historia del pasado, hablar de mis planes y hasta debatir un poco.

Si pudiera darle un consejo a la persona que empezó este curso hace seis meses, le diría: no tengas miedo de cometer errores — son, sin duda, el camino más rápido hacia la fluidez. Y ahora, ojalá siga aprendiendo durante muchos años más, porque un idioma nunca se termina de aprender del todo.`,
    glossary: {
      'hace seis meses': 'six months ago',
      'no sabía': 'I didn\'t know',
      'decir': 'to say',
      'casi': 'almost',
      'nada': 'nothing',
      'más allá de': 'beyond',
      'ahora': 'now',
      'mirando atrás': 'looking back',
      'me sorprende': 'it surprises me',
      'todo': 'everything',
      'lo que': 'what',
      'al principio': 'at the beginning',
      'parecía': 'seemed',
      'imposible': 'impossible',
      'géneros': 'genders',
      'esos': 'those',
      'en inglés': 'in English',
      'son': 'are',
      'solo': 'only',
      'sin embargo': 'however',
      'poco a poco': 'little by little',
      'cada': 'each',
      'fue construyendo': 'was building',
      'sobre': 'on top of',
      'anterior': 'the previous one',
      'antes': 'before',
      'muro': 'wall',
      'se convirtió': 'turned into',
      'camino': 'path',
      'más': 'more',
      'ha ayudado': 'has helped',
      'no ha sido': 'has not been',
      'memorizar': 'to memorise',
      'reglas': 'rules',
      'sino': 'but rather',
      'practicar': 'to practise',
      'de verdad': 'for real',
      'equivocarme': 'to get things wrong',
      'corregirme': 'to correct myself',
      'una y otra vez': 'again and again',
      'es decir': 'that is to say',
      'constancia': 'consistency',
      'importó': 'mattered',
      'que': 'than / that',
      'perfección': 'perfection',
      'todavía': 'still',
      'cometo': 'I make (mistakes)',
      'errores': 'mistakes',
      'sobre todo': 'especially',
      'a veces': 'sometimes',
      'se me olvida': 'I forget',
      'palabra': 'word',
      'en medio de': 'in the middle of',
      'frase': 'sentence',
      'pero': 'but',
      'en general': 'in general',
      'ya': 'already',
      'puedo': 'I can',
      'mantener': 'to hold/keep',
      'conversación': 'conversation',
      'real': 'real',
      'contar': 'to tell',
      'historia': 'story',
      'pasado': 'the past',
      'hasta': 'even',
      'debatir': 'to debate',
      'si': 'if',
      'pudiera': 'I could (subjunctive)',
      'darle': 'to give (to someone)',
      'consejo': 'advice',
      'persona': 'person',
      'empezó': 'started',
      'curso': 'course',
      'le diría': 'I would tell them',
      'no tengas miedo': 'don\'t be afraid (negative command)',
      'sin duda': 'without a doubt',
      'hacia': 'towards',
      'fluidez': 'fluency',
      'ojalá': 'I hope',
      'siga': 'I keep on (subjunctive)',
      'durante': 'for/during',
      'muchos': 'many',
      'idioma': 'language',
      'nunca': 'never',
      'se termina': 'finishes',
      'de aprender': 'of learning',
      'del todo': 'completely',
    },
  },
];

export function getReading(slug: string): ReadingPassage | undefined {
  return READINGS.find((r) => r.slug === slug);
}

export function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[¿¡"'«(\[—-]+/, '')
    .replace(/["'»).,;:!?\]—-]+$/, '');
}

// Single-word vocab -> {id, en}, built once. Most tracked nouns are stored
// WITH their article ("la familia", "el hermano") since that's how they're
// taught — strip a leading article so the bare noun (as it actually appears
// mid-sentence in a reading passage) still resolves. Genuinely multi-word
// phrases beyond that ("por favor") still aren't reachable by per-token
// lookup — a passage's own glossary covers those explicitly where needed.
const ARTICLE_PREFIX = /^(el|la|los|las|un|una)\s+/i;
const vocabByToken = new Map<string, { id: string; en: string }>();
for (const v of getAllVocab()) {
  const bare = v.es.replace(ARTICLE_PREFIX, '');
  if (!bare.includes(' ')) {
    vocabByToken.set(bare.toLowerCase(), { id: v.id, en: v.en });
  }
}

export interface WordLookup {
  en: string;
  /** Set only if this word is tracked in the app's vocab/FSRS model. */
  vocabId?: string;
}

export function lookupWord(rawToken: string, passage: ReadingPassage): WordLookup | null {
  const key = normalizeToken(rawToken);
  if (!key) return null;
  const tracked = vocabByToken.get(key);
  if (tracked) return { en: tracked.en, vocabId: tracked.id };
  const extra = passage.glossary?.[key];
  if (extra) return { en: extra };
  return null;
}

export interface ReadingResult {
  /** Unique tracked words read straight through without ever tapping. */
  recognized: number;
  /** Unique tracked words tapped for help — scheduled for review sooner. */
  reviewed: number;
}

/**
 * Called once, when the learner finishes a passage. `tappedVocabIds` is
 * every unique tracked word they tapped at least once (they needed help) —
 * scheduled for review sooner, same as getting a lesson question wrong.
 * Every other tracked word that appeared in the passage but was NEVER
 * tapped is a real recognition win, reinforced the same way a correct
 * lesson answer would be. Untracked (glossary-only) words don't touch FSRS
 * at all — they're supplementary reading vocabulary, not part of the core
 * tracked list.
 */
export function reconcileReadingProgress(
  passage: ReadingPassage,
  tappedVocabIds: Set<string>
): ReadingResult {
  const seen = new Set<string>();
  let recognized = 0;
  let reviewed = 0;
  for (const raw of passage.text.split(/\s+/)) {
    const key = normalizeToken(raw);
    if (!key || seen.has(key)) continue;
    const tracked = vocabByToken.get(key);
    if (!tracked) continue;
    seen.add(key);
    const knewIt = !tappedVocabIds.has(tracked.id);
    // Not tapping for a translation is a self-report of already knowing the
    // word, not a production/recall test — recognition-tier, same as MCQ.
    recordWordResult(tracked.id, knewIt, true, 'recognition');
    if (knewIt) recognized += 1;
    else reviewed += 1;
  }
  return { recognized, reviewed };
}
