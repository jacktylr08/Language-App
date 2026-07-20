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

/** A short teaching explanation — the "teacher at the whiteboard" moment. */
export interface GrammarSlide {
  title: string;
  /** Plain text; blank lines separate paragraphs. */
  body: string;
  examples: Array<{ es: string; en: string }>;
}

/** A graded understanding question with a WHY explanation, shown right or wrong. */
export interface ConceptCheck {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface DialogueTurn {
  speaker: string;
  es: string;
  en: string;
}

/** A full sentence the learner assembles from word tiles. */
export interface SentenceBuild {
  es: string;
  en: string;
}

export interface CurriculumLesson {
  slug: string;
  title: string;
  subtitle: string;
  week: number;
  order: number;
  theme:
    | 'phonetics'
    | 'verbs'
    | 'family'
    | 'nouns'
    | 'adjectives'
    | 'review'
    | 'grammar'
    | 'conversation';
  emoji: string;
  description: string;
  /** Tip shown before the lesson starts */
  tip: string;
  vocab: VocabItem[];
  /** Sentences used for fill-in-the-blank exercises. `blank` must appear in `es`. */
  sentences: Array<{ es: string; en: string; blank: string }>;
  /** Teaching slides shown and explained before/while practising */
  grammar?: GrammarSlide[];
  /** Understanding questions with explanations */
  conceptChecks?: ConceptCheck[];
  /** A conversation presented with audio, line by line */
  dialogue?: DialogueTurn[];
  /** Sentences the learner constructs from tiles */
  builds?: SentenceBuild[];
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

  // ================= PHASE 2: WEEKS 5-8 =================

