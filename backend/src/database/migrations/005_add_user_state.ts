import type { Knex } from 'knex';

/**
 * A single JSON blob of per-user client state (learning progress, tutor memory,
 * onboarding flag). The frontend keeps this in localStorage for instant,
 * offline-friendly reads; this table is the cross-device source of truth it
 * syncs to, so the same account shares one brain across laptop and phone.
 *
 * Kept as one jsonb document on purpose: the client's progress model
 * (localStorage) can evolve without a migration each time, and merging is done
 * in one place.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_state', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.jsonb('data').notNullable().defaultTo('{}');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_state');
}
