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
    recordWordResult(tracked.id, knewIt, true);
    if (knewIt) recognized += 1;
    else reviewed += 1;
  }
  return { recognized, reviewed };
}
