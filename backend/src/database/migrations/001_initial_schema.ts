import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

  // Users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.integer('current_level').defaultTo(0);
    table.string('locale', 10).defaultTo('es-MX');
    table.jsonb('preferences').defaultTo(
      JSON.stringify({
        target_reviews_per_day: 20,
        review_time_distribution: 'distributed',
        audio_playback_speed: 1.0,
        target_conversation_length_minutes: 10,
      })
    );
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('last_active_at', { useTz: true }).nullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.index('email');
    table.index(['created_at']);
  });

  // Lessons table
  await knex.schema.createTable('lessons', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('level').notNullable();
    table.string('curriculum_phase', 50).notNullable();
    table.string('content_type', 50).notNullable();
    table.string('audio_url', 512).nullable();
    table.integer('audio_duration_seconds').nullable();
    table.specificType('phonetic_focus', 'text[]').defaultTo('{}');
    table.string('theme', 100).nullable();
    table.specificType('prerequisites', 'uuid[]').defaultTo('{}');
    table.integer('calendar_unlock_day').nullable();
    table.integer('estimated_duration_minutes').defaultTo(5);
    table.integer('version').defaultTo(1);
    table.boolean('published').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.index(['level', 'curriculum_phase']);
    table.index('theme');
    table.index(['created_at']);
  });

  // Vocabulary table
  await knex.schema.createTable('vocabulary', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('spanish', 255).notNullable().unique();
    table.specificType('english', 'varchar(255)[]').notNullable();
    table.string('part_of_speech', 50).nullable();
    table.integer('frequency_rank').nullable();
    table.string('ipa_pronunciation', 255).nullable();
    table.float('difficulty_factor').defaultTo(2.5);
    table.text('example_sentence_spanish').nullable();
    table.text('example_sentence_english').nullable();
    table.specificType('lesson_ids', 'uuid[]').defaultTo('{}');
    table.specificType('related_vocab_ids', 'uuid[]').defaultTo('{}');
    table.string('category', 100).nullable();
    table.string('image_url', 512).nullable();
    table.string('audio_url', 512).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
    table.index('frequency_rank');
    table.index('spanish');
  });

  // User vocabulary progress (core SR engine)
  await knex.schema.createTable('user_vocabulary_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('vocabulary_id')
      .notNullable()
      .references('id')
      .inTable('vocabulary')
      .onDelete('CASCADE');
    table.integer('interval_days').defaultTo(0);
    table.float('ease_factor').defaultTo(2.5);
    table.integer('reps').defaultTo(0);
    table.integer('encounters').defaultTo(0);
    table.string('acquisition_state', 50).defaultTo('new');
    table.float('mastery_confidence').defaultTo(0.0);
    table.integer('correct_streak').defaultTo(0);
    table.timestamp('last_encounter_at', { useTz: true }).nullable();
    table.timestamp('last_review_at', { useTz: true }).nullable();
    table.timestamp('next_review_at', { useTz: true }).nullable();
    table.uuid('first_encountered_lesson_id').references('id').inTable('lessons').nullable();
    table.timestamp('first_review_timestamp', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.unique(['user_id', 'vocabulary_id']);
    table.index(['user_id']);
    table.index(['user_id', 'next_review_at']);
    table.index(['user_id', 'acquisition_state']);
  });

  // Lesson progress table
  await knex.schema.createTable('lesson_progress', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('status', 50).defaultTo('not_started');
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();
    table.integer('completion_percentage').defaultTo(0);
    table.integer('comprehension_attempts').defaultTo(0);
    table.integer('comprehension_correct').defaultTo(0);
    table.float('comprehension_last_score').nullable();
    table.integer('extracted_vocabulary_count').defaultTo(0);
    table.specificType('extracted_vocabulary_ids', 'uuid[]').defaultTo('{}');
    table.integer('reading_time_seconds').defaultTo(0);
    table.integer('words_seen').defaultTo(0);
    table.integer('review_count').defaultTo(0);
    table.timestamp('last_review_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.unique(['user_id', 'lesson_id']);
    table.index(['user_id']);
    table.index(['user_id', 'status']);
    table.index(['user_id', 'completed_at']);
  });

  // Review queue table
  await knex.schema.createTable('review_queue', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').unique().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.specificType('due_today', 'uuid[]').defaultTo('{}');
    table.specificType('due_tomorrow', 'uuid[]').defaultTo('{}');
    table.integer('total_reviews_today').defaultTo(0);
    table.integer('reviews_completed_today').defaultTo(0);
    table.timestamp('reviews_completed_timestamp', { useTz: true }).nullable();
    table.timestamp('last_calculated_at', { useTz: true }).nullable();
    table.timestamp('next_recalculation_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['user_id']);
    table.index('next_recalculation_at');
  });

  // Vocabulary review history (audit trail)
  await knex.schema.createTable('vocabulary_review_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .uuid('vocabulary_id')
      .notNullable()
      .references('id')
      .inTable('vocabulary')
      .onDelete('CASCADE');
    table.integer('quality').notNullable();
    table.integer('response_time_ms').nullable();
    table.string('context', 100).nullable();
    table.integer('interval_days_before').nullable();
    table.float('ease_factor_before').nullable();
    table.integer('reps_before').nullable();
    table.integer('interval_days_after').nullable();
    table.float('ease_factor_after').nullable();
    table.integer('reps_after').nullable();
    table.string('acquisition_state_after', 50).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['user_id', 'vocabulary_id']);
    table.index(['user_id', 'created_at']);
  });

  // Lesson segments
  await knex.schema.createTable('lesson_segments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('start_ms').notNullable();
    table.integer('end_ms').notNullable();
    table.text('spanish_text').notNullable();
    table.text('english_text').notNullable();
    table.specificType('pronunciation_focus', 'varchar(255)[]').defaultTo('{}');
    table.specificType('vocabulary_ids', 'uuid[]').defaultTo('{}');
    table.integer('sequence_order').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['lesson_id', 'sequence_order']);
  });

  // Comprehension questions
  await knex.schema.createTable('comprehension_questions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('question_type', 50).notNullable();
    table.text('question_english').notNullable();
    table.text('question_spanish').notNullable();
    table.specificType('options', 'varchar(255)[]').nullable();
    table.integer('correct_answer').nullable();
    table.specificType('acceptable_answers', 'text[]').nullable();
    table.integer('sequence_order').defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['lesson_id', 'sequence_order']);
  });

  // Stories table
  await knex.schema.createTable('stories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table.integer('difficulty_level').notNullable();
    table.integer('reading_time_minutes').nullable();
    table.uuid('associated_lesson_id').references('id').inTable('lessons').nullable();
    table.specificType('vocabulary_scope', 'uuid[]').defaultTo('{}');
    table.string('theme', 100).nullable();
    table.boolean('published').defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index('difficulty_level');
    table.index('theme');
  });

  // Story blocks
  await knex.schema.createTable('story_blocks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('story_id').notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.text('spanish').notNullable();
    table.text('english').notNullable();
    table.string('audio_url', 512).nullable();
    table.specificType('vocabulary_highlighted', 'uuid[]').defaultTo('{}');
    table.integer('sequence_order').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['story_id', 'sequence_order']);
  });

  // Story comprehension
  await knex.schema.createTable('story_comprehension', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('story_id').unique().notNullable().references('id').inTable('stories').onDelete('CASCADE');
    table.string('question_type', 50).nullable();
    table.text('prompt').notNullable();
    table.specificType('acceptable_answers', 'text[]').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  // User acquisition metrics (denormalized for analytics)
  await knex.schema.createTable('user_acquisition_metrics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').unique().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('words_encountered').defaultTo(0);
    table.integer('words_recognized_passively').defaultTo(0);
    table.integer('words_in_review_cycle').defaultTo(0);
    table.integer('words_mastered').defaultTo(0);
    table.integer('new_words_today').defaultTo(0);
    table.integer('mastered_words_this_week').defaultTo(0);
    table.integer('estimated_active_vocabulary').defaultTo(0);
    table.float('total_listening_hours').defaultTo(0.0);
    table.integer('total_reading_minutes').defaultTo(0);
    table.integer('unique_lessons_completed').defaultTo(0);
    table.integer('unique_stories_read').defaultTo(0);
    table.integer('real_media_minutes_watched').defaultTo(0);
    table.timestamp('last_calculated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.index(['user_id']);
  });

  // Create update_updated_at function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Apply triggers to tables
  const tablesToTrigger = [
    'users',
    'lessons',
    'vocabulary',
    'user_vocabulary_progress',
    'lesson_progress',
    'review_queue',
    'user_acquisition_metrics',
  ];

  for (const table of tablesToTrigger) {
    await knex.raw(
      `CREATE TRIGGER trg_${table}_updated_at BEFORE UPDATE ON ${table}
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();`
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  const tablesToTrigger = [
    'user_acquisition_metrics',
    'review_queue',
    'lesson_progress',
    'user_vocabulary_progress',
    'vocabulary',
    'lessons',
    'users',
  ];

  for (const table of tablesToTrigger) {
    await knex.raw(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table};`);
  }

  // Drop function
  await knex.raw('DROP FUNCTION IF EXISTS update_updated_at();');

  // Drop tables (reverse order due to foreign keys)
  const tables = [
    'user_acquisition_metrics',
    'story_comprehension',
    'story_blocks',
    'stories',
    'comprehension_questions',
    'lesson_segments',
    'vocabulary_review_history',
    'review_queue',
    'lesson_progress',
    'user_vocabulary_progress',
    'vocabulary',
    'lessons',
    'users',
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
}