  {
    slug: 'ar-verbs',
    title: 'The -AR Verb Machine',
    subtitle: 'One pattern unlocks hundreds of verbs',
    week: 5,
    order: 1,
    theme: 'grammar',
    emoji: '⚙️',
    description: 'Your first real grammar lesson: how Spanish verbs actually work. Learn one pattern and you can conjugate hundreds of verbs.',
    tip: 'Don\'t memorise sentences — learn the MACHINE. Stem + ending = any verb, any person. It\'s algebra, not memory.',
    grammar: [
      {
        title: 'How Spanish verbs work',
        body: 'Every Spanish verb has two parts: a STEM (the meaning) and an ENDING (who does it).\n\nTake hablar (to speak). Chop off -ar and you get the stem habl-. Now attach the ending for the person:\n\nyo hablo · tú hablas · él/ella habla · nosotros hablamos · ellos hablan\n\nThat -o at the end MEANS "I". That\'s why Spanish speakers drop "yo" — the ending already says it. This exact pattern works for every regular -ar verb in the language.',
        examples: [
          { es: 'yo hablo → hablo', en: 'I speak (the -o ending means "I")' },
          { es: 'tú trabajas', en: 'you work (-as = you)' },
          { es: 'ella estudia', en: 'she studies (-a = he/she)' },
          { es: 'nosotros compramos', en: 'we buy (-amos = we)' },
          { es: 'ellos escuchan', en: 'they listen (-an = they)' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: 'How would you say "she studies"? (estudiar = to study)',
        options: ['estudia', 'estudio', 'estudias', 'estudiamos'],
        correct: 'estudia',
        explanation: 'For él/ella (he/she), take the stem estudi- and add -a. "Estudio" would mean I study, "estudias" you study.',
      },
      {
        question: 'You see the verb "compramos". Who is buying?',
        options: ['we', 'I', 'they', 'you'],
        correct: 'we',
        explanation: 'The ending -amos always means nosotros (we) — even without the word "nosotros". The ending does the work.',
      },
      {
        question: 'Which is correct for "I need a coffee"?',
        options: ['Necesito un café', 'Necesita un café', 'Necesitan un café', 'Necesitas un café'],
        correct: 'Necesito un café',
        explanation: 'The -o ending marks "I". Necesita = he/she needs, necesitas = you need, necesitan = they need.',
      },
    ],
    vocab: [
      v('trabajar', 'trabajar', 'to work', 'trah-bah-HAR', 'Trabajo en una oficina.', 'I work in an office.', ['work']),
      v('estudiar', 'estudiar', 'to study', 'ehs-too-DYAR', 'Ella estudia medicina.', 'She studies medicine.', ['study']),
      v('escuchar', 'escuchar', 'to listen', 'ehs-koo-CHAR', 'Escucho música española.', 'I listen to Spanish music.', ['listen', 'to listen to']),
      v('mirar', 'mirar', 'to watch', 'mee-RAR', 'Miramos la televisión.', 'We watch television.', ['watch', 'to look at', 'to look']),
      v('comprar', 'comprar', 'to buy', 'kohm-PRAR', 'Compro pan en el mercado.', 'I buy bread at the market.', ['buy']),
      v('necesitar', 'necesitar', 'to need', 'neh-seh-see-TAR', 'Necesito un café.', 'I need a coffee.', ['need']),
      v('usar', 'usar', 'to use', 'oo-SAR', 'Uso mi teléfono mucho.', 'I use my phone a lot.', ['use']),
      v('ayudar', 'ayudar', 'to help', 'ah-yoo-DAR', '¿Me ayudas, por favor?', 'Can you help me, please?', ['help']),
      v('cocinar', 'cocinar', 'to cook', 'koh-see-NAR', 'Mi padre cocina muy bien.', 'My father cooks very well.', ['cook']),
      v('bailar', 'bailar', 'to dance', 'bahy-LAR', 'Ellos bailan flamenco.', 'They dance flamenco.', ['dance']),
    ],
    sentences: [
      { es: 'Trabajo en una oficina.', en: 'I work in an office.', blank: 'Trabajo' },
      { es: 'Ella estudia medicina.', en: 'She studies medicine.', blank: 'estudia' },
      { es: 'Compro pan en el mercado.', en: 'I buy bread at the market.', blank: 'Compro' },
      { es: 'Mi padre cocina muy bien.', en: 'My father cooks very well.', blank: 'cocina' },
      { es: 'Ellos bailan flamenco.', en: 'They dance flamenco.', blank: 'bailan' },
    ],
    builds: [
      { es: 'Yo estudio español cada día', en: 'I study Spanish every day' },
      { es: 'Ella trabaja en Madrid', en: 'She works in Madrid' },
      { es: 'Nosotros escuchamos música', en: 'We listen to music' },
      { es: 'Mi madre cocina la comida', en: 'My mother cooks the food' },
    ],
  },
  {
    slug: 'asking-questions',
    title: 'Asking Questions',
    subtitle: 'Qué, quién, dónde, cuándo, por qué',
    week: 5,
    order: 2,
    theme: 'conversation',
    emoji: '❓',
    description: 'Conversations run on questions. Master the question words and you can keep any conversation alive.',
    tip: 'Every Spanish question word wears an accent (qué, dónde, cómo). Without the accent, they\'re different words — que means "that"!',
    grammar: [
      {
        title: 'The question toolkit',
        body: 'Spanish questions are easier than English ones — no helper words like "do/does". Just put the question word first and raise your voice at the end:\n\n¿Dónde vives? — literally "Where you-live?"\n\nThe upside-down ¿ warns you a question is coming. And notice: every question word carries an accent mark. That accent is what makes it a question word.',
        examples: [
          { es: '¿Qué comes?', en: 'What do you eat? (no "do" needed!)' },
          { es: '¿Dónde trabajas?', en: 'Where do you work?' },
          { es: '¿Por qué estudias español?', en: 'Why do you study Spanish?' },
          { es: 'Porque me gusta.', en: 'Because I like it. (porque = because, no accent)' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: 'Someone asks "¿Por qué estudias español?" What are they asking?',
        options: ['Why you study Spanish', 'Where you study Spanish', 'What Spanish you study', 'When you study Spanish'],
        correct: 'Why you study Spanish',
        explanation: '¿Por qué? (two words, with accent) = why. The answer uses porque (one word, no accent) = because. A classic pair!',
      },
      {
        question: 'How do you ask "Where do you live?"',
        options: ['¿Dónde vives?', '¿Cuándo vives?', '¿Qué vives?', '¿Quién vives?'],
        correct: '¿Dónde vives?',
        explanation: 'Dónde = where. No "do" is needed in Spanish — the question word plus the verb is a complete question.',
      },
      {
        question: 'Which word would you use to ask about a PERSON?',
        options: ['quién', 'qué', 'cuándo', 'cuánto'],
        correct: 'quién',
        explanation: 'Quién = who (person), qué = what (thing), cuándo = when (time), cuánto = how much (amount).',
      },
    ],
    vocab: [
      v('que-q', '¿qué?', 'what?', 'KEH', '¿Qué es esto?', 'What is this?', ['what']),
      v('quien', '¿quién?', 'who?', 'KYEHN', '¿Quién es ella?', 'Who is she?', ['who']),
      v('donde-q', '¿dónde?', 'where?', 'DOHN-deh', '¿Dónde vives?', 'Where do you live?', ['where']),
      v('cuando', '¿cuándo?', 'when?', 'KWAHN-doh', '¿Cuándo trabajas?', 'When do you work?', ['when']),
      v('por-que', '¿por qué?', 'why?', 'por KEH', '¿Por qué estudias español?', 'Why do you study Spanish?', ['why']),
      v('como-q', '¿cómo?', 'how?', 'KOH-moh', '¿Cómo estás?', 'How are you?', ['how']),
      v('cuanto', '¿cuánto?', 'how much?', 'KWAHN-toh', '¿Cuánto cuesta?', 'How much does it cost?', ['how much', 'how many']),
      v('cual', '¿cuál?', 'which?', 'KWAHL', '¿Cuál es tu nombre?', 'Which/what is your name?', ['which']),
      v('porque-a', 'porque', 'because', 'por-KEH', 'Estudio porque me gusta.', 'I study because I like it.'),
      v('cuesta', 'cuesta', 'it costs', 'KWEHS-tah', 'El pan cuesta un euro.', 'The bread costs one euro.', ['costs', 'it cost']),
    ],
    sentences: [
      { es: '¿Qué es esto?', en: 'What is this?', blank: 'Qué' },
      { es: '¿Dónde vives?', en: 'Where do you live?', blank: 'Dónde' },
      { es: '¿Cuánto cuesta?', en: 'How much does it cost?', blank: 'Cuánto' },
      { es: 'Estudio porque me gusta.', en: 'I study because I like it.', blank: 'porque' },
      { es: '¿Quién es ella?', en: 'Who is she?', blank: 'Quién' },
    ],
    builds: [
      { es: '¿Dónde está mi café?', en: 'Where is my coffee?' },
      { es: '¿Por qué trabajas mucho?', en: 'Why do you work a lot?' },
      { es: '¿Cuándo comes por la mañana?', en: 'When do you eat in the morning?' },
      { es: '¿Quién es tu hermano?', en: 'Who is your brother?' },
    ],
  },
  {
    slug: 'er-ir-verbs',
    title: '-ER & -IR Verbs',
    subtitle: 'Complete the verb machine',
    week: 6,
    order: 1,
    theme: 'grammar',
    emoji: '🔧',
    description: 'The other two verb families. Same machine, slightly different endings — and now you can conjugate almost any regular verb in Spanish.',
    tip: '-ER and -IR verbs are near-twins: their endings only differ for "we" (comemos vs vivimos). Learn them as one family with one exception.',
    grammar: [
      {
        title: 'The other two families',
        body: 'Spanish has three verb families: -ar, -er, -ir. You already own -ar. The other two work identically — chop the ending, add the person:\n\ncomer (to eat): como, comes, come, comemos, comen\nvivir (to live): vivo, vives, vive, vivimos, viven\n\nLook closely: -er and -ir endings are THE SAME except for "we": comEmos but vivImos. One letter. That\'s the whole difference.',
        examples: [
          { es: 'yo leo', en: 'I read (leer)' },
          { es: 'tú bebes', en: 'you drink (beber)' },
          { es: 'él escribe', en: 'he writes (escribir)' },
          { es: 'nosotros comemos', en: 'we eat (-er → -emos)' },
          { es: 'nosotros vivimos', en: 'we live (-ir → -imos)' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: '"Aprendemos español." Who is learning?',
        options: ['we', 'they', 'I', 'she'],
        correct: 'we',
        explanation: '-emos is the "we" ending for -er verbs (aprender). Aprenden = they learn, aprendo = I learn, aprende = she learns.',
      },
      {
        question: 'How do you say "we live" (vivir)?',
        options: ['vivimos', 'vivemos', 'vivamos', 'viven'],
        correct: 'vivimos',
        explanation: '-ir verbs use -imos for "we" — the one place they differ from -er verbs (comemos but vivimos).',
      },
      {
        question: 'Which verb form completes: "Ella ___ un libro" (to read)',
        options: ['lee', 'leo', 'lees', 'leemos'],
        correct: 'lee',
        explanation: 'For él/ella, -er verbs end in -e: ella lee (she reads). Leo = I read, lees = you read.',
      },
    ],
    vocab: [
      v('beber', 'beber', 'to drink', 'beh-BEHR', 'Bebo café por la mañana.', 'I drink coffee in the morning.', ['drink']),
      v('leer', 'leer', 'to read', 'leh-EHR', 'Leo un libro cada semana.', 'I read a book every week.', ['read']),
      v('aprender', 'aprender', 'to learn', 'ah-prehn-DEHR', 'Aprendemos español juntos.', 'We learn Spanish together.', ['learn']),
      v('comprender', 'comprender', 'to understand', 'kohm-prehn-DEHR', 'No comprendo la pregunta.', 'I don\'t understand the question.', ['understand']),
      v('escribir', 'escribir', 'to write', 'ehs-kree-BEER', 'Escribo mensajes a mi familia.', 'I write messages to my family.', ['write']),
      v('abrir', 'abrir', 'to open', 'ah-BREER', 'Abro la ventana.', 'I open the window.', ['open']),
      v('vender', 'vender', 'to sell', 'behn-DEHR', 'Venden fruta en el mercado.', 'They sell fruit at the market.', ['sell']),
      v('correr', 'correr', 'to run', 'koh-RREHR', 'Corro por el parque.', 'I run through the park.', ['run']),
      v('libro', 'el libro', 'book', 'LEE-broh', 'El libro es interesante.', 'The book is interesting.', ['the book']),
      v('semana', 'la semana', 'week', 'seh-MAH-nah', 'Trabajo cinco días a la semana.', 'I work five days a week.', ['the week']),
    ],
    sentences: [
      { es: 'Bebo café por la mañana.', en: 'I drink coffee in the morning.', blank: 'Bebo' },
      { es: 'Leo un libro cada semana.', en: 'I read a book every week.', blank: 'Leo' },
      { es: 'Aprendemos español juntos.', en: 'We learn Spanish together.', blank: 'Aprendemos' },
      { es: 'Escribo mensajes a mi familia.', en: 'I write messages to my family.', blank: 'Escribo' },
      { es: 'Venden fruta en el mercado.', en: 'They sell fruit at the market.', blank: 'Venden' },
    ],
    builds: [
      { es: 'Yo leo un libro nuevo', en: 'I read a new book' },
      { es: 'Nosotros aprendemos mucho', en: 'We learn a lot' },
      { es: 'Ella escribe a su madre', en: 'She writes to her mother' },
      { es: 'No comprendo la pregunta', en: 'I don\'t understand the question' },
    ],
  },
  {
    slug: 'ser-vs-estar',
    title: 'Ser vs Estar',
    subtitle: 'The two faces of "to be"',
    week: 6,
    order: 2,
    theme: 'grammar',
    emoji: '⚖️',
    description: 'The most famous puzzle in Spanish: two verbs both meaning "to be". This lesson makes the difference click — permanently.',
    tip: 'Rough rule: SER = what something IS (identity). ESTAR = how or where something is RIGHT NOW (state & location).',
    grammar: [
      {
        title: 'Two verbs, one job — split in half',
        body: 'English uses "to be" for everything. Spanish splits the job between two verbs:\n\nSER = essence. What something fundamentally IS: identity, origin, profession, personality.\nsoy, eres, es, somos, son\n\nESTAR = state. How or where something is right now: feelings, conditions, locations.\nestoy, estás, está, estamos, están\n\n"Soy feliz" = I\'m a happy person (that\'s who I am).\n"Estoy feliz" = I\'m feeling happy (right now).\nSame words in English — different meanings in Spanish.',
        examples: [
          { es: 'Soy inglés.', en: 'I am English. (origin — ser)' },
          { es: 'Ella es doctora.', en: 'She is a doctor. (profession — ser)' },
          { es: 'Estoy cansado.', en: 'I am tired. (current state — estar)' },
          { es: 'El café está frío.', en: 'The coffee is cold. (condition — estar)' },
        ],
      },
      {
        title: 'The location trap',
        body: 'Here\'s the counterintuitive part: LOCATION always uses estar — even for things that never move.\n\n"Madrid está en España." Madrid isn\'t going anywhere, but location is estar\'s job, full stop.\n\nThink of it this way: ser tells you WHAT a thing is, estar tells you WHERE and HOW it is. A building\'s address isn\'t part of its identity.',
        examples: [
          { es: 'Madrid está en España.', en: 'Madrid is in Spain. (location — always estar)' },
          { es: '¿Dónde estás?', en: 'Where are you? (location — estar)' },
          { es: 'El banco está cerca.', en: 'The bank is nearby. (location — estar)' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: '"Yo ___ cansado." (I am tired)',
        options: ['estoy', 'soy', 'es', 'está'],
        correct: 'estoy',
        explanation: 'Tiredness is a temporary state — how you are right now — so it takes estar. "Soy cansado" would oddly claim tiredness as your identity.',
      },
      {
        question: '"Mi madre ___ doctora." (My mother is a doctor)',
        options: ['es', 'está', 'estoy', 'estamos'],
        correct: 'es',
        explanation: 'Professions are part of identity — what someone IS — so they take ser. Está would suggest being a doctor is a passing mood!',
      },
      {
        question: '"El supermercado ___ en la calle Mayor." (The supermarket is on Mayor street)',
        options: ['está', 'es', 'son', 'eres'],
        correct: 'está',
        explanation: 'The trap! Location ALWAYS uses estar, even for buildings that never move. Where something is ≠ what something is.',
      },
      {
        question: 'What\'s the difference between "es aburrido" and "está aburrido"?',
        options: ['he is boring vs he is bored', 'he is bored vs he is boring', 'no difference', 'both mean he is bored'],
        correct: 'he is boring vs he is bored',
        explanation: 'Ser = identity: es aburrido, he IS a boring person. Estar = state: está aburrido, he FEELS bored right now. The verb changes the meaning!',
      },
    ],
    vocab: [
      v('estoy-v', 'estoy', 'I am (state)', 'ehs-TOY', 'Estoy muy cansado hoy.', 'I am very tired today.', ['i am']),
      v('estas-v', 'estás', 'you are (state)', 'ehs-TAHS', '¿Cómo estás?', 'How are you?', ['you are']),
      v('esta-v', 'está', 'he/she/it is (state)', 'ehs-TAH', 'El café está caliente.', 'The coffee is hot.', ['he is', 'she is', 'it is']),
      v('estamos-v', 'estamos', 'we are (state)', 'ehs-TAH-mohs', 'Estamos en casa.', 'We are at home.', ['we are']),
      v('cansado', 'cansado', 'tired', 'kahn-SAH-doh', 'Estoy cansado después del trabajo.', 'I am tired after work.'),
      v('feliz', 'feliz', 'happy', 'feh-LEES', 'Estoy feliz hoy.', 'I am happy today.'),
      v('triste', 'triste', 'sad', 'TREES-teh', 'Ella está triste.', 'She is sad.'),
      v('enfermo', 'enfermo', 'sick', 'ehn-FEHR-moh', 'Mi hermano está enfermo.', 'My brother is sick.', ['ill']),
      v('ocupado', 'ocupado', 'busy', 'oh-koo-PAH-doh', 'Estoy ocupado ahora.', 'I am busy now.'),
      v('listo', 'listo', 'ready', 'LEES-toh', '¿Estás listo? Sí, estoy listo.', 'Are you ready? Yes, I\'m ready.'),
    ],
    sentences: [
      { es: 'Estoy muy cansado hoy.', en: 'I am very tired today.', blank: 'Estoy' },
      { es: 'El café está caliente.', en: 'The coffee is hot.', blank: 'está' },
      { es: 'Mi hermano está enfermo.', en: 'My brother is sick.', blank: 'enfermo' },
      { es: 'Estamos en casa.', en: 'We are at home.', blank: 'Estamos' },
      { es: 'Estoy ocupado ahora.', en: 'I am busy now.', blank: 'ocupado' },
    ],
    builds: [
      { es: 'Estoy muy cansado hoy', en: 'I am very tired today' },
      { es: 'Mi madre es doctora', en: 'My mother is a doctor' },
      { es: 'El banco está en la calle Mayor', en: 'The bank is on Mayor street' },
      { es: 'Nosotros estamos felices', en: 'We are happy' },
    ],
  },
  {
    slug: 'numbers-time',
    title: 'Numbers & Time',
    subtitle: 'Count, and tell the time',
    week: 7,
    order: 1,
    theme: 'nouns',
    emoji: '🕐',
    description: 'Numbers 1-10 and how to tell the time — the skill you\'ll use at every train station, café and meeting in Spain.',
    tip: 'Time uses SON (plural) because hours are plural: son las dos, son las tres. The only exception is one o\'clock: ES la una.',
    grammar: [
      {
        title: 'Telling the time',
        body: 'Ask the time with ¿Qué hora es? The answer pattern:\n\nSon las + number: Son las tres = It\'s three o\'clock.\n\nOne exception: 1 o\'clock is singular → Es la una.\n\nAdd minutes with y: Son las tres y diez (3:10). Half past = y media. Quarter past = y cuarto.',
        examples: [
          { es: '¿Qué hora es?', en: 'What time is it?' },
          { es: 'Son las dos.', en: 'It\'s two o\'clock.' },
          { es: 'Es la una.', en: 'It\'s one o\'clock. (the only "es"!)' },
          { es: 'Son las cinco y media.', en: 'It\'s half past five.' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: 'How do you say "It\'s three o\'clock"?',
        options: ['Son las tres', 'Es las tres', 'Está las tres', 'Son la tres'],
        correct: 'Son las tres',
        explanation: 'Hours are plural in Spanish (three hours\' worth!), so use son las. "Es la" only appears for one o\'clock: es la una.',
      },
      {
        question: 'How do you say "It\'s one o\'clock"?',
        options: ['Es la una', 'Son las una', 'Es las una', 'Son la una'],
        correct: 'Es la una',
        explanation: 'One is singular, so it takes es la — the single exception to the "son las" pattern.',
      },
      {
        question: '"Son las cuatro y media" means:',
        options: ['4:30', '4:15', '3:30', '4:45'],
        correct: '4:30',
        explanation: 'Y media = "and a half" = half past. Y cuarto would be quarter past (4:15).',
      },
    ],
    vocab: [
      v('uno', 'uno', 'one', 'OO-noh', 'Tengo uno.', 'I have one.', ['1']),
      v('dos', 'dos', 'two', 'DOHS', 'Dos cafés, por favor.', 'Two coffees, please.', ['2']),
      v('tres', 'tres', 'three', 'TREHS', 'Son las tres.', 'It\'s three o\'clock.', ['3']),
      v('cuatro', 'cuatro', 'four', 'KWAH-troh', 'Hay cuatro sillas.', 'There are four chairs.', ['4']),
      v('cinco', 'cinco', 'five', 'SEEN-koh', 'Trabajo cinco días.', 'I work five days.', ['5']),
      v('seis', 'seis', 'six', 'SEHYS', 'Son las seis y media.', 'It\'s half past six.', ['6']),
      v('siete', 'siete', 'seven', 'SYEH-teh', 'Me despierto a las siete.', 'I wake up at seven.', ['7']),
      v('ocho', 'ocho', 'eight', 'OH-choh', 'La tienda abre a las ocho.', 'The shop opens at eight.', ['8']),
      v('nueve', 'nueve', 'nine', 'NWEH-beh', 'Trabajo a las nueve.', 'I work at nine.', ['9']),
      v('diez', 'diez', 'ten', 'DYEHS', 'Son las diez de la noche.', 'It\'s ten at night.', ['10']),
      v('que-hora', '¿qué hora es?', 'what time is it?', 'keh OH-rah ehs', '¿Qué hora es? Son las dos.', 'What time is it? It\'s two o\'clock.', ['what time is it']),
      v('y-media', 'y media', 'half past', 'ee MEH-dyah', 'Son las cinco y media.', 'It\'s half past five.', ['thirty', 'and a half']),
    ],
    sentences: [
      { es: 'Dos cafés, por favor.', en: 'Two coffees, please.', blank: 'Dos' },
      { es: 'Son las cinco y media.', en: 'It\'s half past five.', blank: 'y media' },
      { es: 'Me despierto a las siete.', en: 'I wake up at seven.', blank: 'siete' },
      { es: 'La tienda abre a las ocho.', en: 'The shop opens at eight.', blank: 'ocho' },
      { es: '¿Qué hora es?', en: 'What time is it?', blank: 'hora' },
    ],
    builds: [
      { es: 'Son las tres y media', en: 'It\'s half past three' },
      { es: 'Tengo dos hermanos y una hermana', en: 'I have two brothers and one sister' },
      { es: 'Trabajo cinco días a la semana', en: 'I work five days a week' },
      { es: '¿Qué hora es ahora?', en: 'What time is it now?' },
    ],
  },
  {
    slug: 'restaurant',
    title: 'At the Restaurant',
    subtitle: 'Order like a local',
    week: 7,
    order: 2,
    theme: 'conversation',
    emoji: '🥘',
    description: 'Your first real conversation: ordering in a Spanish restaurant, from getting a table to paying the bill.',
    tip: 'Quisiera ("I would like") is your politeness superpower. Quiero = I want (a bit blunt). Quisiera = I\'d like (polite). Waiters notice.',
    grammar: [
      {
        title: 'Polite ordering',
        body: 'In a restaurant, three phrases do 90% of the work:\n\nQuisiera… = I would like… (the polite way to order anything)\nPara mí… = For me… (when the waiter goes round the table)\nLa cuenta, por favor = The bill, please\n\nQuiero (I want) is grammatically fine but direct — like saying "give me". Quisiera is the version that gets you a smile.',
        examples: [
          { es: 'Quisiera una mesa para dos.', en: 'I\'d like a table for two.' },
          { es: 'Para mí, la paella.', en: 'For me, the paella.' },
          { es: 'La cuenta, por favor.', en: 'The bill, please.' },
        ],
      },
    ],
    dialogue: [
      { speaker: 'Camarero', es: 'Buenas tardes. ¿Qué desean?', en: 'Good afternoon. What would you like?' },
      { speaker: 'Tú', es: 'Quisiera una mesa para dos, por favor.', en: 'I\'d like a table for two, please.' },
      { speaker: 'Camarero', es: 'Perfecto. ¿Qué quieren beber?', en: 'Perfect. What would you like to drink?' },
      { speaker: 'Tú', es: 'Una botella de agua y dos cafés, por favor.', en: 'A bottle of water and two coffees, please.' },
      { speaker: 'Camarero', es: '¿Y para comer?', en: 'And to eat?' },
      { speaker: 'Tú', es: 'Para mí, la paella. Está muy buena aquí, ¿no?', en: 'For me, the paella. It\'s very good here, right?' },
      { speaker: 'Camarero', es: 'Sí, es la especialidad de la casa.', en: 'Yes, it\'s the house speciality.' },
      { speaker: 'Tú', es: 'La cuenta, por favor.', en: 'The bill, please.' },
    ],
    conceptChecks: [
      {
        question: 'What\'s the polite way to order a coffee?',
        options: ['Quisiera un café, por favor', 'Dame un café', 'Quiero café ahora', 'Café'],
        correct: 'Quisiera un café, por favor',
        explanation: 'Quisiera + por favor is the polite formula. "Dame" (give me) and bare "quiero" sound demanding to Spanish ears.',
      },
      {
        question: 'The waiter asks "¿Y para comer?" — what do they want to know?',
        options: ['What you want to eat', 'What you want to drink', 'If you want the bill', 'If you liked the food'],
        correct: 'What you want to eat',
        explanation: 'Para comer = "to eat". Earlier they asked ¿qué quieren beber? — to drink. Listen for comer vs beber!',
      },
      {
        question: 'How do you ask for the bill?',
        options: ['La cuenta, por favor', 'El cuento, por favor', 'La mesa, por favor', 'El menú, por favor'],
        correct: 'La cuenta, por favor',
        explanation: 'La cuenta = the bill. Watch out: el cuento means "the story" — ask for that and you might get a fairy tale.',
      },
    ],
    vocab: [
      v('camarero', 'el camarero', 'waiter', 'kah-mah-REH-roh', 'El camarero es muy amable.', 'The waiter is very kind.', ['the waiter']),
      v('cuenta', 'la cuenta', 'bill', 'KWEHN-tah', 'La cuenta, por favor.', 'The bill, please.', ['the bill', 'check', 'the check']),
      v('menu', 'el menú', 'menu', 'meh-NOO', '¿Me trae el menú?', 'Could you bring me the menu?', ['the menu']),
      v('quisiera', 'quisiera', 'I would like', 'kee-SYEH-rah', 'Quisiera una mesa para dos.', 'I would like a table for two.', ['i would like', 'id like']),
      v('botella', 'la botella', 'bottle', 'boh-TEH-yah', 'Una botella de agua, por favor.', 'A bottle of water, please.', ['the bottle']),
      v('vaso', 'el vaso', 'glass', 'BAH-soh', 'Un vaso de vino tinto.', 'A glass of red wine.', ['the glass']),
      v('paella', 'la paella', 'paella', 'pah-EH-yah', 'La paella es la especialidad.', 'Paella is the speciality.', ['the paella']),
      v('para-mi', 'para mí', 'for me', 'PAH-rah MEE', 'Para mí, el pescado.', 'For me, the fish.', ['for me']),
      v('pescado', 'el pescado', 'fish (food)', 'pehs-KAH-doh', 'El pescado está muy bueno.', 'The fish is very good.', ['the fish', 'fish']),
      v('pollo', 'el pollo', 'chicken', 'POH-yoh', 'El pollo con verduras.', 'The chicken with vegetables.', ['the chicken']),
      v('vino', 'el vino', 'wine', 'BEE-noh', 'Un vaso de vino, por favor.', 'A glass of wine, please.', ['the wine']),
      v('rico', 'rico', 'delicious', 'RREE-koh', '¡Qué rico está esto!', 'This is so delicious!', ['tasty', 'yummy']),
    ],
    sentences: [
      { es: 'La cuenta, por favor.', en: 'The bill, please.', blank: 'cuenta' },
      { es: 'Quisiera una mesa para dos.', en: 'I would like a table for two.', blank: 'Quisiera' },
      { es: 'Una botella de agua, por favor.', en: 'A bottle of water, please.', blank: 'botella' },
      { es: 'Para mí, el pescado.', en: 'For me, the fish.', blank: 'Para mí' },
      { es: 'El pollo con verduras.', en: 'The chicken with vegetables.', blank: 'pollo' },
    ],
    builds: [
      { es: 'Quisiera un café con leche', en: 'I would like a coffee with milk' },
      { es: 'Una mesa para dos por favor', en: 'A table for two please' },
      { es: 'Para mí la paella', en: 'For me, the paella' },
      { es: 'La cuenta por favor', en: 'The bill, please' },
    ],
  },
  {
    slug: 'places-directions',
    title: 'Places & Directions',
    subtitle: 'Never get lost in Spain',
    week: 8,
    order: 1,
    theme: 'nouns',
    emoji: '🗺️',
    description: 'The city around you: places you\'ll actually visit, and how to ask for (and understand!) directions.',
    tip: 'Directions come at you fast in real life. The three you must catch: derecha (right), izquierda (left), todo recto (straight on).',
    grammar: [
      {
        title: 'Asking and understanding directions',
        body: 'The formula for asking: ¿Dónde está + place? (Remember: location = estar, always.)\n\nThe answers you\'ll hear:\na la derecha = on the right\na la izquierda = on the left\ntodo recto = straight ahead\ncerca / lejos = near / far\n\nPro move: repeat the direction back — "¿A la derecha? Gracias." You confirm it AND practise it.',
        examples: [
          { es: '¿Dónde está la estación?', en: 'Where is the station?' },
          { es: 'Está a la derecha.', en: 'It\'s on the right.' },
          { es: 'Todo recto y a la izquierda.', en: 'Straight on, then on the left.' },
          { es: 'Está cerca de aquí.', en: 'It\'s near here.' },
        ],
      },
    ],
    conceptChecks: [
      {
        question: 'Someone says "El banco está a la izquierda." Where\'s the bank?',
        options: ['on the left', 'on the right', 'straight ahead', 'far away'],
        correct: 'on the left',
        explanation: 'Izquierda = left, derecha = right. These two are easy to mix up under pressure — drill them until they\'re automatic.',
      },
      {
        question: 'How do you ask where the station is?',
        options: ['¿Dónde está la estación?', '¿Dónde es la estación?', '¿Qué está la estación?', '¿Cuándo está la estación?'],
        correct: '¿Dónde está la estación?',
        explanation: 'Location always takes estar — ¿dónde ESTÁ? "¿Dónde es?" is the classic ser/estar mistake. (Remember the location trap!)',
      },
      {
        question: '"Está lejos" means the place is:',
        options: ['far away', 'nearby', 'closed', 'on the corner'],
        correct: 'far away',
        explanation: 'Lejos = far, cerca = near. If it\'s lejos, you might want un taxi.',
      },
    ],
    vocab: [
      v('calle', 'la calle', 'street', 'KAH-yeh', 'Vivo en la calle Mayor.', 'I live on Mayor street.', ['the street']),
      v('ciudad', 'la ciudad', 'city', 'syoo-DAHD', 'Madrid es una ciudad grande.', 'Madrid is a big city.', ['the city']),
      v('banco', 'el banco', 'bank', 'BAHN-koh', 'El banco está cerrado.', 'The bank is closed.', ['the bank']),
      v('tienda', 'la tienda', 'shop', 'TYEHN-dah', 'La tienda abre a las diez.', 'The shop opens at ten.', ['the shop', 'store']),
      v('mercado', 'el mercado', 'market', 'mehr-KAH-doh', 'Compro fruta en el mercado.', 'I buy fruit at the market.', ['the market']),
      v('estacion', 'la estación', 'station', 'ehs-tah-SYOHN', '¿Dónde está la estación?', 'Where is the station?', ['the station']),
      v('cerca', 'cerca', 'near', 'SEHR-kah', 'El hotel está cerca.', 'The hotel is near.', ['nearby', 'close']),
      v('lejos', 'lejos', 'far', 'LEH-hohs', 'El aeropuerto está lejos.', 'The airport is far.', ['far away']),
      v('derecha', 'a la derecha', 'on the right', 'ah lah deh-REH-chah', 'El banco está a la derecha.', 'The bank is on the right.', ['right', 'to the right']),
      v('izquierda', 'a la izquierda', 'on the left', 'ah lah ees-KYEHR-dah', 'La tienda está a la izquierda.', 'The shop is on the left.', ['left', 'to the left']),
      v('todo-recto', 'todo recto', 'straight ahead', 'TOH-doh RREHK-toh', 'Sigue todo recto.', 'Continue straight ahead.', ['straight on', 'straight']),
      v('aqui', 'aquí', 'here', 'ah-KEE', 'Está cerca de aquí.', 'It\'s near here.', ['here']),
    ],
    sentences: [
      { es: 'Vivo en la calle Mayor.', en: 'I live on Mayor street.', blank: 'calle' },
      { es: 'El banco está a la derecha.', en: 'The bank is on the right.', blank: 'a la derecha' },
      { es: 'La tienda está a la izquierda.', en: 'The shop is on the left.', blank: 'a la izquierda' },
      { es: '¿Dónde está la estación?', en: 'Where is the station?', blank: 'estación' },
      { es: 'Está cerca de aquí.', en: 'It\'s near here.', blank: 'cerca' },
    ],
    builds: [
      { es: '¿Dónde está el mercado?', en: 'Where is the market?' },
      { es: 'El banco está cerca de aquí', en: 'The bank is near here' },
      { es: 'La estación está a la derecha', en: 'The station is on the right' },
      { es: 'Sigue todo recto por la calle', en: 'Continue straight along the street' },
    ],
  },
  {
    slug: 'phase2-review',
    title: 'The Big Review II',
    subtitle: 'Everything from Weeks 1-8',
    week: 8,
    order: 2,
    theme: 'review',
    emoji: '🎓',
    description: 'The graduation exam for your first two months — an adaptive session built from every word you\'ve struggled with.',
    tip: 'If you clear this with 90%+, you genuinely know ~150 Spanish words and the core grammar. That\'s conversational bedrock.',
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
