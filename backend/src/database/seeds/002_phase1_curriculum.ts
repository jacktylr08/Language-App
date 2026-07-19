import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed if lesson_phases table is empty (idempotent)
  const existingPhase1 = await knex('lesson_phases').where('phase', 1).first();
  if (existingPhase1) {
    console.log('Phase 1 lessons already seeded; skipping');
    return;
  }

  // ============================================================================
  // PHASE 1: FOUNDATION (Weeks 1-4)
  // ============================================================================

  const phase1Lessons = [
    {
      id: uuidv4(),
      title: 'Phonetics & First Sounds',
      description: 'Introduce Spanish phonetics and greetings. Learn hola, adiós, sí, no, and basic politeness.',
      audio_url: 'https://example.com/audio/lesson-1-phonetics.mp3', // Will be generated
      audio_duration_seconds: 90,
      curriculum_phase: 1,
      week_number: 1,
      lesson_order: 1,
      theme_category: 'phonetics',
      lesson_type: 'foundation',
    },
    {
      id: uuidv4(),
      title: 'R Sounds & Verbs',
      description: 'Spanish /r/ vs /rr/ pronunciation. Introduce ser (to be) conjugation via listening.',
      audio_url: 'https://example.com/audio/lesson-2-r-sounds.mp3',
      audio_duration_seconds: 120,
      curriculum_phase: 1,
      week_number: 1,
      lesson_order: 2,
      theme_category: 'phonetics',
      lesson_type: 'foundation',
    },
    {
      id: uuidv4(),
      title: 'First Verbs & Daily Actions',
      description: 'Common action verbs (hablar, comer, vivir, tener, estar, ir, hacer) in context.',
      audio_url: 'https://example.com/audio/lesson-3-verbs.mp3',
      audio_duration_seconds: 150,
      curriculum_phase: 1,
      week_number: 2,
      lesson_order: 1,
      theme_category: 'verbs',
      lesson_type: 'listening_comprehension',
    },
    {
      id: uuidv4(),
      title: 'Family & Relationships',
      description: 'Family vocabulary (padre, madre, hermano, hermana) and possessive adjectives.',
      audio_url: 'https://example.com/audio/lesson-4-family.mp3',
      audio_duration_seconds: 120,
      curriculum_phase: 1,
      week_number: 2,
      lesson_order: 2,
      theme_category: 'family',
      lesson_type: 'listening_comprehension',
    },
    {
      id: uuidv4(),
      title: 'Common Nouns & Places',
      description: 'Essential nouns (house, day, time, food, water) and location descriptions.',
      audio_url: 'https://example.com/audio/lesson-5-nouns.mp3',
      audio_duration_seconds: 120,
      curriculum_phase: 1,
      week_number: 3,
      lesson_order: 1,
      theme_category: 'nouns',
      lesson_type: 'listening_comprehension',
    },
    {
      id: uuidv4(),
      title: 'Adjectives & Descriptions',
      description: 'Basic adjectives (good, bad, big, small, new, old) and colors.',
      audio_url: 'https://example.com/audio/lesson-6-adjectives.mp3',
      audio_duration_seconds: 150,
      curriculum_phase: 1,
      week_number: 3,
      lesson_order: 2,
      theme_category: 'adjectives',
      lesson_type: 'listening_comprehension',
    },
    {
      id: uuidv4(),
      title: 'Consolidation & Review',
      description: 'Mix all 100 words from Weeks 1-3 in context. Complex comprehension tasks.',
      audio_url: 'https://example.com/audio/lesson-7-review.mp3',
      audio_duration_seconds: 180,
      curriculum_phase: 1,
      week_number: 4,
      lesson_order: 1,
      theme_category: 'review',
      lesson_type: 'listening_comprehension',
    },
  ];

  // Insert Phase 1 lessons
  for (const lesson of phase1Lessons) {
    const existingLesson = await knex('lessons')
      .where('title', lesson.title)
      .first();

    if (!existingLesson) {
      await knex('lessons').insert(lesson);
    }
  }

  // ============================================================================
  // LESSON PHASES METADATA (Curriculum sequencing)
  // ============================================================================

  const lessonPhasesMetadata = [
    {
      lesson_id: phase1Lessons[0].id,
      phase: 1,
      week_number: 1,
      theme_category: 'phonetics',
      theme_color: '#64748B', // slate-500
      order_in_week: 1,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[1].id,
      phase: 1,
      week_number: 1,
      theme_category: 'phonetics',
      theme_color: '#64748B',
      order_in_week: 2,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[2].id,
      phase: 1,
      week_number: 2,
      theme_category: 'verbs',
      theme_color: '#7C3AED', // purple-600
      order_in_week: 1,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[3].id,
      phase: 1,
      week_number: 2,
      theme_category: 'family',
      theme_color: '#DC2626', // red-600 (family theme)
      order_in_week: 2,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[4].id,
      phase: 1,
      week_number: 3,
      theme_category: 'nouns',
      theme_color: '#0284C7', // blue-600
      order_in_week: 1,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[5].id,
      phase: 1,
      week_number: 3,
      theme_category: 'adjectives',
      theme_color: '#0284C7',
      order_in_week: 2,
      requires_passive_encounters: 0,
    },
    {
      lesson_id: phase1Lessons[6].id,
      phase: 1,
      week_number: 4,
      theme_category: 'review',
      theme_color: '#10B981', // green-600
      order_in_week: 1,
      requires_passive_encounters: 0,
    },
  ];

  // Insert lesson phases
  for (const lp of lessonPhasesMetadata) {
    const existingLp = await knex('lesson_phases')
      .where('lesson_id', lp.lesson_id)
      .first();

    if (!existingLp) {
      await knex('lesson_phases').insert({
        id: uuidv4(),
        ...lp,
      });
    }
  }

  // ============================================================================
  // STORIES (Phase 1)
  // ============================================================================

  const phase1Stories = [
    {
      id: uuidv4(),
      title: 'Mi Nombre Es María',
      content: `Hola, me llamo María. Tengo veinte y cinco años.

Hola. Mucho gusto. Mucho gusto, señor.

—¿Cómo te llamas? —Me llamo Carlos.
—Mucho gusto, Carlos.
—Mucho gusto, María.

—Gracias por tu ayuda.
—De nada. De nada.

—Perdón, ¿dónde está el café?
—El café está aquí, por favor.
—Gracias, muchas gracias.
—De nada.

—¿Sí o no? ¿Te gusta?
—Sí, sí, me gusta mucho.

Buenas noches. Adiós. Adiós, María. Adiós, Carlos.

Buenas noches. Hasta mañana.`,
      lesson_id: phase1Lessons[0].id,
      difficulty_level: 'A0',
      word_count: 150,
    },
    {
      id: uuidv4(),
      title: 'Yo Soy José',
      content: `—Hola, me llamo José.
—Mucho gusto, José. Yo soy María.

—¿Quién eres?
—Yo soy José. Soy doctor. Tú eres... ¿quién eres?
—Yo soy María. Soy enfermera.

—Mucho gusto, María.
—Mucho gusto, José.

José es alto y fuerte. María es bajita e inteligente.

—¿Cómo eres?
—Yo soy amable. Soy inteligente. ¿Y tú?
—Yo soy fuerte. Soy trabajador.

—Gracias, José. Eres muy amable.
—De nada, María.

—¿Él es doctor?
—Sí, sí. Él es doctor.
—¿Y ella? ¿Quién es ella?
—Ella es enfermera. Ella es muy amable.

Nosotros somos amigos. Somos compañeros.

Hola, ¿cómo estáis? Hola a vosotros. Mucho gusto.

Adiós, José. Adiós, María. Hasta mañana.`,
      lesson_id: phase1Lessons[1].id,
      difficulty_level: 'A0+',
      word_count: 180,
    },
    {
      id: uuidv4(),
      title: 'Un Día en la Vida de María',
      content: `Hola, me llamo María.

Cada día, yo me despido y hablo con mis amigos. Hablo español en casa y inglés en el trabajo.

Por la mañana, como pan y café. A las ocho de la mañana, voy al trabajo.

Trabajo en una oficina grande en Madrid. Tengo muchos amigos allí. Nosotros hablamos de trabajo.

A las doce, comemos. Yo como verdura y pan. Mi amigo Carlos come fruta. Nosotros comemos juntos.

Por la tarde, trabajo más. Hago mis tareas. Escribo correos electrónicos. Hablo con clientes.

A las seis de la tarde, voy a casa. Estoy muy cansada.

Por la noche, hago la cena. Como carne y verdura. Mi hermano come conmigo.

Después de cenar, descanso. Hablo con mi familia. Leemos libros. Miramos la televisión.

A las diez de la noche, me voy a la cama. Duermo bien.

Mañana, otro día igual. Trabajo, como, hablo, vivo.

¿Y tú? ¿Qué haces cada día? ¿Dónde vives? ¿Qué comes? ¿Con quién hablas?

Adiós.`,
      lesson_id: phase1Lessons[2].id,
      difficulty_level: 'A1',
      word_count: 220,
    },
    {
      id: uuidv4(),
      title: 'La Familia de Antonio',
      content: `Me llamo Antonio. Te presento a mi familia.

Mi padre se llama Roberto. Tiene cincuenta años. Es ingeniero en una gran empresa. Vive en Madrid con nosotros.

Mi madre se llama Isabel. Tiene cuarenta y ocho años. Ella es doctora en un hospital. Trabaja mucho, pero ama a su familia.

Tengo un hermano. Se llama Carlos. Carlos tiene treinta y dos años. Él es abogado. Vive en Barcelona con su esposa.

Tengo una hermana. Se llama Sofía. Sofía tiene veintinueve años. Ella es enfermera. Vive en Madrid.

Mi abuelo, el padre de mi padre, se llama Manuel. Tiene setenta y cinco años. Es jubilado. Vive con nosotros.

Mi abuela, la madre de mi madre, se llama Rosa. Tiene setenta y dos años. Ella es muy amable. Cocina muy bien.

Yo tengo una hija. Se llama Elena. Tiene ocho años. Ella va a la escuela.

Mi familia es grande y feliz. Nos queremos mucho. Comemos juntos los domingos. Viajamos juntos en verano.

¿Y tu familia? ¿Cuántos hermanos tienes? ¿Dónde vive tu abuelo?`,
      lesson_id: phase1Lessons[3].id,
      difficulty_level: 'A1',
      word_count: 200,
    },
    {
      id: uuidv4(),
      title: 'Mi Casa',
      content: `Me llamo Rosa. Te presento mi casa.

Mi casa está en Madrid. Es una casa grande y bonita. Tiene cuatro dormitorios y dos baños.

En la planta baja:

Hay una cocina grande. Hay una despensa. Hay un comedor. En el comedor hay una mesa grande de madera.

Hay una sala de estar. Hay un sofá cómodo. Hay una televisión.

En la cocina:

Hay una nevera. Hay un horno. Hay una estufa.

En la nevera, hay:
- Leche
- Queso
- Carne
- Verdura
- Fruta
- Agua

En la despensa, hay:
- Pan
- Café
- Té
- Aceite
- Sal

Cada día:

Por la mañana, preparo café y pan. Como desayuno en la cocina.

Al mediodía, cocino carne y verdura. Como con mi familia.

Por la tarde, como fruta o pan con queso.

Por la noche, cocino sopa. Comemos juntos.

Mi casa es mi hogar. Es tranquila. Es bonita. Es cómoda.

Me gusta vivir en mi casa. Me gusta cocinar en mi cocina. Me gusta comer con mi familia.

¿Tienes una casa? ¿Cuántos dormitorios tiene? ¿Qué hay en tu cocina?`,
      lesson_id: phase1Lessons[4].id,
      difficulty_level: 'A1',
      word_count: 210,
    },
  ];

  // Insert stories
  for (const story of phase1Stories) {
    const existingStory = await knex('stories')
      .where('title', story.title)
      .first();

    if (!existingStory) {
      await knex('stories').insert(story);
    }
  }

  console.log('Phase 1 curriculum seeded successfully');
}
