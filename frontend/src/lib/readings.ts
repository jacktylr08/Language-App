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
import { getActiveLanguageId } from './languages';
import { READINGS_IT } from './readings-it';

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

export const READINGS: ReadingPassage[
] = [
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
    slug: 'buenos-dias-vecina',
    title: 'Buenos días, vecina',
    emoji: '👋',
    minWeek: 1,
    blurb: 'Two neighbours meet on the stairs. Ten words, one whole conversation.',
    text: `Buenos días. ¿Cómo estás?

Muy bien, gracias. ¿Y tú?

Bien también. Me llamo Rosa. Soy tu vecina.

Mucho gusto, Rosa. Yo soy Sam.

Encantada, Sam. Hasta luego.

Adiós. Buenas noches.`,
    glossary: {
      'buenos': 'good (plural)',
      'días': 'days',
      'cómo': 'how',
      'estás': 'you are',
      'muy': 'very',
      'bien': 'well',
      'gracias': 'thank you',
      'y': 'and',
      'tú': 'you',
      'también': 'too / also',
      'me': 'me',
      'llamo': 'I call',
      'soy': 'I am',
      'tu': 'your',
      'vecina': 'neighbour (f)',
      'mucho': 'much',
      'gusto': 'pleasure',
      'yo': 'I',
      'encantada': 'delighted (f)',
      'hasta': 'until',
      'luego': 'later',
      'adiós': 'goodbye',
      'noches': 'nights',
    },
  },
  {
    slug: 'soy-estudiante',
    title: 'Soy estudiante',
    emoji: '🎓',
    minWeek: 1,
    blurb: 'Someone introduces himself. Everything you need to do the same.',
    text: `Hola. Me llamo Diego. Soy de México.

Soy estudiante. Mi amigo Luis es doctor. Él es de Madrid.

Ella se llama Marta. Es mi amiga. Es estudiante también.

Nosotros somos estudiantes. ¿Y tú? ¿De dónde eres?`,
    glossary: {
      'hola': 'hello',
      'de': 'from',
      'estudiante': 'student',
      'mi': 'my',
      'amigo': 'friend (m)',
      'amiga': 'friend (f)',
      'es': 'is',
      'doctor': 'doctor',
      'él': 'he',
      'ella': 'she',
      'se': '(reflexive marker)',
      'nosotros': 'we',
      'somos': 'we are',
      'dónde': 'where',
      'eres': 'you are',
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
    slug: 'la-mesa-del-desayuno',
    title: 'La mesa del desayuno',
    emoji: '🥐',
    minWeek: 2,
    blurb: 'Breakfast, named one item at a time.',
    text: `Hay pan en la mesa. Hay café y leche.

Mi madre come pan. Mi padre bebe café. Yo bebo leche.

Hay fruta también. La fruta es buena.

¿Dónde está el agua? El agua está en la cocina.`,
    glossary: {
      'hay': 'there is / there are',
      'pan': 'bread',
      'en': 'in / on',
      'la': 'the (f)',
      'mesa': 'table',
      'café': 'coffee',
      'leche': 'milk',
      'madre': 'mother',
      'come': 'eats',
      'padre': 'father',
      'bebe': 'drinks',
      'bebo': 'I drink',
      'fruta': 'fruit',
      'buena': 'good (f)',
      'está': 'is (located)',
      'el': 'the (m)',
      'agua': 'water',
      'cocina': 'kitchen',
    },
  },
  {
    slug: 'mi-hermana-y-yo',
    title: 'Mi hermana y yo',
    emoji: '👯',
    minWeek: 2,
    blurb: 'A sister, an age, a city — the first things you ever say about people.',
    text: `Tengo una hermana. Se llama Clara. Tiene veinte años.

Clara vive en Barcelona. Yo vivo en Sevilla. Ella trabaja y yo estudio.

Mi abuela vive con Clara. Tiene ochenta años. Es muy buena.

Cada día hablo con mi hermana. Quiero ver a mi familia.`,
    glossary: {
      'tengo': 'I have',
      'una': 'a (f)',
      'hermana': 'sister',
      'llama': 'is called',
      'tiene': 'has / is (age)',
      'veinte': 'twenty',
      'años': 'years',
      'vive': 'lives',
      'vivo': 'I live',
      'trabaja': 'works',
      'estudio': 'I study',
      'abuela': 'grandmother',
      'con': 'with',
      'ochenta': 'eighty',
      'cada': 'each / every',
      'día': 'day',
      'hablo': 'I speak',
      'quiero': 'I want',
      'ver': 'to see',
      'familia': 'family',
    },
  },
  {
    slug: 'una-casa-pequena',
    title: 'Una casa pequeña',
    emoji: '🏠',
    minWeek: 3,
    blurb: 'A small flat described room by room — colours, sizes, the lot.',
    text: `Vivo en una casa pequeña. No es nueva, es vieja, pero es bonita.

La cocina es grande. La mesa es roja. Hay dos sillas azules.

Mi cuarto es pequeño. La cama es nueva. El agua del baño está muy fría.

Me gusta mi casa. Es vieja pero es buena.`,
    glossary: {
      'vivo': 'I live',
      'casa': 'house',
      'pequeña': 'small (f)',
      'nueva': 'new (f)',
      'vieja': 'old (f)',
      'pero': 'but',
      'bonita': 'pretty',
      'grande': 'big',
      'roja': 'red (f)',
      'dos': 'two',
      'sillas': 'chairs',
      'azules': 'blue (pl)',
      'cuarto': 'room',
      'cama': 'bed',
      'baño': 'bathroom',
      'fría': 'cold (f)',
      'me gusta': 'I like',
    },
  },
  {
    slug: 'el-mercado-de-colores',
    title: 'El mercado de colores',
    emoji: '🍎',
    minWeek: 3,
    blurb: 'A market stall, described entirely in colours and sizes.',
    text: `En el mercado hay mucha fruta. Las manzanas son rojas. Las manzanas grandes son buenas.

Hay pan nuevo. El pan está caliente.

El café es bueno aquí. No es malo, es muy bueno.

La señora es vieja pero muy simpática. Su tienda es pequeña y bonita.`,
    glossary: {
      'mercado': 'market',
      'mucha': 'a lot of (f)',
      'las': 'the (f pl)',
      'manzanas': 'apples',
      'son': 'are',
      'rojas': 'red (f pl)',
      'grandes': 'big (pl)',
      'buenas': 'good (f pl)',
      'nuevo': 'new (m)',
      'caliente': 'hot',
      'bueno': 'good (m)',
      'aquí': 'here',
      'malo': 'bad',
      'señora': 'lady',
      'simpática': 'nice (f)',
      'su': 'her / his',
      'tienda': 'shop',
    },
  },
  {
    slug: 'un-sabado-tranquilo',
    title: 'Un sábado tranquilo',
    emoji: '🛋️',
    minWeek: 4,
    blurb: 'A quiet Saturday — everything you\'ve learned so far, in one place.',
    text: `Es sábado. No trabajo hoy.

Por la mañana bebo café en la cocina. Como pan con fruta. La cocina está tranquila.

Mi hermano viene a la casa. Hablamos mucho. Él tiene un coche nuevo, muy grande y azul.

Por la tarde vamos al mercado. Compramos carne y agua.

Por la noche estoy cansado, pero estoy feliz. Me gusta el sábado.`,
    glossary: {
      'sábado': 'Saturday',
      'hoy': 'today',
      'por la mañana': 'in the morning',
      'como': 'I eat',
      'tranquila': 'quiet (f)',
      'hermano': 'brother',
      'viene': 'comes',
      'hablamos': 'we talk',
      'coche': 'car',
      'tarde': 'afternoon',
      'vamos': 'we go',
      'al': 'to the',
      'compramos': 'we buy',
      'carne': 'meat',
      'noche': 'night',
      'estoy': 'I am (right now)',
      'cansado': 'tired',
      'feliz': 'happy',
    },
  },
  {
    slug: 'la-familia-de-marta',
    title: 'La familia de Marta',
    emoji: '👵',
    minWeek: 4,
    blurb: 'A slightly bigger family, and the first real paragraph you\'ll read.',
    text: `Marta tiene una familia grande. Tiene dos hermanos y una hermana.

Su padre se llama Jorge. Trabaja en un banco. Su madre se llama Pilar y es doctora.

Sus abuelos viven cerca. El abuelo tiene setenta y cinco años. La abuela cocina muy bien.

Cada domingo la familia come en la casa de los abuelos. Hay mucha comida: carne, pan, fruta. Todos hablan mucho.

Marta dice que su familia es ruidosa, pero le gusta.`,
    glossary: {
      'hermanos': 'brothers',
      'su': 'his / her',
      'banco': 'bank',
      'doctora': 'doctor (f)',
      'sus': 'his / her (pl)',
      'abuelos': 'grandparents',
      'viven': 'they live',
      'cerca': 'nearby',
      'setenta': 'seventy',
      'cinco': 'five',
      'cocina': 'cooks',
      'domingo': 'Sunday',
      'comida': 'food',
      'todos': 'everyone',
      'hablan': 'they talk',
      'dice': 'says',
      'que': 'that',
      'ruidosa': 'noisy (f)',
      'le gusta': 'she likes it',
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
    slug: 'lo-que-hago-cada-dia',
    title: 'Lo que hago cada día',
    emoji: '⏰',
    minWeek: 5,
    blurb: 'A whole day in -AR verbs, from the alarm to the sofa.',
    text: `Cada día trabajo por la mañana. Estudio español por la tarde.

Escucho música cuando trabajo. Miro la televisión por la noche, pero no mucho.

Los sábados compro la comida en el mercado. Cocino en casa. Necesito comprar pan y fruta.

Mi amiga Ana me ayuda con el español. Usamos un libro y hablamos mucho.

A veces bailamos en la cocina. Es tonto, pero me gusta.`,
    glossary: {
      'trabajo': 'I work',
      'escucho': 'I listen to',
      'música': 'music',
      'cuando': 'when',
      'miro': 'I watch',
      'televisión': 'television',
      'los sábados': 'on Saturdays',
      'compro': 'I buy',
      'cocino': 'I cook',
      'necesito': 'I need',
      'comprar': 'to buy',
      'ayuda': 'helps',
      'usamos': 'we use',
      'libro': 'book',
      'a veces': 'sometimes',
      'bailamos': 'we dance',
      'tonto': 'silly',
    },
  },
  {
    slug: 'el-cafe-de-la-esquina',
    title: 'El café de la esquina',
    emoji: '☕',
    minWeek: 5,
    blurb: 'An ordinary café, ordered from and paid for.',
    text: `Hay un café pequeño cerca de mi casa. Trabajo allí por la mañana a veces.

El camarero se llama Nacho. Siempre escucha la radio. Habla mucho con todos.

Compro un café con leche y pan. Cuesta dos euros. Pago y busco una mesa.

Miro a la gente en la calle. Estudio un poco. Escucho las conversaciones.

Necesito una hora tranquila cada día. Este café es perfecto.`,
    glossary: {
      'esquina': 'corner',
      'allí': 'there',
      'camarero': 'waiter',
      'siempre': 'always',
      'escucha': 'listens to',
      'radio': 'radio',
      'habla': 'talks',
      'cuesta': 'it costs',
      'euros': 'euros',
      'pago': 'I pay',
      'busco': 'I look for',
      'gente': 'people',
      'calle': 'street',
      'un poco': 'a little',
      'conversaciones': 'conversations',
      'hora': 'hour',
      'este': 'this',
      'perfecto': 'perfect',
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
    slug: 'leo-antes-de-dormir',
    title: 'Leo antes de dormir',
    emoji: '📚',
    minWeek: 6,
    blurb: 'Reading in bed — -ER and -IR verbs doing real work.',
    text: `Cada noche leo un poco antes de dormir. Bebo un té y abro mi libro.

Leo en español ahora. No comprendo todo, pero aprendo mucho.

Escribo las palabras nuevas en un cuaderno pequeño. Esta semana escribí veinte palabras.

Mi hermana lee libros ingleses. Dice que es más fácil. Yo corro el riesgo y leo en español.

Algunos días comprendo casi todo. Esos días estoy muy feliz.`,
    glossary: {
      'antes de': 'before',
      'dormir': 'to sleep',
      'leo': 'I read',
      'té': 'tea',
      'abro': 'I open',
      'comprendo': 'I understand',
      'todo': 'everything',
      'aprendo': 'I learn',
      'escribo': 'I write',
      'palabras': 'words',
      'cuaderno': 'notebook',
      'esta': 'this (f)',
      'semana': 'week',
      'escribí': 'I wrote',
      'lee': 'reads',
      'ingleses': 'English (pl)',
      'más': 'more',
      'fácil': 'easy',
      'corro': 'I run',
      'riesgo': 'risk',
      'algunos': 'some',
      'casi': 'almost',
      'esos': 'those',
    },
  },
  {
    slug: 'estoy-o-soy',
    title: 'Estoy o soy',
    emoji: '🎭',
    minWeek: 6,
    blurb: 'The same person described two ways — the ser/estar difference, felt rather than explained.',
    text: `Mi amigo Pedro es alto y simpático. Es de Valencia. Es profesor.

Hoy Pedro está cansado. Está enfermo, creo. Normalmente está muy feliz, pero hoy no.

Su casa es grande y bonita. Pero hoy la casa está fría — la ventana está abierta.

Pedro es una buena persona. Ahora mismo está triste, pero eso pasa.

Mañana estará bien. Él siempre está listo para trabajar.`,
    glossary: {
      'alto': 'tall',
      'profesor': 'teacher',
      'cansado': 'tired',
      'enfermo': 'ill',
      'creo': 'I think',
      'normalmente': 'normally',
      'ventana': 'window',
      'abierta': 'open (f)',
      'persona': 'person',
      'ahora mismo': 'right now',
      'triste': 'sad',
      'eso': 'that',
      'pasa': 'happens',
      'mañana': 'tomorrow',
      'estará': 'he will be',
      'listo': 'ready',
    },
  },
  {
    slug: 'la-hora-del-tren',
    title: 'La hora del tren',
    emoji: '🚆',
    minWeek: 7,
    blurb: 'Numbers and clock time, doing the one job they exist for.',
    text: `El tren sale a las ocho y media. Son las siete ahora.

Tengo una hora. Bebo un café — cuesta dos euros con cincuenta.

Hay mucha gente. Cuento las personas: uno, dos, tres, cuatro… no, hay demasiadas.

El tren de las ocho llega tarde. Ahora sale a las nueve.

¿Qué hora es? Son las ocho y media. Todavía tengo media hora.`,
    glossary: {
      'tren': 'train',
      'sale': 'leaves',
      'a las': 'at (o\'clock)',
      'ocho': 'eight',
      'y media': 'half past',
      'son las': 'it is (o\'clock)',
      'siete': 'seven',
      'ahora': 'now',
      'cincuenta': 'fifty',
      'cuento': 'I count',
      'personas': 'people',
      'uno': 'one',
      'dos': 'two',
      'tres': 'three',
      'cuatro': 'four',
      'demasiadas': 'too many',
      'llega': 'arrives',
      'nueve': 'nine',
      'qué': 'what',
      'todavía': 'still',
    },
  },
  {
    slug: 'cuantos-anos-tienes',
    title: '¿Cuántos años tienes?',
    emoji: '🎂',
    minWeek: 7,
    blurb: 'A birthday party, counted out in numbers.',
    text: `Hoy es el cumpleaños de mi abuela. Tiene noventa años.

Somos diez personas en la casa. Hay una mesa con diez sillas.

La fiesta empieza a las seis. Mi hermano llega a las seis y media, siempre tarde.

Mi abuela habla de su vida. Trabajó cuarenta años. Tuvo cuatro hijos.

A las once, la abuela dice que está cansada. Todos vamos a casa. Fue un día bueno.`,
    glossary: {
      'cumpleaños': 'birthday',
      'noventa': 'ninety',
      'diez': 'ten',
      'sillas': 'chairs',
      'fiesta': 'party',
      'empieza': 'begins',
      'seis': 'six',
      'llega': 'arrives',
      'vida': 'life',
      'trabajó': 'she worked',
      'cuarenta': 'forty',
      'tuvo': 'she had',
      'hijos': 'children',
      'once': 'eleven',
      'fue': 'it was',
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
    slug: 'perdon-donde-esta',
    title: 'Perdón, ¿dónde está?',
    emoji: '🗺️',
    minWeek: 8,
    blurb: 'Lost in a small town, and asking your way out of it.',
    text: `Perdón, señora. ¿Dónde está la estación?

Está lejos. Todo recto y a la derecha. Diez minutos a pie.

Gracias. ¿Y hay un banco cerca?

Sí, en esta calle, a la izquierda. Al lado del mercado.

Muy amable. ¿La tienda está abierta?

Creo que sí. Está en el centro de la ciudad, aquí mismo.

Gracias otra vez. Adiós.`,
    glossary: {
      'perdón': 'excuse me',
      'estación': 'station',
      'lejos': 'far',
      'todo recto': 'straight ahead',
      'a la derecha': 'on the right',
      'minutos': 'minutes',
      'a pie': 'on foot',
      'a la izquierda': 'on the left',
      'al lado de': 'next to',
      'amable': 'kind',
      'abierta': 'open (f)',
      'centro': 'centre',
      'ciudad': 'city',
      'aquí mismo': 'right here',
      'otra vez': 'again',
    },
  },
  {
    slug: 'salgo-a-las-ocho',
    title: 'Salgo a las ocho',
    emoji: '🚪',
    minWeek: 8,
    blurb: 'The yo-irregular verbs, all in one very ordinary morning.',
    text: `Yo salgo de casa a las ocho. Antes hago un café y veo las noticias.

Pongo mis cosas en la mochila: el libro, el cuaderno, las llaves.

Digo adiós a mi hermana. Ella todavía está en la cama.

En el trabajo veo a mis amigos. Les doy los buenos días.

Por la tarde hago la tarea. Vengo a casa tarde, pero estoy contento.`,
    glossary: {
      'salgo': 'I leave / go out',
      'hago': 'I make / do',
      'veo': 'I see',
      'noticias': 'news',
      'pongo': 'I put',
      'cosas': 'things',
      'mochila': 'backpack',
      'llaves': 'keys',
      'digo': 'I say',
      'cama': 'bed',
      'les': 'to them',
      'doy': 'I give',
      'tarea': 'homework',
      'vengo': 'I come',
      'contento': 'content / pleased',
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
    slug: 'la-carta-que-escribi',
    title: 'La carta que escribí',
    emoji: '✉️',
    minWeek: 9,
    blurb: 'A letter written last night, told entirely in the past.',
    text: `Anoche escribí una carta a mi abuela. No usé el ordenador — escribí a mano.

Le hablé de mi trabajo y de mis amigos aquí. Le conté que estudié español todo el año.

Comí algo, bebí un té, y volví a escribir. Terminé muy tarde.

Esta mañana salí temprano y la mandé. Costó dos euros.

Mi abuela no usa el teléfono. Pero siempre lee mis cartas dos veces.`,
    glossary: {
      'anoche': 'last night',
      'escribí': 'I wrote',
      'carta': 'letter',
      'usé': 'I used',
      'ordenador': 'computer',
      'a mano': 'by hand',
      'le': 'to her',
      'hablé': 'I spoke',
      'conté': 'I told',
      'estudié': 'I studied',
      'comí': 'I ate',
      'bebí': 'I drank',
      'volví': 'I went back / returned',
      'terminé': 'I finished',
      'salí': 'I went out',
      'temprano': 'early',
      'mandé': 'I sent',
      'costó': 'it cost',
      'lee': 'reads',
      'dos veces': 'twice',
    },
  },
  {
    slug: 'el-dia-que-llegue-tarde',
    title: 'El día que llegué tarde',
    emoji: '⏱️',
    minWeek: 9,
    blurb: 'Everything that went wrong on one Tuesday morning.',
    text: `El martes pasado llegué muy tarde al trabajo.

Me levanté a las ocho. Normalmente me levanto a las seis y media, pero no escuché el despertador.

No desayuné. Salí de casa corriendo. Perdí el autobús de las ocho y cuarto.

Caminé veinte minutos. Llegué a las nueve y media.

Mi jefe no dijo nada. Solo miró el reloj. Fue peor que un grito.`,
    glossary: {
      'martes': 'Tuesday',
      'pasado': 'last / past',
      'llegué': 'I arrived',
      'me levanté': 'I got up',
      'escuché': 'I heard',
      'despertador': 'alarm clock',
      'desayuné': 'I had breakfast',
      'corriendo': 'running',
      'perdí': 'I missed / lost',
      'autobús': 'bus',
      'y cuarto': 'quarter past',
      'caminé': 'I walked',
      'jefe': 'boss',
      'dijo': 'said',
      'nada': 'nothing',
      'solo': 'only',
      'miró': 'looked at',
      'reloj': 'clock',
      'peor': 'worse',
      'grito': 'shout',
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
    slug: 'aquel-verano',
    title: 'Aquel verano',
    emoji: '🌅',
    minWeek: 10,
    blurb: 'A childhood summer, told the way memories actually are.',
    text: `Cuando era niño, pasábamos todos los veranos en el pueblo de mi abuela.

La casa era vieja y siempre hacía calor. No había televisión. Jugábamos en la calle hasta las diez de la noche.

Mi abuela cocinaba para todos. Siempre había gente en la cocina. La gente hablaba, cantaba, discutía.

Yo tenía siete años y creía que el verano no terminaba nunca.

Ahora el pueblo está casi vacío. Pero cuando cierro los ojos, todavía huele a la cocina de mi abuela.`,
    glossary: {
      'cuando': 'when',
      'era': 'I / it was',
      'niño': 'boy / child',
      'pasábamos': 'we used to spend',
      'veranos': 'summers',
      'pueblo': 'village',
      'hacía calor': 'it was hot',
      'había': 'there was / were',
      'jugábamos': 'we used to play',
      'cocinaba': 'used to cook',
      'cantaba': 'used to sing',
      'discutía': 'used to argue',
      'tenía': 'I had / was (age)',
      'creía': 'I believed',
      'terminaba': 'used to end',
      'nunca': 'never',
      'vacío': 'empty',
      'cierro': 'I close',
      'ojos': 'eyes',
      'huele a': 'it smells of',
    },
  },
  {
    slug: 'la-tienda-de-mi-padre',
    title: 'La tienda de mi padre',
    emoji: '🏪',
    minWeek: 10,
    blurb: 'A shop that no longer exists, remembered in the imperfect.',
    text: `Mi padre tenía una tienda pequeña en el centro. Vendía pan, leche, fruta — todo un poco.

Abría a las siete y cerraba a las nueve. Trabajaba seis días a la semana.

Yo iba después de la escuela. Le ayudaba con las cajas. Él siempre me daba una manzana.

Conocía a todos los vecinos. La gente entraba solo para hablar.

La tienda ya no existe. Ahora hay un banco. No es igual.`,
    glossary: {
      'tenía': 'had',
      'vendía': 'sold',
      'abría': 'used to open',
      'cerraba': 'used to close',
      'trabajaba': 'used to work',
      'iba': 'used to go',
      'escuela': 'school',
      'ayudaba': 'used to help',
      'cajas': 'boxes',
      'daba': 'used to give',
      'manzana': 'apple',
      'conocía': 'knew',
      'vecinos': 'neighbours',
      'entraba': 'used to come in',
      'para': 'in order to',
      'ya no': 'no longer',
      'existe': 'exists',
      'igual': 'the same',
    },
  },
  {
    slug: 'la-noche-de-la-tormenta',
    title: 'La noche de la tormenta',
    emoji: '⛈️',
    minWeek: 11,
    blurb: 'The storm was the background. One phone call was the story.',
    text: `Era noviembre y llovía sin parar. Yo estaba en casa, leía un libro y esperaba a mi hermana.

De repente, se fue la luz. Toda la calle estaba oscura.

Busqué una vela mientras el viento golpeaba la ventana. Entonces sonó el teléfono.

Era mi hermana. Su coche no funcionaba y estaba a diez kilómetros.

Salí en ese momento. Conduje despacio porque no veía nada. La encontré a la una de la mañana, tranquila, esperando bajo un árbol.

Esa noche cambió algo entre nosotras.`,
    glossary: {
      'noviembre': 'November',
      'llovía': 'it was raining',
      'sin parar': 'without stopping',
      'estaba': 'I was',
      'esperaba': 'I was waiting for',
      'de repente': 'suddenly',
      'se fue la luz': 'the power went out',
      'oscura': 'dark',
      'busqué': 'I looked for',
      'vela': 'candle',
      'mientras': 'while',
      'viento': 'wind',
      'golpeaba': 'was beating',
      'sonó': 'rang',
      'funcionaba': 'was working',
      'kilómetros': 'kilometres',
      'conduje': 'I drove',
      'despacio': 'slowly',
      'porque': 'because',
      'encontré': 'I found',
      'bajo': 'under',
      'árbol': 'tree',
      'cambió': 'changed',
      'entre': 'between',
    },
  },
  {
    slug: 'la-primera-vez-que-hable',
    title: 'La primera vez que hablé',
    emoji: '😅',
    minWeek: 11,
    blurb: 'The first real conversation in a new language, and how badly it went.',
    text: `Estudiaba español desde hacía un año, pero nunca hablaba con nadie.

Un día entré en una panadería. Había una señora mayor detrás del mostrador. Sonreía.

Quería decir "quiero dos panes". Dije algo muy diferente. La señora me miró un momento y luego se rió.

Mientras yo buscaba las palabras, ella esperaba con paciencia. Al final me dio el pan correcto.

Salí rojo de vergüenza. Pero volví al día siguiente. Y otra vez. Ahora hablamos cada mañana.`,
    glossary: {
      'estudiaba': 'I had been studying',
      'desde hacía': 'for (a period)',
      'nadie': 'nobody',
      'entré': 'I went into',
      'panadería': 'bakery',
      'mayor': 'older',
      'detrás de': 'behind',
      'mostrador': 'counter',
      'sonreía': 'was smiling',
      'quería': 'I wanted',
      'decir': 'to say',
      'dije': 'I said',
      'diferente': 'different',
      'se rió': 'she laughed',
      'buscaba': 'I was searching for',
      'paciencia': 'patience',
      'al final': 'in the end',
      'dio': 'gave',
      'correcto': 'correct',
      'vergüenza': 'embarrassment',
      'volví': 'I went back',
      'siguiente': 'following',
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
    slug: 'vamos-a-ver-a-tu-madre',
    title: 'Vamos a ver a tu madre',
    emoji: '🚗',
    minWeek: 12,
    blurb: 'A weekend being planned, out loud, in the car.',
    text: `— ¿Qué vamos a hacer este fin de semana?

— Voy a ver a mi madre. Tengo que llevarle unas cosas.

— ¿Vas a ir el sábado?

— Sí. Vamos a salir temprano. Tengo que estar allí a las once.

— Entonces yo voy a preparar la comida el viernes.

— Perfecto. Y el domingo vamos a descansar. No voy a hacer absolutamente nada.

— Eso dices siempre. Y siempre acabas trabajando.`,
    glossary: {
      'fin de semana': 'weekend',
      'llevarle': 'to take her',
      'unas': 'some',
      'ir': 'to go',
      'salir': 'to leave',
      'estar': 'to be',
      'preparar': 'to prepare',
      'viernes': 'Friday',
      'descansar': 'to rest',
      'absolutamente': 'absolutely',
      'dices': 'you say',
      'acabas': 'you end up',
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
    slug: 'me-encanta-el-domingo',
    title: 'Me encanta el domingo',
    emoji: '☀️',
    minWeek: 13,
    blurb: 'Likes, loves and one strong opinion about football.',
    text: `Me encanta el domingo. Es mi día favorito.

Me gusta levantarme tarde. Me gustan los desayunos largos, con café y música.

A mi hermano le gusta el fútbol. A mí no. Prefiero leer o caminar.

Odio los domingos por la tarde, la verdad. Siempre pienso en el lunes.

Pero por la noche veo una película con mi familia. Me encantan las películas viejas. Esas sí me gustan.`,
    glossary: {
      'me encanta': 'I love',
      'favorito': 'favourite',
      'levantarme': 'to get up',
      'desayunos': 'breakfasts',
      'largos': 'long',
      'fútbol': 'football',
      'a mí': 'for me',
      'prefiero': 'I prefer',
      'caminar': 'to walk',
      'odio': 'I hate',
      'la verdad': 'honestly',
      'pienso': 'I think',
      'lunes': 'Monday',
      'película': 'film',
      'películas': 'films',
      'esas': 'those',
    },
  },
  {
    slug: 'mi-rutina-imposible',
    title: 'Mi rutina imposible',
    emoji: '🏃',
    minWeek: 13,
    blurb: 'A morning routine that is far too optimistic.',
    text: `Me despierto a las cinco y media. En teoría.

En realidad, me levanto a las siete. Me ducho rápido, me visto, y no desayuno.

Mi compañero se levanta a las seis. Corre, se ducha, prepara el desayuno y lee las noticias. Todo antes de las siete.

No comprendo cómo lo hace. Yo apenas encuentro los zapatos.

Por la noche me acuesto tarde y digo que mañana será diferente. Nunca lo es.`,
    glossary: {
      'me despierto': 'I wake up',
      'en teoría': 'in theory',
      'en realidad': 'in reality',
      'me levanto': 'I get up',
      'me ducho': 'I shower',
      'rápido': 'quickly',
      'me visto': 'I get dressed',
      'compañero': 'flatmate / partner',
      'corre': 'runs',
      'prepara': 'prepares',
      'apenas': 'barely',
      'encuentro': 'I find',
      'zapatos': 'shoes',
      'me acuesto': 'I go to bed',
      'será': 'will be',
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
    slug: 'cuatro-estaciones',
    title: 'Cuatro estaciones',
    emoji: '🍂',
    minWeek: 14,
    blurb: 'A year in one town, one season at a time.',
    text: `En primavera llueve mucho aquí, pero todo está verde. Es mi estación favorita.

En verano hace muchísimo calor. La gente sale solo por la noche. Las calles están vacías a las tres de la tarde.

En otoño hace fresco y hay viento. Es cuando la ciudad es más bonita.

En invierno hace frío y a veces nieva en la montaña. Nunca nieva en el centro.

¿Qué tiempo hace hoy? Hace sol. Perfecto para salir.`,
    glossary: {
      'primavera': 'spring',
      'verde': 'green',
      'estación': 'season',
      'verano': 'summer',
      'muchísimo': 'a huge amount of',
      'vacías': 'empty (f pl)',
      'otoño': 'autumn',
      'fresco': 'cool',
      'viento': 'wind',
      'invierno': 'winter',
      'nieva': 'it snows',
      'montaña': 'mountain',
      'tiempo': 'weather',
      'hace sol': 'it\'s sunny',
    },
  },
  {
    slug: 'la-lista-de-la-compra',
    title: 'La lista de la compra',
    emoji: '🛒',
    minWeek: 14,
    blurb: 'Shopping, prices and one small argument at the till.',
    text: `Necesito comprar muchas cosas hoy. Tengo una lista.

Primero voy al mercado. La fruta es más barata allí. Compro manzanas y algo de carne.

Después voy a la tienda de ropa. Busco una camisa azul. ¿Qué talla usas? La mediana, creo.

La camisa cuesta cuarenta euros. Es muy cara. Hay un descuento del veinte por ciento, así que pago treinta y dos.

Pago con tarjeta. La calidad es buena, así que no importa el precio.`,
    glossary: {
      'lista': 'list',
      'primero': 'first',
      'barata': 'cheap (f)',
      'algo de': 'some',
      'después': 'afterwards',
      'ropa': 'clothes',
      'camisa': 'shirt',
      'talla': 'size',
      'usas': 'you use / wear',
      'mediana': 'medium',
      'cara': 'expensive (f)',
      'descuento': 'discount',
      'por ciento': 'percent',
      'así que': 'so',
      'treinta': 'thirty',
      'tarjeta': 'card',
      'calidad': 'quality',
      'no importa': 'it doesn\'t matter',
      'precio': 'price',
    },
  },
  {
    slug: 'una-habitacion-con-vistas',
    title: 'Una habitación con vistas',
    emoji: '🏨',
    minWeek: 15,
    blurb: 'Checking into a hotel that isn\'t quite what was promised.',
    text: `Buenas tardes. Tengo una reserva a nombre de Ramos.

Sí, aquí está. Una habitación doble para tres noches. ¿Su pasaporte, por favor?

Aquí tiene. ¿La habitación tiene vistas al mar?

Tiene vistas… al patio. Lo siento. Las habitaciones con vistas están todas ocupadas.

Entiendo. ¿Y el desayuno está incluido?

Sí, de siete a diez. El ascensor está a la derecha. Habitación doscientos cuatro.

Gracias. Una última cosa: ¿hay wifi?

Claro. La contraseña está en la mesa de la habitación.`,
    glossary: {
      'reserva': 'reservation',
      'a nombre de': 'in the name of',
      'habitación': 'room',
      'doble': 'double',
      'pasaporte': 'passport',
      'vistas': 'views',
      'mar': 'sea',
      'patio': 'courtyard',
      'lo siento': 'I\'m sorry',
      'ocupadas': 'occupied',
      'entiendo': 'I understand',
      'incluido': 'included',
      'ascensor': 'lift',
      'doscientos': 'two hundred',
      'última': 'last',
      'contraseña': 'password',
    },
  },
  {
    slug: 'me-duele-todo',
    title: 'Me duele todo',
    emoji: '🩺',
    minWeek: 15,
    blurb: 'A visit to the doctor, and some very unwelcome advice.',
    text: `Buenos días, doctora. No me siento bien.

¿Qué le pasa exactamente?

Me duele la cabeza desde hace tres días. Y estoy muy cansado.

¿Duerme bien?

No mucho. Trabajo hasta muy tarde y luego no puedo dormir.

¿Y bebe mucho café?

Seis o siete al día, más o menos.

Ah. Entonces ya sabemos el problema. Beba agua, no café. Y acuéstese antes de medianoche.

¿No hay una pastilla?

La pastilla se llama "dormir". Es gratis.`,
    glossary: {
      'me siento': 'I feel',
      'le pasa': 'is wrong with you',
      'exactamente': 'exactly',
      'me duele': 'it hurts me',
      'cabeza': 'head',
      'desde hace': 'for (a period)',
      'duerme': 'do you sleep',
      'puedo': 'I can',
      'más o menos': 'more or less',
      'sabemos': 'we know',
      'problema': 'problem',
      'beba': 'drink (formal command)',
      'acuéstese': 'go to bed (formal command)',
      'medianoche': 'midnight',
      'pastilla': 'pill',
      'gratis': 'free',
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
    slug: 'mejor-que-antes',
    title: 'Mejor que antes',
    emoji: '⚖️',
    minWeek: 16,
    blurb: 'Two cities compared, and one clear winner.',
    text: `Vivo en una ciudad más pequeña que antes. Es diferente, pero creo que es mejor.

Madrid era más grande, más rápida, más cara. Había más trabajo, sí, pero también más estrés.

Aquí todo es más lento. El alquiler es menos caro. La gente es tan amable como en el pueblo de mi abuela.

Mi hermano dice que esta ciudad es la peor de España porque no hay nada que hacer. Él es mayor que yo y prefiere el ruido.

Para mí, es el mejor sitio donde he vivido. Menos interesante, quizás. Pero mucho más tranquilo.`,
    glossary: {
      'más que': 'more than',
      'mejor': 'better',
      'rápida': 'fast (f)',
      'estrés': 'stress',
      'lento': 'slow',
      'alquiler': 'rent',
      'menos': 'less',
      'tan… como': 'as… as',
      'peor': 'worst',
      'nada que hacer': 'nothing to do',
      'mayor': 'older',
      'ruido': 'noise',
      'sitio': 'place',
      'he vivido': 'I have lived',
      'interesante': 'interesting',
      'quizás': 'perhaps',
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
    slug: 'ahora-mismo-en-la-plaza',
    title: 'Ahora mismo en la plaza',
    emoji: '🎪',
    minWeek: 17,
    blurb: 'A square at seven in the evening, described as it happens.',
    text: `Son las siete y la plaza está llena. Estoy sentado en un banco, mirando.

Un hombre está tocando la guitarra. Nadie le está escuchando, pero él sigue tocando.

Dos niños están corriendo entre las mesas. Su madre les está llamando y ellos no le hacen caso.

En el café de la esquina, un camarero está limpiando las mesas. Está cansado, se ve.

Está empezando a llover. La gente está recogiendo sus cosas.

Yo todavía estoy aquí, escribiendo esto. Ya casi no queda nadie.`,
    glossary: {
      'plaza': 'square',
      'llena': 'full (f)',
      'sentado': 'sitting',
      'banco': 'bench',
      'hombre': 'man',
      'tocando': 'playing',
      'guitarra': 'guitar',
      'sigue': 'carries on',
      'corriendo': 'running',
      'llamando': 'calling',
      'hacen caso': 'pay attention',
      'limpiando': 'cleaning',
      'se ve': 'you can tell',
      'empezando': 'starting',
      'llover': 'to rain',
      'recogiendo': 'gathering up',
      'escribiendo': 'writing',
      'queda': 'remains',
    },
  },
  {
    slug: 'donde-lo-puse',
    title: '¿Dónde lo puse?',
    emoji: '🔑',
    minWeek: 17,
    blurb: 'Looking for keys. Every noun replaced by a pronoun.',
    text: `No encuentro mis llaves. Las tenía esta mañana, estoy seguro.

¿Las has visto?

No, no las he visto. ¿Miraste en la chaqueta?

La miré dos veces. No están.

¿Y el bolso? A veces las pones ahí y luego no te acuerdas.

Lo miré también… Espera. Aquí están. Estaban debajo del periódico.

Te lo dije. Siempre las dejas en el mismo sitio y nunca lo recuerdas.

No me lo digas. Ya lo sé.`,
    glossary: {
      'encuentro': 'I find',
      'llaves': 'keys',
      'seguro': 'sure',
      'has visto': 'have you seen',
      'he visto': 'I have seen',
      'miraste': 'did you look',
      'chaqueta': 'jacket',
      'miré': 'I looked at',
      'bolso': 'bag',
      'pones': 'you put',
      'ahí': 'there',
      'te acuerdas': 'you remember',
      'espera': 'wait',
      'debajo de': 'under',
      'periódico': 'newspaper',
      'dejas': 'you leave',
      'mismo': 'same',
      'recuerdas': 'you remember',
      'digas': 'say (subjunctive)',
    },
  },
  {
    slug: 'nunca-he-estado-alli',
    title: 'Nunca he estado allí',
    emoji: '✈️',
    minWeek: 18,
    blurb: 'Two people compare what they have and haven\'t done.',
    text: `¿Has estado alguna vez en Argentina?

Nunca. Todavía no he salido de Europa, la verdad.

Yo he estado dos veces. He visto cosas increíbles allí.

¿Has comido carne argentina de verdad?

He comido en un restaurante argentino aquí, pero no es igual. Todo el mundo me lo dice.

Ha sido el mejor viaje de mi vida. He hecho muchos viajes, pero ese fue especial.

Este año no he ido a ninguna parte. He trabajado demasiado.

Eso lo he oído antes.`,
    glossary: {
      'has estado': 'have you been',
      'alguna vez': 'ever',
      'he salido': 'I have left',
      'he visto': 'I have seen',
      'increíbles': 'incredible',
      'has comido': 'have you eaten',
      'argentina': 'Argentinian',
      'ha sido': 'it has been',
      'he hecho': 'I have done',
      'especial': 'special',
      'ninguna parte': 'nowhere',
      'he trabajado': 'I have worked',
      'he oído': 'I have heard',
    },
  },
  {
    slug: 'por-favor-espere',
    title: 'Por favor, espere',
    emoji: '🏛️',
    minWeek: 18,
    blurb: 'An office, a queue, and a lot of formal commands.',
    text: `Buenos días. Pase, por favor. Siéntese.

Gracias.

Dígame, ¿en qué puedo ayudarle?

Necesito renovar mi documento.

Muy bien. Rellene este formulario. Escriba su nombre completo aquí y firme abajo.

¿Y la foto?

Déjela con el formulario. Y no se preocupe por la fecha, la ponemos nosotros.

Perfecto.

Espere un momento, por favor. Tome asiento. Le llamamos en diez minutos.

Y por favor, no fume aquí dentro.`,
    glossary: {
      'pase': 'come in (formal)',
      'siéntese': 'sit down (formal)',
      'dígame': 'tell me (formal)',
      'puedo': 'can I',
      'ayudarle': 'help you',
      'renovar': 'to renew',
      'documento': 'document',
      'rellene': 'fill in (formal)',
      'formulario': 'form',
      'escriba': 'write (formal)',
      'completo': 'full',
      'firme': 'sign (formal)',
      'abajo': 'below',
      'déjela': 'leave it (formal)',
      'no se preocupe': 'don\'t worry (formal)',
      'fecha': 'date',
      'ponemos': 'we put',
      'espere': 'wait (formal)',
      'tome asiento': 'take a seat',
      'no fume': 'don\'t smoke (formal)',
      'dentro': 'inside',
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
    slug: 'si-tuviera-una-casa',
    title: 'Si tuviera una casa',
    emoji: '🏡',
    minWeek: 19,
    blurb: 'An imaginary house, built entirely out of conditionals.',
    text: `Si tuviera dinero, compraría una casa pequeña cerca del mar.

No sería grande. Tendría dos habitaciones, una cocina con ventanas grandes, y una mesa larga para mucha gente.

Me levantaría temprano. Escribiría por la mañana y caminaría por la tarde.

Invitaría a mis amigos en verano. Cocinaríamos juntos y hablaríamos hasta muy tarde.

¿Sería feliz? Creo que sí. Pero quizás me aburriría después de un año.

Deberías comprarla igualmente, dice mi hermana. Podrías venderla si no te gusta.`,
    glossary: {
      'si': 'if',
      'tuviera': 'I had (subjunctive)',
      'compraría': 'I would buy',
      'sería': 'it would be',
      'tendría': 'it would have',
      'habitaciones': 'bedrooms',
      'larga': 'long (f)',
      'me levantaría': 'I would get up',
      'escribiría': 'I would write',
      'caminaría': 'I would walk',
      'invitaría': 'I would invite',
      'cocinaríamos': 'we would cook',
      'juntos': 'together',
      'hablaríamos': 'we would talk',
      'me aburriría': 'I would get bored',
      'deberías': 'you should',
      'igualmente': 'anyway',
      'podrías': 'you could',
      'venderla': 'sell it',
    },
  },
  {
    slug: 'ojala-llegue-a-tiempo',
    title: 'Ojalá llegue a tiempo',
    emoji: '🤞',
    minWeek: 19,
    blurb: 'Someone waiting at an airport, hoping out loud.',
    text: `Espero que el avión llegue a tiempo. Ojalá no haya retraso.

Mi madre quiere que la llame cuando aterrice. Es importante que sepa que estoy bien.

Espero que mi hermano venga a buscarme. Le dije que no era necesario, pero quiero que venga igualmente.

Ojalá tengamos suerte con el tiempo. No quiero que llueva el primer día.

Es importante que descanse esta noche. Mañana empieza todo.

Y ojalá que hable español mejor al final de este viaje.`,
    glossary: {
      'espero que': 'I hope that',
      'avión': 'plane',
      'llegue': 'arrives (subjunctive)',
      'a tiempo': 'on time',
      'ojalá': 'I hope / if only',
      'haya': 'there is (subjunctive)',
      'retraso': 'delay',
      'llame': 'I call (subjunctive)',
      'aterrice': 'it lands (subjunctive)',
      'sepa': 'she knows (subjunctive)',
      'venga': 'comes (subjunctive)',
      'buscarme': 'to pick me up',
      'necesario': 'necessary',
      'tengamos': 'we have (subjunctive)',
      'suerte': 'luck',
      'llueva': 'it rains (subjunctive)',
      'descanse': 'I rest (subjunctive)',
      'hable': 'I speak (subjunctive)',
    },
  },
  {
    slug: 'si-pudiera-volver',
    title: 'Si pudiera volver',
    emoji: '🕰️',
    minWeek: 20,
    blurb: 'Regret, advice and one very direct piece of it.',
    text: `Si pudiera volver atrás, haría las cosas de otra manera.

Si hablara con mi yo de veinte años, le diría tres cosas.

Primero: no tengas miedo. Ojalá alguien me lo hubiera dicho entonces.

Segundo: no hables tanto y escucha más. Si escuchara más, aprendería el doble.

Y tercero: si fuera tú, empezaría hoy. No mañana.

Mi abuelo me dijo algo parecido una vez. Yo no le hice caso. Si le hubiera escuchado, todo habría sido más fácil.

Así que: no esperes. No busques el momento perfecto. No existe.`,
    glossary: {
      'pudiera': 'I could (subjunctive)',
      'volver atrás': 'to go back',
      'de otra manera': 'differently',
      'hablara': 'I spoke (subjunctive)',
      'diría': 'I would say',
      'no tengas': 'don\'t have',
      'miedo': 'fear',
      'hubiera dicho': 'had said',
      'segundo': 'second',
      'no hables': 'don\'t talk',
      'escuchara': 'I listened (subjunctive)',
      'el doble': 'twice as much',
      'tercero': 'third',
      'fuera': 'I were',
      'empezaría': 'I would start',
      'parecido': 'similar',
      'hice caso': 'I paid attention',
      'habría sido': 'would have been',
      'no esperes': 'don\'t wait',
      'no busques': 'don\'t look for',
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
    slug: 'la-carta-al-futuro',
    title: 'La carta al futuro',
    emoji: '🔮',
    minWeek: 21,
    blurb: 'A letter written to yourself, ten years out.',
    text: `Querido yo del futuro:

Cuando leas esto, tendrás treinta y cinco años. Espero que estés bien.

¿Hablarás español todavía? Creo que sí. Habrás vivido en España, o quizás en México.

Tendrás un trabajo que te gustará. No será fácil, pero será tuyo.

Verás a la familia más a menudo. Eso lo prometo. Iré más veces, aunque el vuelo sea caro.

Algún día escribirás algo importante. No sé qué. Pero lo harás.

Y si no, tampoco pasa nada. Estarás bien igualmente.

Hasta pronto.`,
    glossary: {
      'querido': 'dear',
      'leas': 'you read (subjunctive)',
      'tendrás': 'you will have',
      'estés': 'you are (subjunctive)',
      'hablarás': 'you will speak',
      'habrás vivido': 'you will have lived',
      'gustará': 'will please',
      'tuyo': 'yours',
      'verás': 'you will see',
      'a menudo': 'often',
      'prometo': 'I promise',
      'iré': 'I will go',
      'aunque': 'even though',
      'vuelo': 'flight',
      'sea': 'is (subjunctive)',
      'escribirás': 'you will write',
      'harás': 'you will do',
      'tampoco': 'neither',
      'pasa nada': 'it matters',
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
    slug: 'la-entrevista',
    title: 'La entrevista',
    emoji: '💼',
    minWeek: 22,
    blurb: 'Twenty minutes of nerves, described honestly.',
    text: `Esta mañana estaba tan nervioso que no pude desayunar.

Llegué media hora antes. Me senté fuera y esperé. Estaba preocupado por todo: la ropa, las preguntas, mi acento.

Cuando entré, la mujer me sonrió y me sentí un poco mejor. Me preguntó por qué quería el trabajo. Le dije la verdad.

En un momento me quedé en blanco. No me salían las palabras. Ella esperó. No pasó nada.

Al salir estaba emocionado y agotado a la vez. No sé si me darán el trabajo.

Pero estoy orgulloso de haber ido. Hace un año no habría entrado por esa puerta.`,
    glossary: {
      'nervioso': 'nervous',
      'pude': 'I could',
      'me senté': 'I sat down',
      'esperé': 'I waited',
      'preocupado': 'worried',
      'preguntas': 'questions',
      'acento': 'accent',
      'mujer': 'woman',
      'sonrió': 'smiled',
      'me sentí': 'I felt',
      'preguntó': 'asked',
      'quedé en blanco': 'went blank',
      'no me salían': 'wouldn\'t come out',
      'emocionado': 'excited',
      'agotado': 'exhausted',
      'a la vez': 'at the same time',
      'darán': 'they will give',
      'orgulloso': 'proud',
      'haber ido': 'having gone',
      'habría entrado': 'would have gone in',
      'puerta': 'door',
    },
  },
  {
    slug: 'no-te-preocupes',
    title: 'No te preocupes',
    emoji: '🫂',
    minWeek: 22,
    blurb: 'One friend talking another down from a bad evening.',
    text: `¿Estás bien? Te veo rara.

Estoy enfadada. Y triste. Y no sé por qué.

No te preocupes. A veces pasa.

Me siento tonta. Todo el mundo parece tranquilo y yo no.

Eso no es verdad. Todo el mundo lo parece. Es diferente.

Supongo que sí.

Mira, siéntate. ¿Quieres un té?

Sí. Gracias por escuchar.

Siempre. Y mañana nos reímos de esto, ya verás.

Quizás. Hoy no, pero quizás mañana.`,
    glossary: {
      'rara': 'odd (f)',
      'enfadada': 'angry (f)',
      'triste': 'sad',
      'no te preocupes': 'don\'t worry',
      'tonta': 'silly (f)',
      'todo el mundo': 'everyone',
      'parece': 'seems',
      'supongo': 'I suppose',
      'siéntate': 'sit down',
      'escuchar': 'listening',
      'nos reímos': 'we\'ll laugh',
      'ya verás': 'you\'ll see',
    },
  },
  {
    slug: 'el-hombre-del-tren',
    title: 'El hombre del tren',
    emoji: '🚉',
    minWeek: 23,
    blurb: 'A short story with a proper ending. Everything you\'ve learned, working together.',
    text: `Resulta que aquel día perdí el tren por dos minutos. Dos.

Mientras esperaba el siguiente, se sentó a mi lado un hombre mayor con un sombrero viejo. No dijo nada durante veinte minutos.

De repente me preguntó si yo era extranjero. Le dije que sí. Sonrió y empezó a hablar.

Me contó que había trabajado cuarenta años en los trenes. Que había visto de todo. Que su mujer había muerto en marzo y que ya no sabía qué hacer con los días.

Mientras tanto llegó mi tren. No me subí.

En ese momento me di cuenta de que perder aquel tren había sido lo mejor del viaje. Hablamos dos horas. Nunca supe su nombre.

Fue un día inolvidable, y todavía es mi mejor recuerdo de aquel verano.`,
    glossary: {
      'resulta que': 'it turns out that',
      'aquel': 'that (distant)',
      'siguiente': 'next',
      'se sentó': 'sat down',
      'a mi lado': 'next to me',
      'sombrero': 'hat',
      'durante': 'for / during',
      'extranjero': 'foreigner',
      'empezó': 'began',
      'contó': 'told',
      'había trabajado': 'had worked',
      'había visto': 'had seen',
      'de todo': 'everything',
      'había muerto': 'had died',
      'marzo': 'March',
      'mientras tanto': 'meanwhile',
      'me subí': 'I got on',
      'me di cuenta': 'I realised',
      'perder': 'missing',
      'supe': 'I found out',
      'inolvidable': 'unforgettable',
      'recuerdo': 'memory',
    },
  },
  {
    slug: 'la-carta-de-mi-abuelo',
    title: 'La carta de mi abuelo',
    emoji: '📜',
    minWeek: 23,
    blurb: 'A letter found in a drawer, forty years late.',
    text: `El mes pasado, mientras vaciaba la casa de mi abuelo, encontré una carta en un cajón.

Estaba escrita en 1978 y nunca la había mandado. Era para mi abuela.

En ella le decía cosas que yo nunca le oí decir en voz alta. Que la echaba de menos. Que sentía no haber hablado más.

Me senté en el suelo y la leí tres veces. Fuera estaba lloviendo.

Resulta que las personas que parecen más calladas a veces guardan más cosas dentro.

Por fin entendí a mi abuelo, cuarenta años tarde. Le he dado la carta a mi madre. Ella todavía no la ha abierto.`,
    glossary: {
      'mes': 'month',
      'vaciaba': 'I was emptying',
      'cajón': 'drawer',
      'escrita': 'written',
      'había mandado': 'had sent',
      'decía': 'said',
      'oí': 'I heard',
      'en voz alta': 'out loud',
      'echaba de menos': 'missed',
      'sentía': 'regretted',
      'suelo': 'floor',
      'fuera': 'outside',
      'calladas': 'quiet (f pl)',
      'guardan': 'keep',
      'dentro': 'inside',
      'entendí': 'I understood',
      'he dado': 'I have given',
      'ha abierto': 'has opened',
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
  {
    slug: 'lo-que-diria-ahora',
    title: 'Lo que diría ahora',
    emoji: '🎤',
    minWeek: 24,
    blurb: 'Looking back at a year of learning — and what it was actually for.',
    text: `Hace un año no podía decir ni una frase completa en español.

Me acuerdo de la primera lección. Aprendí "hola" y "gracias" y creía que ya era mucho.

Durante meses no vi ningún progreso. Estudiaba, olvidaba, volvía a estudiar. Había días en los que quería dejarlo.

Pero seguí. Y un día, en una tienda, entendí una conversación entera sin pensar. No la traduje. Simplemente la entendí.

Si alguien me preguntara ahora qué he aprendido, no hablaría de gramática. Diría que he aprendido a no tener miedo de sonar tonto.

Todavía cometo errores cada día. Seguiré cometiéndolos. Pero ahora los cometo hablando, no callado.

Y eso, al final, era todo lo que necesitaba.`,
    glossary: {
      'hace un año': 'a year ago',
      'ni': 'not even',
      'frase': 'sentence',
      'me acuerdo': 'I remember',
      'lección': 'lesson',
      'aprendí': 'I learned',
      'meses': 'months',
      'ningún': 'any',
      'progreso': 'progress',
      'olvidaba': 'I forgot',
      'dejarlo': 'to quit',
      'seguí': 'I carried on',
      'entera': 'whole (f)',
      'sin': 'without',
      'traduje': 'I translated',
      'simplemente': 'simply',
      'preguntara': 'asked (subjunctive)',
      'gramática': 'grammar',
      'sonar': 'to sound',
      'cometo': 'I make (errors)',
      'errores': 'mistakes',
      'seguiré': 'I will carry on',
      'callado': 'silent',
      'necesitaba': 'I needed',
    },
  },
];

/**
 * The passages for whichever course the learner is actually in.
 *
 * READINGS above stays exported and Spanish, because a great deal of the
 * module (and its tests) reasons about that one set directly. Everything that
 * renders a list or resolves a slug must go through here instead — reading an
 * Italian course and being shown Spanish passages is the kind of bug that
 * makes the whole language switch feel broken.
 */
export function getReadings(languageId: string = getActiveLanguageId()): ReadingPassage[] {
  return languageId === 'it' ? READINGS_IT : READINGS;
}

export function getReading(slug: string): ReadingPassage | undefined {
  return getReadings().find((r) => r.slug === slug);
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
