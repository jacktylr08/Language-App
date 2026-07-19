import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (development only)
  await knex('story_comprehension').del();
  await knex('story_blocks').del();
  await knex('stories').del();
  await knex('comprehension_questions').del();
  await knex('lesson_segments').del();
  await knex('vocabulary_review_history').del();
  await knex('review_queue').del();
  await knex('lesson_progress').del();
  await knex('user_vocabulary_progress').del();
  await knex('vocabulary').del();
  await knex('lessons').del();
  await knex('user_acquisition_metrics').del();
  await knex('users').del();

  // Comprehensive vocabulary (100+ most frequent Spanish words)
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

  const vocabIds = await knex('vocabulary').insert(vocabulary).returning('id');

  // Foundation Lessons (unlock immediately)
  const lessons = [
    {
      id: 'lesson-001',
      title: 'Greetings & Introductions',
      description: 'Learn basic Spanish greetings and how to introduce yourself.',
      phase: 'foundation',
      order: 1,
      difficulty: 1,
      prerequisites: [],
      calendar_unlock_day: 0,
      thumbnail_url: 'https://via.placeholder.com/300x200?text=Saludos',
      estimated_duration_minutes: 15,
      vocabulary_count: 10,
    },
    {
      id: 'lesson-002',
      title: 'Numbers & Time',
      description: 'Master Spanish numbers 0-100 and telling time.',
      phase: 'foundation',
      order: 2,
      difficulty: 1,
      prerequisites: ['lesson-001'],
      calendar_unlock_day: 1,
      thumbnail_url: 'https://via.placeholder.com/300x200?text=Números',
      estimated_duration_minutes: 15,
      vocabulary_count: 15,
    },
    {
      id: 'lesson-003',
      title: 'Common Objects & Places',
      description: 'Learn vocabulary for everyday objects and locations.',
      phase: 'foundation',
      order: 3,
      difficulty: 1,
      prerequisites: ['lesson-002'],
      calendar_unlock_day: 2,
      thumbnail_url: 'https://via.placeholder.com/300x200?text=Objetos',
      estimated_duration_minutes: 20,
      vocabulary_count: 20,
    },
    {
      id: 'lesson-004',
      title: 'Ser vs Estar (To Be)',
      description: 'Understand the difference between permanent and temporary "to be".',
      phase: 'core',
      order: 1,
      difficulty: 2,
      prerequisites: ['lesson-003'],
      calendar_unlock_day: 3,
      thumbnail_url: 'https://via.placeholder.com/300x200?text=Verbos',
      estimated_duration_minutes: 25,
      vocabulary_count: 10,
    },
    {
      id: 'lesson-005',
      title: 'Present Tense Conjugation',
      description: 'Learn how to conjugate regular -AR, -ER, -IR verbs in present tense.',
      phase: 'core',
      order: 2,
      difficulty: 2,
      prerequisites: ['lesson-004'],
      calendar_unlock_day: 4,
      thumbnail_url: 'https://via.placeholder.com/300x200?text=Conjugación',
      estimated_duration_minutes: 25,
      vocabulary_count: 15,
    },
  ];

  const lessonIds = await knex('lessons').insert(lessons).returning('id');

  // Lesson Segments with audio
  const segments = [
    // Lesson 1 segments
    { lesson_id: 'lesson-001', order: 1, title: 'Basic Greetings', content_text: 'Hola means hello. Buenos días means good morning. Buenas tardes means good afternoon.', audio_url: 'https://audio.placeholder.com/lesson1-segment1.mp3', duration_seconds: 45 },
    { lesson_id: 'lesson-001', order: 2, title: 'Saying Your Name', content_text: 'Me llamo... means My name is... Mucho gusto means Nice to meet you.', audio_url: 'https://audio.placeholder.com/lesson1-segment2.mp3', duration_seconds: 50 },
    { lesson_id: 'lesson-001', order: 3, title: 'Common Responses', content_text: '¿Cómo estás? means How are you? Bien means well. Muy bien means very well.', audio_url: 'https://audio.placeholder.com/lesson1-segment3.mp3', duration_seconds: 55 },

    // Lesson 2 segments
    { lesson_id: 'lesson-002', order: 1, title: 'Numbers 0-20', content_text: 'Cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez, once, doce...', audio_url: 'https://audio.placeholder.com/lesson2-segment1.mp3', duration_seconds: 60 },
    { lesson_id: 'lesson-002', order: 2, title: 'Numbers 20-100', content_text: 'Veinte, treinta, cuarenta, cincuenta, sesenta, setenta, ochenta, noventa, ciento...', audio_url: 'https://audio.placeholder.com/lesson2-segment2.mp3', duration_seconds: 60 },
    { lesson_id: 'lesson-002', order: 3, title: 'Telling Time', content_text: 'La hora means the hour. ¿Qué hora es? means What time is it? Son las tres means It is 3 o\'clock.', audio_url: 'https://audio.placeholder.com/lesson2-segment3.mp3', duration_seconds: 70 },

    // Lesson 3 segments
    { lesson_id: 'lesson-003', order: 1, title: 'Household Objects', content_text: 'Casa (house), puerta (door), ventana (window), mesa (table), silla (chair), cama (bed)...', audio_url: 'https://audio.placeholder.com/lesson3-segment1.mp3', duration_seconds: 65 },
    { lesson_id: 'lesson-003', order: 2, title: 'Places in Town', content_text: 'Tienda (store), parque (park), biblioteca (library), hospital (hospital), escuela (school)...', audio_url: 'https://audio.placeholder.com/lesson3-segment2.mp3', duration_seconds: 70 },
    { lesson_id: 'lesson-003', order: 3, title: 'Food & Drinks', content_text: 'Pan (bread), agua (water), café (coffee), leche (milk), manzana (apple), naranja (orange)...', audio_url: 'https://audio.placeholder.com/lesson3-segment3.mp3', duration_seconds: 75 },

    // Lesson 4 segments
    { lesson_id: 'lesson-004', order: 1, title: 'Introduction to SER', content_text: 'SER is used for permanent characteristics: Yo soy ingeniero (I am an engineer). She is mexican: Ella es mexicana.', audio_url: 'https://audio.placeholder.com/lesson4-segment1.mp3', duration_seconds: 80 },
    { lesson_id: 'lesson-004', order: 2, title: 'Introduction to ESTAR', content_text: 'ESTAR is used for location and temporary state: Estoy en la casa (I am at home). Estoy feliz (I am happy).', audio_url: 'https://audio.placeholder.com/lesson4-segment2.mp3', duration_seconds: 80 },
    { lesson_id: 'lesson-004', order: 3, title: 'Comparing SER and ESTAR', content_text: 'Maria es alta (permanent - Maria IS tall). Maria está feliz (temporary - Maria IS happy). Notice the difference!', audio_url: 'https://audio.placeholder.com/lesson4-segment3.mp3', duration_seconds: 85 },

    // Lesson 5 segments
    { lesson_id: 'lesson-005', order: 1, title: 'Present Tense Basics', content_text: 'Regular verbs follow predictable patterns. -AR verbs: hablar (to speak), -ER verbs: comer (to eat), -IR verbs: vivir (to live).', audio_url: 'https://audio.placeholder.com/lesson5-segment1.mp3', duration_seconds: 90 },
    { lesson_id: 'lesson-005', order: 2, title: 'Conjugating -AR Verbs', content_text: 'Hablo, hablas, habla, hablamos, habláis, hablan. Example: Yo hablo español.', audio_url: 'https://audio.placeholder.com/lesson5-segment2.mp3', duration_seconds: 90 },
    { lesson_id: 'lesson-005', order: 3, title: 'Conjugating -ER & -IR Verbs', content_text: 'COMER: Como, comes, come. VIVIR: Vivo, vives, vive. Practice these common conjugations.', audio_url: 'https://audio.placeholder.com/lesson5-segment3.mp3', duration_seconds: 95 },
  ];

  await knex('lesson_segments').insert(segments);

  // Comprehension Questions
  const questions = [
    { lesson_id: 'lesson-001', question_es: '¿Cómo se dice "good morning" en español?', question_en: 'How do you say "good morning" in Spanish?', answer: 'Buenos días', type: 'fill_blank', segment_order: 1 },
    { lesson_id: 'lesson-001', question_es: '¿Qué significa "mucho gusto"?', question_en: 'What does "mucho gusto" mean?', answer: 'Nice to meet you', type: 'multiple_choice', segment_order: 1 },
    { lesson_id: 'lesson-001', question_es: '¿Cómo preguntas "¿How are you?" en español?', question_en: 'How do you ask "How are you?" in Spanish?', answer: '¿Cómo estás?', type: 'fill_blank', segment_order: 3 },

    { lesson_id: 'lesson-002', question_es: '¿Cuál es el número después de "nueve"?', question_en: 'What is the number after "nueve"?', answer: 'Diez', type: 'multiple_choice', segment_order: 1 },
    { lesson_id: 'lesson-002', question_es: '¿Cómo preguntas qué hora es?', question_en: 'How do you ask what time it is?', answer: '¿Qué hora es?', type: 'fill_blank', segment_order: 3 },

    { lesson_id: 'lesson-003', question_es: '¿Cómo se dice "table" en español?', question_en: 'How do you say "table" in Spanish?', answer: 'Mesa', type: 'fill_blank', segment_order: 1 },

    { lesson_id: 'lesson-004', question_es: '¿Cuándo usas SER en lugar de ESTAR?', question_en: 'When do you use SER instead of ESTAR?', answer: 'For permanent characteristics', type: 'multiple_choice', segment_order: 1 },

    { lesson_id: 'lesson-005', question_es: '¿Cuál es la conjugación correcta: "Yo _____ español"?', question_en: 'What is the correct conjugation: "Yo _____ español" (hablo/hablas)?', answer: 'hablo', type: 'fill_blank', segment_order: 2 },
  ];

  await knex('comprehension_questions').insert(questions);

  // Stories for reading practice
  const stories = [
    {
      id: 'story-001',
      title: 'El Gato y el Ratón',
      description: 'A classic story about a cat and mouse.',
      difficulty: 1,
      theme: 'animals',
      language_level: 'beginner',
      reading_time_minutes: 10,
    },
    {
      id: 'story-002',
      title: 'Un Día en la Ciudad',
      description: 'A young woman\'s day in Madrid exploring the city.',
      difficulty: 2,
      theme: 'daily_life',
      language_level: 'beginner_intermediate',
      reading_time_minutes: 15,
    },
    {
      id: 'story-003',
      title: 'La Familia García',
      description: 'Meet the García family and their weekend activities.',
      difficulty: 2,
      theme: 'family',
      language_level: 'beginner_intermediate',
      reading_time_minutes: 12,
    },
  ];

  const storyIds = await knex('stories').insert(stories).returning('id');

  // Story blocks (chapters/sections)
  const storyBlocks = [
    {
      story_id: 'story-001',
      order: 1,
      title: 'El Encuentro',
      text_es: 'En una casa pequeña, vivía un gato muy inteligente. Un día, vio un ratón en la cocina. El gato pensó: "¡Qué buena cena!" Pero el ratón era muy rápido y astuto.',
      text_en: 'In a small house, there lived a very intelligent cat. One day, he saw a mouse in the kitchen. The cat thought: "What a good dinner!" But the mouse was very fast and clever.',
    },
    {
      story_id: 'story-001',
      order: 2,
      title: 'La Persecución',
      text_es: 'El gato empezó a perseguir al ratón por toda la casa. Corrieron por la sala, la cocina y el dormitorio. El ratón corría muy rápido, saltaba sobre las mesas y se escondía en los rincones.',
      text_en: 'The cat began to chase the mouse all over the house. They ran through the living room, the kitchen, and the bedroom. The mouse ran very fast, jumped over tables, and hid in corners.',
    },
    {
      story_id: 'story-001',
      order: 3,
      title: 'El Final',
      text_es: 'Finalmente, el ratón encontró un agujero pequeño en la pared. Se metió dentro rápidamente. El gato no podía entrar. El ratón estaba seguro en su casa. El gato se fue a dormir, cansado. Y el ratón sonrió con satisfacción.',
      text_en: 'Finally, the mouse found a small hole in the wall. He quickly squeezed inside. The cat couldn\'t get in. The mouse was safe in his home. The cat went to sleep, exhausted. And the mouse smiled with satisfaction.',
    },

    {
      story_id: 'story-002',
      order: 1,
      title: 'La Mañana',
      text_es: 'María se despertó a las 7 de la mañana en su apartamento en Madrid. Tomó un café con pan y mermelada. Luego se preparó para el día. Hace un día hermoso, pensó. Las calles están llenas de vida y color.',
      text_en: 'María woke up at 7 in the morning in her apartment in Madrid. She had coffee with bread and jam. Then she prepared for the day. It\'s a beautiful day, she thought. The streets are full of life and color.',
    },
    {
      story_id: 'story-002',
      order: 2,
      title: 'La Exploración',
      text_es: 'María caminó por las calles de Madrid. Visitó el Parque del Retiro, donde hay árboles verdes y flores bonitas. Vio a muchas personas: algunos leían libros, otros jugaban, muchos simplemente descansaban bajo el sol.',
      text_en: 'María walked through the streets of Madrid. She visited Retiro Park, where there are green trees and beautiful flowers. She saw many people: some were reading books, others were playing, many were simply resting under the sun.',
    },
    {
      story_id: 'story-002',
      order: 3,
      title: 'La Tarde',
      text_es: 'Por la tarde, María entró en una pequeña café. Pidió un café y un sándwich. Se sentó en una mesa junto a la ventana y observó a las personas que pasaban. Pensó que la vida en Madrid era hermosa y emocionante.',
      text_en: 'In the afternoon, María went into a small café. She ordered a coffee and a sandwich. She sat at a table by the window and watched the people passing by. She thought that life in Madrid was beautiful and exciting.',
    },

    {
      story_id: 'story-003',
      order: 1,
      title: 'Sábado por la Mañana',
      text_es: 'La familia García se reunió el sábado por la mañana. Papá preparó el desayuno: huevos, pan tostado y jugo de naranja. Mamá puso la mesa. Los niños, Juan y Sofia, estaban muy felices. "¡Qué delicioso!" dijeron.',
      text_en: 'The García family gathered on Saturday morning. Dad prepared breakfast: eggs, toast, and orange juice. Mom set the table. The children, Juan and Sofia, were very happy. "How delicious!" they said.',
    },
    {
      story_id: 'story-003',
      order: 2,
      title: 'El Parque',
      text_es: 'Después del desayuno, fueron al parque. Juan y Sofia jugaron en el patio de juegos mientras los padres se sentaban en un banco. Jugaron al fútbol, corrieron y rieron mucho. Fue un día perfecto para la familia.',
      text_en: 'After breakfast, they went to the park. Juan and Sofia played on the playground while their parents sat on a bench. They played soccer, ran, and laughed a lot. It was a perfect day for the family.',
    },
    {
      story_id: 'story-003',
      order: 3,
      title: 'La Noche',
      text_es: 'Por la noche, toda la familia se sentó en el sofá. Vieron una película juntos y comieron palomitas. Fue una día maravilloso lleno de amor y alegría. Todos dijeron: "¡Fue el mejor sábado!"',
      text_en: 'At night, the whole family sat on the couch. They watched a movie together and ate popcorn. It was a wonderful day full of love and joy. Everyone said: "It was the best Saturday!"',
    },
  ];

  await knex('story_blocks').insert(storyBlocks);

  console.log('✅ Seed data inserted successfully!');
  console.log(`📚 Lessons created: ${lessons.length}`);
  console.log(`📖 Stories created: ${stories.length}`);
  console.log(`💬 Vocabulary items: ${vocabulary.length}`);
}
