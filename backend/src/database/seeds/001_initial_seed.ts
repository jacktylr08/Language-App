import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Idempotent: skip entirely if lessons already exist.
  // Seed 002 (Phase 1) handles migrating old data to the new curriculum.
  const [{ count }] = await knex('lessons').count('id as count');
  if (Number(count) > 0) {
    console.log(`Seed 001 skipped: ${count} lessons already exist`);
    return;
  }

  console.log('Seed 001: populating initial vocabulary and lessons...');

  // ---------------------------------------------------------------------------
  // Vocabulary (70 most frequent Spanish words)
  // ---------------------------------------------------------------------------
  const vocabulary = [
    // Articles & Pronouns
    { spanish: 'el', english: ['the'], part_of_speech: 'article', frequency_rank: 1, ipa_pronunciation: 'el', example_sentence_spanish: 'El gato es grande.', example_sentence_english: 'The cat is big.', category: 'article_definite' },
    { spanish: 'la', english: ['the'], part_of_speech: 'article', frequency_rank: 2, ipa_pronunciation: 'la', example_sentence_spanish: 'La casa es bonita.', example_sentence_english: 'The house is pretty.', category: 'article_definite' },
    { spanish: 'de', english: ['of', 'from'], part_of_speech: 'preposition', frequency_rank: 3, ipa_pronunciation: 'de', example_sentence_spanish: 'La casa de mi amigo.', example_sentence_english: 'My friend\'s house.', category: 'preposition' },
    { spanish: 'que', english: ['that', 'which'], part_of_speech: 'conjunction', frequency_rank: 4, ipa_pronunciation: 'ke', example_sentence_spanish: 'Creo que es verdad.', example_sentence_english: 'I think that is true.', category: 'conjunction' },
    { spanish: 'y', english: ['and'], part_of_speech: 'conjunction', frequency_rank: 5, ipa_pronunciation: 'i', example_sentence_spanish: 'Pan y agua.', example_sentence_english: 'Bread and water.', category: 'conjunction' },
    { spanish: 'a', english: ['to', 'at'], part_of_speech: 'preposition', frequency_rank: 6, ipa_pronunciation: 'a', example_sentence_spanish: 'Voy a la tienda.', example_sentence_english: 'I go to the store.', category: 'preposition' },
    { spanish: 'en', english: ['in', 'on'], part_of_speech: 'preposition', frequency_rank: 7, ipa_pronunciation: 'en', example_sentence_spanish: 'Está en la mesa.', example_sentence_english: 'It\'s on the table.', category: 'preposition' },
    { spanish: 'un', english: ['a', 'an'], part_of_speech: 'article', frequency_rank: 8, ipa_pronunciation: 'oon', example_sentence_spanish: 'Tengo un gato.', example_sentence_english: 'I have a cat.', category: 'article_indefinite' },
    { spanish: 'una', english: ['a', 'an'], part_of_speech: 'article', frequency_rank: 9, ipa_pronunciation: 'OO-na', example_sentence_spanish: 'Tengo una casa.', example_sentence_english: 'I have a house.', category: 'article_indefinite' },
    { spanish: 'yo', english: ['I'], part_of_speech: 'pronoun', frequency_rank: 10, ipa_pronunciation: 'yo', example_sentence_spanish: 'Yo soy María.', example_sentence_english: 'I am María.', category: 'pronoun_personal' },
    { spanish: 'tú', english: ['you'], part_of_speech: 'pronoun', frequency_rank: 11, ipa_pronunciation: 'too', example_sentence_spanish: 'Tú eres inteligente.', example_sentence_english: 'You are intelligent.', category: 'pronoun_personal' },
    { spanish: 'él', english: ['he', 'him'], part_of_speech: 'pronoun', frequency_rank: 12, ipa_pronunciation: 'el', example_sentence_spanish: 'Él es mi amigo.', example_sentence_english: 'He is my friend.', category: 'pronoun_personal' },
    { spanish: 'ella', english: ['she', 'her'], part_of_speech: 'pronoun', frequency_rank: 13, ipa_pronunciation: 'EH-ya', example_sentence_spanish: 'Ella es doctora.', example_sentence_english: 'She is a doctor.', category: 'pronoun_personal' },
    { spanish: 'nosotros', english: ['we'], part_of_speech: 'pronoun', frequency_rank: 14, ipa_pronunciation: 'no-SO-tros', example_sentence_spanish: 'Nosotros somos amigos.', example_sentence_english: 'We are friends.', category: 'pronoun_personal' },
    { spanish: 'ellos', english: ['they'], part_of_speech: 'pronoun', frequency_rank: 15, ipa_pronunciation: 'EH-yos', example_sentence_spanish: 'Ellos son estudiantes.', example_sentence_english: 'They are students.', category: 'pronoun_personal' },
    { spanish: 'mi', english: ['my'], part_of_speech: 'possessive', frequency_rank: 16, ipa_pronunciation: 'mee', example_sentence_spanish: 'Mi casa es grande.', example_sentence_english: 'My house is big.', category: 'possessive' },
    { spanish: 'su', english: ['his', 'her', 'their'], part_of_speech: 'possessive', frequency_rank: 17, ipa_pronunciation: 'soo', example_sentence_spanish: 'Su coche es nuevo.', example_sentence_english: 'His car is new.', category: 'possessive' },

    // Common Verbs
    { spanish: 'ser', english: ['to be (permanent)'], part_of_speech: 'verb', frequency_rank: 18, ipa_pronunciation: 'ser', example_sentence_spanish: 'Yo soy ingeniero.', example_sentence_english: 'I am an engineer.', category: 'verb_conjugation' },
    { spanish: 'estar', english: ['to be (location)'], part_of_speech: 'verb', frequency_rank: 19, ipa_pronunciation: 'es-TAR', example_sentence_spanish: 'Estoy en la oficina.', example_sentence_english: 'I am at the office.', category: 'verb_conjugation' },
    { spanish: 'haber', english: ['to have (auxiliary)'], part_of_speech: 'verb', frequency_rank: 20, ipa_pronunciation: 'a-BER', example_sentence_spanish: 'He comido bien.', example_sentence_english: 'I have eaten well.', category: 'verb_conjugation' },
    { spanish: 'tener', english: ['to have'], part_of_speech: 'verb', frequency_rank: 21, ipa_pronunciation: 'te-NER', example_sentence_spanish: 'Tengo dos hermanos.', example_sentence_english: 'I have two brothers.', category: 'verb_conjugation' },
    { spanish: 'hacer', english: ['to do', 'to make'], part_of_speech: 'verb', frequency_rank: 22, ipa_pronunciation: 'a-SER', example_sentence_spanish: 'Hago mi tarea.', example_sentence_english: 'I do my homework.', category: 'verb_conjugation' },
    { spanish: 'ir', english: ['to go'], part_of_speech: 'verb', frequency_rank: 23, ipa_pronunciation: 'eer', example_sentence_spanish: 'Voy al parque.', example_sentence_english: 'I go to the park.', category: 'verb_conjugation' },
    { spanish: 'poder', english: ['can', 'to be able to'], part_of_speech: 'verb', frequency_rank: 24, ipa_pronunciation: 'po-DER', example_sentence_spanish: 'Puedo hablar español.', example_sentence_english: 'I can speak Spanish.', category: 'verb_conjugation' },
    { spanish: 'decir', english: ['to say', 'to tell'], part_of_speech: 'verb', frequency_rank: 25, ipa_pronunciation: 'de-SIR', example_sentence_spanish: 'Digo la verdad.', example_sentence_english: 'I tell the truth.', category: 'verb_conjugation' },
    { spanish: 'dar', english: ['to give'], part_of_speech: 'verb', frequency_rank: 26, ipa_pronunciation: 'dar', example_sentence_spanish: 'Te doy un regalo.', example_sentence_english: 'I give you a gift.', category: 'verb_conjugation' },
    { spanish: 'saber', english: ['to know'], part_of_speech: 'verb', frequency_rank: 27, ipa_pronunciation: 'sa-BER', example_sentence_spanish: 'Sé hablar inglés.', example_sentence_english: 'I know how to speak English.', category: 'verb_conjugation' },
    { spanish: 'querer', english: ['to want', 'to love'], part_of_speech: 'verb', frequency_rank: 28, ipa_pronunciation: 'ke-RER', example_sentence_spanish: 'Quiero café.', example_sentence_english: 'I want coffee.', category: 'verb_conjugation' },
    { spanish: 'llegar', english: ['to arrive'], part_of_speech: 'verb', frequency_rank: 29, ipa_pronunciation: 'ye-GAR', example_sentence_spanish: 'Llego a las 9.', example_sentence_english: 'I arrive at 9.', category: 'verb_conjugation' },
    { spanish: 'parecer', english: ['to seem', 'to appear'], part_of_speech: 'verb', frequency_rank: 30, ipa_pronunciation: 'pa-re-SER', example_sentence_spanish: 'Me parece bien.', example_sentence_english: 'It seems good to me.', category: 'verb_conjugation' },

    // Common Nouns
    { spanish: 'hombre', english: ['man'], part_of_speech: 'noun', frequency_rank: 31, ipa_pronunciation: 'OM-bre', example_sentence_spanish: 'El hombre es alto.', example_sentence_english: 'The man is tall.', category: 'noun_person' },
    { spanish: 'mujer', english: ['woman'], part_of_speech: 'noun', frequency_rank: 32, ipa_pronunciation: 'moo-HER', example_sentence_spanish: 'La mujer es amable.', example_sentence_english: 'The woman is kind.', category: 'noun_person' },
    { spanish: 'niño', english: ['boy', 'child'], part_of_speech: 'noun', frequency_rank: 33, ipa_pronunciation: 'NIH-nyo', example_sentence_spanish: 'El niño juega en el parque.', example_sentence_english: 'The boy plays in the park.', category: 'noun_person' },
    { spanish: 'niña', english: ['girl'], part_of_speech: 'noun', frequency_rank: 34, ipa_pronunciation: 'NIH-nya', example_sentence_spanish: 'La niña es inteligente.', example_sentence_english: 'The girl is intelligent.', category: 'noun_person' },
    { spanish: 'casa', english: ['house', 'home'], part_of_speech: 'noun', frequency_rank: 35, ipa_pronunciation: 'KA-sa', example_sentence_spanish: 'Vivo en una casa grande.', example_sentence_english: 'I live in a big house.', category: 'noun_place' },
    { spanish: 'día', english: ['day'], part_of_speech: 'noun', frequency_rank: 36, ipa_pronunciation: 'DEE-a', example_sentence_spanish: 'Hoy es un buen día.', example_sentence_english: 'Today is a good day.', category: 'noun_time' },
    { spanish: 'tiempo', english: ['time', 'weather'], part_of_speech: 'noun', frequency_rank: 37, ipa_pronunciation: 'tee-EM-po', example_sentence_spanish: '¿Qué tiempo hace?', example_sentence_english: 'What is the weather like?', category: 'noun_time' },
    { spanish: 'año', english: ['year'], part_of_speech: 'noun', frequency_rank: 38, ipa_pronunciation: 'AH-nyo', example_sentence_spanish: 'Tengo 30 años.', example_sentence_english: 'I am 30 years old.', category: 'noun_time' },
    { spanish: 'agua', english: ['water'], part_of_speech: 'noun', frequency_rank: 39, ipa_pronunciation: 'AH-gwa', example_sentence_spanish: 'Bebo agua todos los días.', example_sentence_english: 'I drink water every day.', category: 'noun_thing' },
    { spanish: 'pan', english: ['bread'], part_of_speech: 'noun', frequency_rank: 40, ipa_pronunciation: 'pan', example_sentence_spanish: 'El pan es fresco.', example_sentence_english: 'The bread is fresh.', category: 'noun_food' },
    { spanish: 'café', english: ['coffee'], part_of_speech: 'noun', frequency_rank: 41, ipa_pronunciation: 'ka-FEH', example_sentence_spanish: 'Me encanta el café.', example_sentence_english: 'I love coffee.', category: 'noun_food' },
    { spanish: 'mesa', english: ['table'], part_of_speech: 'noun', frequency_rank: 42, ipa_pronunciation: 'MEH-sa', example_sentence_spanish: 'Comemos en la mesa.', example_sentence_english: 'We eat at the table.', category: 'noun_furniture' },
    { spanish: 'silla', english: ['chair'], part_of_speech: 'noun', frequency_rank: 43, ipa_pronunciation: 'SEE-ya', example_sentence_spanish: 'La silla es cómoda.', example_sentence_english: 'The chair is comfortable.', category: 'noun_furniture' },
    { spanish: 'libro', english: ['book'], part_of_speech: 'noun', frequency_rank: 44, ipa_pronunciation: 'LEE-bro', example_sentence_spanish: 'Leo un libro interesante.', example_sentence_english: 'I read an interesting book.', category: 'noun_object' },
    { spanish: 'coche', english: ['car'], part_of_speech: 'noun', frequency_rank: 45, ipa_pronunciation: 'KO-che', example_sentence_spanish: 'Mi coche es rojo.', example_sentence_english: 'My car is red.', category: 'noun_vehicle' },

    // Adjectives & Adverbs
    { spanish: 'bueno', english: ['good'], part_of_speech: 'adjective', frequency_rank: 46, ipa_pronunciation: 'boo-EH-no', example_sentence_spanish: 'Es un buen día.', example_sentence_english: 'It is a good day.', category: 'adjective_quality' },
    { spanish: 'malo', english: ['bad'], part_of_speech: 'adjective', frequency_rank: 47, ipa_pronunciation: 'MA-lo', example_sentence_spanish: 'El tiempo es malo.', example_sentence_english: 'The weather is bad.', category: 'adjective_quality' },
    { spanish: 'grande', english: ['big', 'large'], part_of_speech: 'adjective', frequency_rank: 48, ipa_pronunciation: 'GRAN-de', example_sentence_spanish: 'La casa es grande.', example_sentence_english: 'The house is big.', category: 'adjective_size' },
    { spanish: 'pequeño', english: ['small', 'little'], part_of_speech: 'adjective', frequency_rank: 49, ipa_pronunciation: 'pe-KEN-yo', example_sentence_spanish: 'El gato es pequeño.', example_sentence_english: 'The cat is small.', category: 'adjective_size' },
    { spanish: 'bonito', english: ['pretty', 'beautiful'], part_of_speech: 'adjective', frequency_rank: 50, ipa_pronunciation: 'bo-NEE-to', example_sentence_spanish: 'La flor es bonita.', example_sentence_english: 'The flower is pretty.', category: 'adjective_quality' },
    { spanish: 'feo', english: ['ugly'], part_of_speech: 'adjective', frequency_rank: 51, ipa_pronunciation: 'FEH-o', example_sentence_spanish: 'No es feo.', example_sentence_english: 'It\'s not ugly.', category: 'adjective_quality' },
    { spanish: 'rojo', english: ['red'], part_of_speech: 'adjective', frequency_rank: 52, ipa_pronunciation: 'RO-ho', example_sentence_spanish: 'La manzana es roja.', example_sentence_english: 'The apple is red.', category: 'adjective_color' },
    { spanish: 'azul', english: ['blue'], part_of_speech: 'adjective', frequency_rank: 53, ipa_pronunciation: 'a-ZOOL', example_sentence_spanish: 'El cielo es azul.', example_sentence_english: 'The sky is blue.', category: 'adjective_color' },
    { spanish: 'verde', english: ['green'], part_of_speech: 'adjective', frequency_rank: 54, ipa_pronunciation: 'VER-de', example_sentence_spanish: 'El árbol es verde.', example_sentence_english: 'The tree is green.', category: 'adjective_color' },
    { spanish: 'nuevo', english: ['new'], part_of_speech: 'adjective', frequency_rank: 55, ipa_pronunciation: 'noo-EH-vo', example_sentence_spanish: 'Tengo un coche nuevo.', example_sentence_english: 'I have a new car.', category: 'adjective_quality' },
    { spanish: 'viejo', english: ['old'], part_of_speech: 'adjective', frequency_rank: 56, ipa_pronunciation: 'vee-EH-ho', example_sentence_spanish: 'La casa es vieja.', example_sentence_english: 'The house is old.', category: 'adjective_quality' },
    { spanish: 'joven', english: ['young'], part_of_speech: 'adjective', frequency_rank: 57, ipa_pronunciation: 'HO-ven', example_sentence_spanish: 'Es una mujer joven.', example_sentence_english: 'She is a young woman.', category: 'adjective_age' },
    { spanish: 'alto', english: ['tall'], part_of_speech: 'adjective', frequency_rank: 58, ipa_pronunciation: 'AL-to', example_sentence_spanish: 'El edificio es alto.', example_sentence_english: 'The building is tall.', category: 'adjective_size' },
    { spanish: 'bajo', english: ['short', 'low'], part_of_speech: 'adjective', frequency_rank: 59, ipa_pronunciation: 'BA-ho', example_sentence_spanish: 'Es un edificio bajo.', example_sentence_english: 'It is a low building.', category: 'adjective_size' },
    { spanish: 'fácil', english: ['easy'], part_of_speech: 'adjective', frequency_rank: 60, ipa_pronunciation: 'FA-sil', example_sentence_spanish: 'El examen es fácil.', example_sentence_english: 'The exam is easy.', category: 'adjective_difficulty' },

    // Question words & Common phrases
    { spanish: 'qué', english: ['what'], part_of_speech: 'question_word', frequency_rank: 61, ipa_pronunciation: 'ke', example_sentence_spanish: '¿Qué es esto?', example_sentence_english: 'What is this?', category: 'question_word' },
    { spanish: 'cuándo', english: ['when'], part_of_speech: 'question_word', frequency_rank: 62, ipa_pronunciation: 'KWAN-do', example_sentence_spanish: '¿Cuándo vienes?', example_sentence_english: 'When are you coming?', category: 'question_word' },
    { spanish: 'dónde', english: ['where'], part_of_speech: 'question_word', frequency_rank: 63, ipa_pronunciation: 'DON-de', example_sentence_spanish: '¿Dónde está la estación?', example_sentence_english: 'Where is the station?', category: 'question_word' },
    { spanish: 'por qué', english: ['why'], part_of_speech: 'question_word', frequency_rank: 64, ipa_pronunciation: 'por-KE', example_sentence_spanish: '¿Por qué no vienes?', example_sentence_english: 'Why don\'t you come?', category: 'question_word' },
    { spanish: 'cuánto', english: ['how much'], part_of_speech: 'question_word', frequency_rank: 65, ipa_pronunciation: 'KWAN-to', example_sentence_spanish: '¿Cuánto cuesta?', example_sentence_english: 'How much does it cost?', category: 'question_word' },
    { spanish: 'hola', english: ['hello', 'hi'], part_of_speech: 'interjection', frequency_rank: 66, ipa_pronunciation: 'O-la', example_sentence_spanish: 'Hola, ¿cómo estás?', example_sentence_english: 'Hi, how are you?', category: 'greeting' },
    { spanish: 'adiós', english: ['goodbye'], part_of_speech: 'interjection', frequency_rank: 67, ipa_pronunciation: 'a-dee-OHS', example_sentence_spanish: 'Adiós, hasta luego.', example_sentence_english: 'Goodbye, see you later.', category: 'greeting' },
    { spanish: 'gracias', english: ['thank you'], part_of_speech: 'interjection', frequency_rank: 68, ipa_pronunciation: 'GRA-see-as', example_sentence_spanish: 'Gracias por tu ayuda.', example_sentence_english: 'Thank you for your help.', category: 'politeness' },
    { spanish: 'de nada', english: ['you\'re welcome'], part_of_speech: 'phrase', frequency_rank: 69, ipa_pronunciation: 'de-NA-da', example_sentence_spanish: 'De nada, es mi placer.', example_sentence_english: 'You\'re welcome, it\'s my pleasure.', category: 'politeness' },
    { spanish: 'perdón', english: ['sorry', 'excuse me'], part_of_speech: 'interjection', frequency_rank: 70, ipa_pronunciation: 'per-DON', example_sentence_spanish: 'Perdón, no entiendo.', example_sentence_english: 'Sorry, I don\'t understand.', category: 'politeness' },
  ];

  await knex('vocabulary').insert(vocabulary);

  // ---------------------------------------------------------------------------
  // Lessons — stable UUIDs so segments/questions/prereqs can reference them.
  // calendar_unlock_day gates each lesson: day 0 is available immediately,
  // later lessons unlock on subsequent days and via prerequisites.
  // ---------------------------------------------------------------------------
  const L1 = uuidv4();
  const L2 = uuidv4();
  const L3 = uuidv4();
  const L4 = uuidv4();
  const L5 = uuidv4();

  const lessons = [
    { id: L1, title: 'Greetings & Introductions', description: 'Learn basic Spanish greetings and how to introduce yourself.', level: 1, curriculum_phase: 'foundation', content_type: 'listening', theme: 'greetings', prerequisites: [], calendar_unlock_day: 0, estimated_duration_minutes: 15, audio_url: null, audio_duration_seconds: 150, published: true },
    { id: L2, title: 'Numbers & Time', description: 'Master Spanish numbers 0-100 and telling time.', level: 1, curriculum_phase: 'foundation', content_type: 'listening', theme: 'numbers', prerequisites: [L1], calendar_unlock_day: 1, estimated_duration_minutes: 15, audio_url: null, audio_duration_seconds: 190, published: true },
    { id: L3, title: 'Common Objects & Places', description: 'Learn vocabulary for everyday objects and locations.', level: 1, curriculum_phase: 'foundation', content_type: 'listening', theme: 'objects', prerequisites: [L2], calendar_unlock_day: 2, estimated_duration_minutes: 20, audio_url: null, audio_duration_seconds: 210, published: true },
    { id: L4, title: 'Ser vs Estar (To Be)', description: 'Understand the difference between permanent and temporary "to be".', level: 2, curriculum_phase: 'core', content_type: 'listening', theme: 'verbs', prerequisites: [L3], calendar_unlock_day: 3, estimated_duration_minutes: 25, audio_url: null, audio_duration_seconds: 245, published: true },
    { id: L5, title: 'Present Tense Conjugation', description: 'Learn how to conjugate regular -AR, -ER, -IR verbs in present tense.', level: 2, curriculum_phase: 'core', content_type: 'listening', theme: 'verbs', prerequisites: [L4], calendar_unlock_day: 4, estimated_duration_minutes: 25, audio_url: null, audio_duration_seconds: 275, published: true },
  ];

  await knex('lessons').insert(lessons);

  // ---------------------------------------------------------------------------
  // Lesson segments (transcript lines). start_ms/end_ms accumulate per lesson.
  // ---------------------------------------------------------------------------
  type SegSpec = { es: string; en: string; dur: number };
  const segmentsByLesson: Array<{ lessonId: string; segs: SegSpec[] }> = [
    {
      lessonId: L1,
      segs: [
        { es: 'Hola. Buenos días. Buenas tardes.', en: 'Hello. Good morning. Good afternoon.', dur: 45 },
        { es: 'Me llamo... Mucho gusto.', en: 'My name is... Nice to meet you.', dur: 50 },
        { es: '¿Cómo estás? Bien. Muy bien.', en: 'How are you? Well. Very well.', dur: 55 },
      ],
    },
    {
      lessonId: L2,
      segs: [
        { es: 'Cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez.', en: 'Zero, one, two, three, four, five, six, seven, eight, nine, ten.', dur: 60 },
        { es: 'Veinte, treinta, cuarenta, cincuenta, sesenta, setenta, ochenta, noventa, cien.', en: 'Twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred.', dur: 60 },
        { es: '¿Qué hora es? Son las tres.', en: 'What time is it? It is three o\'clock.', dur: 70 },
      ],
    },
    {
      lessonId: L3,
      segs: [
        { es: 'Casa, puerta, ventana, mesa, silla, cama.', en: 'House, door, window, table, chair, bed.', dur: 65 },
        { es: 'Tienda, parque, biblioteca, hospital, escuela.', en: 'Store, park, library, hospital, school.', dur: 70 },
        { es: 'Pan, agua, café, leche, manzana, naranja.', en: 'Bread, water, coffee, milk, apple, orange.', dur: 75 },
      ],
    },
    {
      lessonId: L4,
      segs: [
        { es: 'Yo soy ingeniero. Ella es mexicana.', en: 'I am an engineer. She is Mexican. SER is used for permanent characteristics.', dur: 80 },
        { es: 'Estoy en la casa. Estoy feliz.', en: 'I am at home. I am happy. ESTAR is used for location and temporary states.', dur: 80 },
        { es: 'María es alta. María está feliz.', en: 'María is tall (permanent). María is happy (temporary). Notice the difference!', dur: 85 },
      ],
    },
    {
      lessonId: L5,
      segs: [
        { es: 'Hablar, comer, vivir.', en: 'To speak, to eat, to live. Regular verbs follow predictable patterns: -AR, -ER, -IR.', dur: 90 },
        { es: 'Hablo, hablas, habla, hablamos, habláis, hablan.', en: 'I speak, you speak, he/she speaks, we speak, you all speak, they speak.', dur: 90 },
        { es: 'Como, comes, come. Vivo, vives, vive.', en: 'I eat, you eat, he/she eats. I live, you live, he/she lives.', dur: 95 },
      ],
    },
  ];

  const segmentRows: any[] = [];
  for (const { lessonId, segs } of segmentsByLesson) {
    let cursorMs = 0;
    segs.forEach((seg, idx) => {
      const startMs = cursorMs;
      const endMs = cursorMs + seg.dur * 1000;
      cursorMs = endMs;
      segmentRows.push({
        lesson_id: lessonId,
        start_ms: startMs,
        end_ms: endMs,
        spanish_text: seg.es,
        english_text: seg.en,
        sequence_order: idx + 1,
      });
    });
  }

  await knex('lesson_segments').insert(segmentRows);

  // ---------------------------------------------------------------------------
  // Comprehension questions
  // ---------------------------------------------------------------------------
  const questions = [
    // Lesson 1
    { lesson_id: L1, question_type: 'short_answer', question_english: 'How do you say "good morning" in Spanish?', question_spanish: '¿Cómo se dice "good morning" en español?', options: null, correct_answer: null, acceptable_answers: ['Buenos días', 'buenos dias'], sequence_order: 1 },
    { lesson_id: L1, question_type: 'multiple_choice', question_english: 'What does "mucho gusto" mean?', question_spanish: '¿Qué significa "mucho gusto"?', options: ['Nice to meet you', 'Good morning', 'Thank you', 'Goodbye'], correct_answer: 0, acceptable_answers: null, sequence_order: 2 },
    { lesson_id: L1, question_type: 'short_answer', question_english: 'How do you ask "How are you?" in Spanish?', question_spanish: '¿Cómo preguntas "How are you?" en español?', options: null, correct_answer: null, acceptable_answers: ['¿Cómo estás?', 'como estas'], sequence_order: 3 },

    // Lesson 2
    { lesson_id: L2, question_type: 'multiple_choice', question_english: 'What is the number after "nueve"?', question_spanish: '¿Cuál es el número después de "nueve"?', options: ['Diez', 'Ocho', 'Once', 'Veinte'], correct_answer: 0, acceptable_answers: null, sequence_order: 1 },
    { lesson_id: L2, question_type: 'short_answer', question_english: 'How do you ask what time it is?', question_spanish: '¿Cómo preguntas qué hora es?', options: null, correct_answer: null, acceptable_answers: ['¿Qué hora es?', 'que hora es'], sequence_order: 2 },

    // Lesson 3
    { lesson_id: L3, question_type: 'short_answer', question_english: 'How do you say "table" in Spanish?', question_spanish: '¿Cómo se dice "table" en español?', options: null, correct_answer: null, acceptable_answers: ['Mesa', 'mesa', 'la mesa'], sequence_order: 1 },

    // Lesson 4
    { lesson_id: L4, question_type: 'multiple_choice', question_english: 'When do you use SER instead of ESTAR?', question_spanish: '¿Cuándo usas SER en lugar de ESTAR?', options: ['For permanent characteristics', 'For location', 'For temporary states', 'For emotions'], correct_answer: 0, acceptable_answers: null, sequence_order: 1 },

    // Lesson 5
    { lesson_id: L5, question_type: 'short_answer', question_english: 'What is the correct conjugation: "Yo _____ español" (hablo/hablas)?', question_spanish: '¿Cuál es la conjugación correcta: "Yo _____ español"?', options: null, correct_answer: null, acceptable_answers: ['hablo'], sequence_order: 2 },
  ];

  await knex('comprehension_questions').insert(questions);

  // ---------------------------------------------------------------------------
  // Stories & story blocks
  // ---------------------------------------------------------------------------
  const S1 = uuidv4();
  const S2 = uuidv4();
  const S3 = uuidv4();

  const stories = [
    { id: S1, title: 'El Gato y el Ratón', description: 'A classic story about a cat and mouse.', difficulty_level: 1, reading_time_minutes: 10, theme: 'animals', published: true },
    { id: S2, title: 'Un Día en la Ciudad', description: 'A young woman\'s day in Madrid exploring the city.', difficulty_level: 2, reading_time_minutes: 15, theme: 'daily_life', published: true },
    { id: S3, title: 'La Familia García', description: 'Meet the García family and their weekend activities.', difficulty_level: 2, reading_time_minutes: 12, theme: 'family', published: true },
  ];

  await knex('stories').insert(stories);

  const storyBlocks = [
    { story_id: S1, sequence_order: 1, spanish: 'En una casa pequeña, vivía un gato muy inteligente. Un día, vio un ratón en la cocina. El gato pensó: "¡Qué buena cena!" Pero el ratón era muy rápido y astuto.', english: 'In a small house, there lived a very intelligent cat. One day, he saw a mouse in the kitchen. The cat thought: "What a good dinner!" But the mouse was very fast and clever.' },
    { story_id: S1, sequence_order: 2, spanish: 'El gato empezó a perseguir al ratón por toda la casa. Corrieron por la sala, la cocina y el dormitorio. El ratón corría muy rápido, saltaba sobre las mesas y se escondía en los rincones.', english: 'The cat began to chase the mouse all over the house. They ran through the living room, the kitchen, and the bedroom. The mouse ran very fast, jumped over tables, and hid in corners.' },
    { story_id: S1, sequence_order: 3, spanish: 'Finalmente, el ratón encontró un agujero pequeño en la pared. Se metió dentro rápidamente. El gato no podía entrar. El ratón estaba seguro en su casa. El gato se fue a dormir, cansado. Y el ratón sonrió con satisfacción.', english: 'Finally, the mouse found a small hole in the wall. He quickly squeezed inside. The cat couldn\'t get in. The mouse was safe in his home. The cat went to sleep, exhausted. And the mouse smiled with satisfaction.' },

    { story_id: S2, sequence_order: 1, spanish: 'María se despertó a las 7 de la mañana en su apartamento en Madrid. Tomó un café con pan y mermelada. Luego se preparó para el día. Hace un día hermoso, pensó. Las calles están llenas de vida y color.', english: 'María woke up at 7 in the morning in her apartment in Madrid. She had coffee with bread and jam. Then she prepared for the day. It\'s a beautiful day, she thought. The streets are full of life and color.' },
    { story_id: S2, sequence_order: 2, spanish: 'María caminó por las calles de Madrid. Visitó el Parque del Retiro, donde hay árboles verdes y flores bonitas. Vio a muchas personas: algunos leían libros, otros jugaban, muchos simplemente descansaban bajo el sol.', english: 'María walked through the streets of Madrid. She visited Retiro Park, where there are green trees and beautiful flowers. She saw many people: some were reading books, others were playing, many were simply resting under the sun.' },
    { story_id: S2, sequence_order: 3, spanish: 'Por la tarde, María entró en un pequeño café. Pidió un café y un sándwich. Se sentó en una mesa junto a la ventana y observó a las personas que pasaban. Pensó que la vida en Madrid era hermosa y emocionante.', english: 'In the afternoon, María went into a small café. She ordered a coffee and a sandwich. She sat at a table by the window and watched the people passing by. She thought that life in Madrid was beautiful and exciting.' },

    { story_id: S3, sequence_order: 1, spanish: 'La familia García se reunió el sábado por la mañana. Papá preparó el desayuno: huevos, pan tostado y jugo de naranja. Mamá puso la mesa. Los niños, Juan y Sofía, estaban muy felices. "¡Qué delicioso!" dijeron.', english: 'The García family gathered on Saturday morning. Dad prepared breakfast: eggs, toast, and orange juice. Mom set the table. The children, Juan and Sofía, were very happy. "How delicious!" they said.' },
    { story_id: S3, sequence_order: 2, spanish: 'Después del desayuno, fueron al parque. Juan y Sofía jugaron en el patio de juegos mientras los padres se sentaban en un banco. Jugaron al fútbol, corrieron y rieron mucho. Fue un día perfecto para la familia.', english: 'After breakfast, they went to the park. Juan and Sofía played on the playground while their parents sat on a bench. They played soccer, ran, and laughed a lot. It was a perfect day for the family.' },
    { story_id: S3, sequence_order: 3, spanish: 'Por la noche, toda la familia se sentó en el sofá. Vieron una película juntos y comieron palomitas. Fue un día maravilloso lleno de amor y alegría. Todos dijeron: "¡Fue el mejor sábado!"', english: 'At night, the whole family sat on the couch. They watched a movie together and ate popcorn. It was a wonderful day full of love and joy. Everyone said: "It was the best Saturday!"' },
  ];

  await knex('story_blocks').insert(storyBlocks);

  console.log('✅ Seed data inserted successfully!');
  console.log(`📚 Vocabulary: ${vocabulary.length}, Lessons: ${lessons.length}, Stories: ${stories.length}`);
}
