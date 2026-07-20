/**
 * Phase 1 Curriculum — full lesson content, shipped with the app.
 * The interactive lesson engine generates teaching + exercises from this data,
 * so lessons work instantly with no backend content dependency.
 */

export interface VocabItem {
  /** Stable id used for progress tracking */
  id: string;
  es: string;
  en: string;
  /** Accepted alternative English answers */
  enAlt?: string[];
  pron: string;
  exampleEs: string;
  exampleEn: string;
}

export interface CurriculumLesson {
  slug: string;
  title: string;
  subtitle: string;
  week: number;
  order: number;
  theme: 'phonetics' | 'verbs' | 'family' | 'nouns' | 'adjectives' | 'review';
  emoji: string;
  description: string;
  /** Tip shown before the lesson starts */
  tip: string;
  vocab: VocabItem[];
  /** Sentences used for fill-in-the-blank exercises. `blank` must appear in `es`. */
  sentences: Array<{ es: string; en: string; blank: string }>;
  /** If true, the lesson pulls its material from earlier lessons (review) */
  isReview?: boolean;
}

const v = (
  id: string,
  es: string,
  en: string,
  pron: string,
  exampleEs: string,
  exampleEn: string,
  enAlt?: string[]
): VocabItem => ({ id, es, en, pron, exampleEs, exampleEn, enAlt });

