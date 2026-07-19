import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Store tutor conversation sessions
  await knex.schema.createTable('tutor_conversations', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('lesson_id').notNullable().references('id').inTable('lessons');
    table.uuid('user_id').notNullable().references('id').inTable('users');
    table.string('status').defaultTo('active'); // active, completed
    table.integer('performance_score').defaultTo(0); // 0-100, overall performance in this session
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'lesson_id']);
    table.index(['user_id', 'status']);
    table.index(['lesson_id', 'created_at']);
  });

  // Store individual messages in a conversation
  await knex.schema.createTable('tutor_messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('tutor_conversations');
    table.string('role').notNullable(); // user, assistant
    table.text('content').notNullable(); // Message text
    table.string('message_type').nullable(); // teaching, question, feedback, explanation, correction
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['conversation_id', 'created_at']);
  });

  // Track performance on individual questions/tasks in the tutoring session
  await knex.schema.createTable('tutor_performance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('conversation_id').notNullable().references('id').inTable('tutor_conversations');
    table.uuid('vocabulary_id').nullable().references('id').inTable('vocabulary'); // Word being tested
    table.boolean('correct').notNullable(); // Was the response correct?
    table.text('user_response').notNullable(); // What the user said/typed
    table.text('expected_response').nullable(); // What we expected (can vary)
    table.text('tutor_feedback').nullable(); // Tutor's feedback on the response
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['conversation_id', 'created_at']);
    table.index(['vocabulary_id', 'correct']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tutor_performance');
  await knex.schema.dropTableIfExists('tutor_messages');
  await knex.schema.dropTableIfExists('tutor_conversations');
}
