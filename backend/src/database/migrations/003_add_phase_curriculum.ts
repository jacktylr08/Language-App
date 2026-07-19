import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add phase/curriculum columns to lessons table
  await knex.schema.table('lessons', (table) => {
    table.integer('phase').nullable();
    table.integer('week_number').nullable();
    table.integer('lesson_order').nullable();
    table.string('theme_category').nullable();
    table.string('lesson_type').defaultTo('listening_comprehension');
    table.integer('prerequisite_vocabulary_count').defaultTo(0);
    table.index(['phase', 'week_number', 'lesson_order']);
  });

  // Add mastery tracking to vocabulary
  await knex.schema.table('vocabulary', (table) => {
    table.integer('passive_encounters').defaultTo(0);
    table.timestamp('passive_encounters_updated_at').nullable();
    table.string('mastery_level').defaultTo('new');
  });

  // Create table to log every passive encounter
  await knex.schema.createTable('vocabulary_encounters', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('vocabulary_id').notNullable().references('id').inTable('vocabulary');
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.enum('encounter_type', ['listening', 'reading']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'vocabulary_id']);
    table.index(['vocabulary_id', 'created_at']);
    table.index(['lesson_id', 'created_at']);
  });

  // Create lesson_phases table for explicit curriculum structure
  await knex.schema.createTable('lesson_phases', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons');
    table.integer('phase').notNullable(); // 1, 2, 3, 4
    table.integer('week_number').notNullable(); // 1-52
    table.string('theme_category').notNullable(); // food, family, travel, work, media
    table.string('theme_color').notNullable(); // #F97316 (orange), #DC2626 (red), etc.
    table.integer('order_in_week').notNullable(); // 1-7, order within week
    table.integer('requires_passive_encounters').defaultTo(0); // Gate behind word encounters
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['phase', 'week_number', 'order_in_week']);
    table.index(['phase', 'week_number']);
  });

  // Create user vocabulary state table (tracks SM-2 state per user)
  await knex.schema.createTable('user_vocabulary_state', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.uuid('vocabulary_id').notNullable().references('id').inTable('vocabulary');

    // SM-2 algorithm state
    table.enum('state', ['new', 'learning', 'review', 'mastered']).defaultTo('new');
    table.float('ease_factor').defaultTo(2.5); // SM-2 ease factor
    table.integer('interval').defaultTo(0); // Days until next review
    table.integer('repetitions').defaultTo(0); // Number of successful reviews
    table.timestamp('last_reviewed_at').nullable();
    table.timestamp('next_review_at').nullable();

    // Passive encounter tracking
    table.integer('passive_encounter_count').defaultTo(0);
    table.timestamp('passive_encounters_updated_at').nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'vocabulary_id']);
    table.index(['user_id', 'state']);
    table.index(['user_id', 'next_review_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop new tables
  await knex.schema.dropTableIfExists('user_vocabulary_state');
  await knex.schema.dropTableIfExists('lesson_phases');
  await knex.schema.dropTableIfExists('vocabulary_encounters');

  // Drop new columns
  await knex.schema.table('vocabulary', (table) => {
    table.dropColumn('passive_encounters');
    table.dropColumn('passive_encounters_updated_at');
    table.dropColumn('mastery_level');
  });

  await knex.schema.table('lessons', (table) => {
    table.dropColumn('phase');
    table.dropColumn('week_number');
    table.dropColumn('lesson_order');
    table.dropColumn('theme_category');
    table.dropColumn('lesson_type');
    table.dropColumn('prerequisite_vocabulary_count');
  });
}