export const curriculum: CurriculumLesson[] = [
  {
    slug: 'greetings-essentials',
    title: 'Greetings & Essentials',
    subtitle: 'Your first Spanish conversation',
    week: 1,
    order: 1,
    theme: 'phonetics',
    emoji: '👋',
    description: 'The words you will use in every single conversation — greetings, thanks, and polite essentials.',
    tip: 'Spanish vowels never change: A = "ah", E = "eh", I = "ee", O = "oh", U = "oo". Say every word out loud!',
    vocab: [
      v('hola', 'hola', 'hello', 'OH-lah', '¡Hola! ¿Cómo estás?', 'Hello! How are you?', ['hi']),
      v('adios', 'adiós', 'goodbye', 'ah-DYOHS', 'Adiós, hasta mañana.', 'Goodbye, see you tomorrow.', ['bye']),
      v('gracias', 'gracias', 'thank you', 'GRAH-syahs', 'Muchas gracias por todo.', 'Thank you very much for everything.', ['thanks']),
      v('por-favor', 'por favor', 'please', 'por fah-BOR', 'Un café, por favor.', 'A coffee, please.'),
      v('si', 'sí', 'yes', 'SEE', 'Sí, me gusta mucho.', 'Yes, I like it a lot.'),
      v('no', 'no', 'no', 'NOH', 'No, gracias.', 'No, thank you.'),
      v('buenos-dias', 'buenos días', 'good morning', 'BWEH-nohs DEE-ahs', 'Buenos días, señora.', 'Good morning, ma\'am.'),
      v('buenas-noches', 'buenas noches', 'good night', 'BWEH-nahs NOH-chehs', 'Buenas noches, hasta mañana.', 'Good night, see you tomorrow.', ['good evening']),
      v('mucho-gusto', 'mucho gusto', 'nice to meet you', 'MOO-choh GOOS-toh', 'Mucho gusto, yo soy María.', 'Nice to meet you, I\'m María.', ['pleased to meet you']),
      v('perdon', 'perdón', 'excuse me', 'pehr-DOHN', 'Perdón, ¿dónde está el baño?', 'Excuse me, where is the bathroom?', ['sorry', 'pardon']),
      v('de-nada', 'de nada', 'you\'re welcome', 'deh NAH-dah', '—Gracias. —De nada.', '"Thanks." "You\'re welcome."', ['youre welcome', 'no problem']),
      v('como-estas', '¿cómo estás?', 'how are you?', 'KOH-moh ehs-TAHS', '¿Cómo estás? Muy bien, gracias.', 'How are you? Very well, thanks.', ['how are you']),
    ],
    sentences: [
      { es: '¡Hola! ¿Cómo estás?', en: 'Hello! How are you?', blank: 'Hola' },
      { es: 'Un café, por favor.', en: 'A coffee, please.', blank: 'por favor' },
      { es: 'Muchas gracias por todo.', en: 'Thank you very much for everything.', blank: 'gracias' },
      { es: 'Mucho gusto, yo soy María.', en: 'Nice to meet you, I\'m María.', blank: 'Mucho gusto' },
      { es: 'Adiós, hasta mañana.', en: 'Goodbye, see you tomorrow.', blank: 'Adiós' },
      { es: 'Buenos días, señora.', en: 'Good morning, ma\'am.', blank: 'Buenos días' },
    ],
  },
  {
    slug: 'ser-identity',
    title: 'To Be & Identity',
    subtitle: 'Say who you are with "ser"',
    week: 1,
    order: 2,
    theme: 'verbs',
    emoji: '🪪',
    description: 'The most important verb in Spanish: ser (to be). Introduce yourself and describe people.',
    tip: 'In Spanish you can drop the pronoun: "Soy María" = "I am María". The verb ending tells you who!',
    vocab: [
      v('yo-soy', 'yo soy', 'I am', 'yoh SOY', 'Yo soy de Inglaterra.', 'I am from England.', ['i am']),
      v('tu-eres', 'tú eres', 'you are', 'too EH-rehs', 'Tú eres muy amable.', 'You are very kind.', ['you are']),
      v('el-es', 'él es', 'he is', 'el EHS', 'Él es mi amigo.', 'He is my friend.', ['he is']),
      v('ella-es', 'ella es', 'she is', 'EH-yah ehs', 'Ella es doctora.', 'She is a doctor.', ['she is']),
      v('somos', 'nosotros somos', 'we are', 'noh-SOH-trohs SOH-mohs', 'Nosotros somos amigos.', 'We are friends.', ['we are']),
      v('me-llamo', 'me llamo', 'my name is', 'meh YAH-moh', 'Me llamo Jack.', 'My name is Jack.', ['i am called', 'my name is']),
      v('amigo', 'el amigo', 'friend', 'ah-MEE-goh', 'Carlos es mi amigo.', 'Carlos is my friend.', ['the friend']),
      v('doctor', 'el doctor', 'doctor', 'dohk-TOR', 'Mi padre es doctor.', 'My father is a doctor.', ['the doctor']),
      v('estudiante', 'el estudiante', 'student', 'ehs-too-DYAHN-teh', 'Soy estudiante de español.', 'I am a student of Spanish.', ['the student']),
      v('de-donde', '¿de dónde eres?', 'where are you from?', 'deh DOHN-deh EH-rehs', '¿De dónde eres? Soy de Madrid.', 'Where are you from? I\'m from Madrid.', ['where are you from']),
      v('y', 'y', 'and', 'EE', 'María y Carlos son amigos.', 'María and Carlos are friends.'),
      v('tambien', 'también', 'also', 'tahm-BYEHN', 'Yo también soy estudiante.', 'I am also a student.', ['too', 'as well']),
    ],
    sentences: [
      { es: 'Yo soy de Inglaterra.', en: 'I am from England.', blank: 'soy' },
      { es: 'Me llamo Jack.', en: 'My name is Jack.', blank: 'Me llamo' },
      { es: 'Ella es doctora.', en: 'She is a doctor.', blank: 'es' },
      { es: 'Tú eres muy amable.', en: 'You are very kind.', blank: 'eres' },
      { es: 'Nosotros somos amigos.', en: 'We are friends.', blank: 'somos' },
      { es: 'Yo también soy estudiante.', en: 'I am also a student.', blank: 'también' },
    ],
  },
  {
    slug: 'daily-verbs',
    title: 'Daily Action Verbs',
    subtitle: 'Talk about what you do every day',
    week: 2,
    order: 1,
    theme: 'verbs',
    emoji: '🏃',
    description: 'The core verbs of daily life: speak, eat, live, have, go — the engine of every sentence.',
    tip: 'Verbs ending in -o mean "I do it": hablo = I speak, como = I eat, vivo = I live. Spot the pattern!',
    vocab: [
      v('hablo', 'yo hablo', 'I speak', 'yoh AH-bloh', 'Yo hablo un poco de español.', 'I speak a little Spanish.', ['i speak', 'i talk']),
      v('como-verb', 'yo como', 'I eat', 'yoh KOH-moh', 'Yo como pan por la mañana.', 'I eat bread in the morning.', ['i eat']),
      v('vivo', 'yo vivo', 'I live', 'yoh BEE-boh', 'Yo vivo en Londres.', 'I live in London.', ['i live']),
      v('tengo', 'yo tengo', 'I have', 'yoh TEHN-goh', 'Tengo dos hermanos.', 'I have two brothers.', ['i have']),
      v('quiero', 'yo quiero', 'I want', 'yoh KYEH-roh', 'Quiero aprender español.', 'I want to learn Spanish.', ['i want']),
      v('voy', 'yo voy', 'I go', 'yoh BOY', 'Voy al trabajo en tren.', 'I go to work by train.', ['i go', 'i am going']),
      v('estoy', 'yo estoy', 'I am (location/feeling)', 'yoh ehs-TOY', 'Estoy en casa.', 'I am at home.', ['i am']),
      v('trabajo-verb', 'yo trabajo', 'I work', 'yoh trah-BAH-hoh', 'Trabajo en una oficina.', 'I work in an office.', ['i work']),
      v('comer', 'comer', 'to eat', 'koh-MEHR', 'Quiero comer pizza.', 'I want to eat pizza.', ['eat']),
      v('hablar', 'hablar', 'to speak', 'ah-BLAHR', 'Me gusta hablar español.', 'I like to speak Spanish.', ['speak', 'to talk']),
      v('cada-dia', 'cada día', 'every day', 'KAH-dah DEE-ah', 'Estudio español cada día.', 'I study Spanish every day.', ['each day']),
      v('ahora', 'ahora', 'now', 'ah-OH-rah', 'Ahora estoy en casa.', 'Now I am at home.'),
    ],
    sentences: [
      { es: 'Yo hablo un poco de español.', en: 'I speak a little Spanish.', blank: 'hablo' },
      { es: 'Yo vivo en Londres.', en: 'I live in London.', blank: 'vivo' },
      { es: 'Tengo dos hermanos.', en: 'I have two brothers.', blank: 'Tengo' },
      { es: 'Quiero aprender español.', en: 'I want to learn Spanish.', blank: 'Quiero' },
      { es: 'Voy al trabajo en tren.', en: 'I go to work by train.', blank: 'Voy' },
      { es: 'Estudio español cada día.', en: 'I study Spanish every day.', blank: 'cada día' },
    ],
  },
  {
    slug: 'family',
    title: 'Family & People',
    subtitle: 'Talk about the people in your life',
    week: 2,
    order: 2,
    theme: 'family',
    emoji: '👨‍👩‍👧‍👦',
    description: 'Family words plus the phrases to describe them — names, ages, and where they live.',
    tip: 'Words ending in -o are usually masculine (el hermano), -a feminine (la hermana). The article matters!',
    vocab: [
      v('padre', 'el padre', 'father', 'PAH-dreh', 'Mi padre es ingeniero.', 'My father is an engineer.', ['the father', 'dad']),
      v('madre', 'la madre', 'mother', 'MAH-dreh', 'Mi madre es doctora.', 'My mother is a doctor.', ['the mother', 'mum', 'mom']),
      v('hermano', 'el hermano', 'brother', 'ehr-MAH-noh', 'Mi hermano vive en Barcelona.', 'My brother lives in Barcelona.', ['the brother']),
      v('hermana', 'la hermana', 'sister', 'ehr-MAH-nah', 'Mi hermana tiene veinte años.', 'My sister is twenty years old.', ['the sister']),
      v('abuelo', 'el abuelo', 'grandfather', 'ah-BWEH-loh', 'Mi abuelo es muy amable.', 'My grandfather is very kind.', ['the grandfather', 'grandpa']),
      v('abuela', 'la abuela', 'grandmother', 'ah-BWEH-lah', 'Mi abuela vive con nosotros.', 'My grandmother lives with us.', ['the grandmother', 'grandma']),
      v('hijo', 'el hijo', 'son', 'EE-hoh', 'Su hijo tiene cinco años.', 'Their son is five years old.', ['the son']),
      v('hija', 'la hija', 'daughter', 'EE-hah', 'Mi hija se llama Rosa.', 'My daughter is called Rosa.', ['the daughter']),
      v('familia', 'la familia', 'family', 'fah-MEE-lyah', 'Mi familia es pequeña.', 'My family is small.', ['the family']),
      v('se-llama', 'se llama', 'his/her name is', 'seh YAH-mah', 'Mi hermano se llama Carlos.', 'My brother is called Carlos.', ['is called', 'his name is', 'her name is']),
      v('anos', 'tiene… años', 'is… years old', 'TYEH-neh AH-nyohs', 'Ella tiene treinta años.', 'She is thirty years old.', ['years old']),
      v('vive', 'él vive', 'he lives', 'BEE-beh', 'Él vive en Madrid.', 'He lives in Madrid.', ['he lives', 'she lives', 'lives']),
    ],
    sentences: [
      { es: 'Mi padre es ingeniero.', en: 'My father is an engineer.', blank: 'padre' },
      { es: 'Mi hermana tiene veinte años.', en: 'My sister is twenty years old.', blank: 'hermana' },
      { es: 'Mi hermano se llama Carlos.', en: 'My brother is called Carlos.', blank: 'se llama' },
      { es: 'Mi abuela vive con nosotros.', en: 'My grandmother lives with us.', blank: 'abuela' },
      { es: 'Mi familia es pequeña.', en: 'My family is small.', blank: 'familia' },
      { es: 'Ella tiene treinta años.', en: 'She is thirty years old.', blank: 'años' },
    ],
  },
  {
    slug: 'home-food',
    title: 'Home & Food',
    subtitle: 'Your house, your kitchen, your meals',
    week: 3,
    order: 1,
    theme: 'nouns',
    emoji: '🏠',
    description: 'The nouns of everyday life: rooms, food, drinks — plus "hay" (there is) to describe it all.',
    tip: '"Hay" is magic: it means both "there is" AND "there are". ¿Hay café? — Is there coffee?',
    vocab: [
      v('casa', 'la casa', 'house', 'KAH-sah', 'Yo vivo en una casa grande.', 'I live in a big house.', ['the house', 'home']),
      v('cocina', 'la cocina', 'kitchen', 'koh-SEE-nah', 'Mi madre está en la cocina.', 'My mother is in the kitchen.', ['the kitchen']),
      v('mesa', 'la mesa', 'table', 'MEH-sah', 'Hay pan en la mesa.', 'There is bread on the table.', ['the table']),
      v('pan', 'el pan', 'bread', 'PAHN', 'Como pan cada mañana.', 'I eat bread every morning.', ['the bread']),
      v('agua', 'el agua', 'water', 'AH-gwah', 'Un vaso de agua, por favor.', 'A glass of water, please.', ['the water']),
      v('cafe', 'el café', 'coffee', 'kah-FEH', 'El café está caliente.', 'The coffee is hot.', ['the coffee']),
      v('leche', 'la leche', 'milk', 'LEH-cheh', '¿Hay leche? Sí, hay leche.', 'Is there milk? Yes, there is milk.', ['the milk']),
      v('carne', 'la carne', 'meat', 'KAHR-neh', 'Al mediodía como carne.', 'At midday I eat meat.', ['the meat']),
      v('fruta', 'la fruta', 'fruit', 'FROO-tah', 'La fruta es buena.', 'Fruit is good.', ['the fruit']),
      v('hay', 'hay', 'there is / there are', 'AH-ee', 'Hay café en la taza.', 'There is coffee in the cup.', ['there is', 'there are']),
      v('comida', 'la comida', 'food', 'koh-MEE-dah', 'La comida está en la mesa.', 'The food is on the table.', ['the food', 'meal']),
      v('donde-esta', '¿dónde está?', 'where is…?', 'DOHN-deh ehs-TAH', '¿Dónde está la cocina?', 'Where is the kitchen?', ['where is']),
    ],
    sentences: [
      { es: 'Yo vivo en una casa grande.', en: 'I live in a big house.', blank: 'casa' },
      { es: 'Hay pan en la mesa.', en: 'There is bread on the table.', blank: 'Hay' },
      { es: 'Un vaso de agua, por favor.', en: 'A glass of water, please.', blank: 'agua' },
      { es: 'El café está caliente.', en: 'The coffee is hot.', blank: 'café' },
      { es: '¿Dónde está la cocina?', en: 'Where is the kitchen?', blank: 'Dónde está' },
      { es: 'La comida está en la mesa.', en: 'The food is on the table.', blank: 'comida' },
    ],
  },
  {
    slug: 'descriptions',
    title: 'Descriptions & Colors',
    subtitle: 'Make your Spanish colorful',
    week: 3,
    order: 2,
    theme: 'adjectives',
    emoji: '🎨',
    description: 'Adjectives and colors to describe anything — sizes, ages, qualities, and how things look.',
    tip: 'Adjectives come AFTER the noun in Spanish: "la casa grande" = the big house (literally "the house big").',
    vocab: [
      v('grande', 'grande', 'big', 'GRAHN-deh', 'Madrid es una ciudad grande.', 'Madrid is a big city.', ['large']),
      v('pequeno', 'pequeño', 'small', 'peh-KEH-nyoh', 'Mi apartamento es pequeño.', 'My apartment is small.', ['little']),
      v('nuevo', 'nuevo', 'new', 'NWEH-boh', 'Tengo un coche nuevo.', 'I have a new car.'),
      v('viejo', 'viejo', 'old', 'BYEH-hoh', 'El libro es muy viejo.', 'The book is very old.'),
      v('bueno', 'bueno', 'good', 'BWEH-noh', 'El café es muy bueno.', 'The coffee is very good.'),
      v('malo', 'malo', 'bad', 'MAH-loh', 'El tiempo es malo hoy.', 'The weather is bad today.'),
      v('bonito', 'bonito', 'pretty', 'boh-NEE-toh', 'Qué vestido tan bonito.', 'What a pretty dress.', ['beautiful', 'nice']),
      v('rojo', 'rojo', 'red', 'ROH-hoh', 'El coche es rojo.', 'The car is red.'),
      v('azul', 'azul', 'blue', 'ah-SOOL', 'El cielo es azul.', 'The sky is blue.'),
      v('verde', 'verde', 'green', 'BEHR-deh', 'El árbol es verde.', 'The tree is green.'),
      v('caliente', 'caliente', 'hot', 'kah-LYEHN-teh', 'La sopa está caliente.', 'The soup is hot.'),
      v('frio', 'frío', 'cold', 'FREE-oh', 'El agua está fría.', 'The water is cold.'),
    ],
    sentences: [
      { es: 'Madrid es una ciudad grande.', en: 'Madrid is a big city.', blank: 'grande' },
      { es: 'Tengo un coche nuevo.', en: 'I have a new car.', blank: 'nuevo' },
      { es: 'El coche es rojo.', en: 'The car is red.', blank: 'rojo' },
      { es: 'El cielo es azul.', en: 'The sky is blue.', blank: 'azul' },
      { es: 'La sopa está caliente.', en: 'The soup is hot.', blank: 'caliente' },
      { es: 'El café es muy bueno.', en: 'The coffee is very good.', blank: 'bueno' },
    ],
  },
  {
    slug: 'week-review',
    title: 'The Big Review',
    subtitle: 'Prove what you know',
    week: 4,
    order: 1,
    theme: 'review',
    emoji: '🏆',
    description: 'A challenge session mixing everything so far — the words you struggled with come back for revenge.',
    tip: 'Review beats cramming: recalling a word right when you\'re about to forget it is what locks it in forever.',
    vocab: [],
    sentences: [],
    isReview: true,
  },
];

export function getLessonBySlug(slug: string): CurriculumLesson | undefined {
  return curriculum.find((l) => l.slug === slug);
}

/** All vocab across the curriculum, keyed by id */
export function getAllVocab(): VocabItem[] {
  return curriculum.flatMap((l) => l.vocab);
}

export function getVocabById(id: string): VocabItem | undefined {
  return getAllVocab().find((w) => w.id === id);
}

/** Lessons that come before the given lesson (for review material) */
export function getPriorLessons(slug: string): CurriculumLesson[] {
  const idx = curriculum.findIndex((l) => l.slug === slug);
  if (idx <= 0) return [];
  return curriculum.slice(0, idx);
}
