import type { Knex } from 'knex';

/**
 * Web Push subscriptions for practice reminders (e.g. "you're about to lose
 * your streak"). A learner can have more than one device subscribed at once,
 * so this is one row per subscription (per browser/device), not per user —
 * unlike user_state, which is one shared blob per account.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('push_subscriptions', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('endpoint').notNullable().unique();
    table.text('p256dh').notNullable();
    table.text('auth').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
  await knex.schema.alterTable('push_subscriptions', (table) => {
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('push_subscriptions');
}
