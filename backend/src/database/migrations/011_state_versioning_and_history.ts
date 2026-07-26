import type { Knex } from 'knex';

/**
 * Makes stored learner state safe to write from more than one device, and
 * recoverable when a write turns out to be wrong.
 *
 * Two gaps this closes:
 *
 * 1. PUT /state replaced the blob outright with no notion of what the client
 *    had based its write on. Two devices (or two tabs) could each pull, both
 *    edit, and the slower one would silently erase the other's progress.
 *    `version` gives writes something to check against.
 *
 * 2. There was no way back from a bad write. For a learner, progress is the
 *    entire value of the product — losing it is not an inconvenience, it's
 *    the whole thing gone. `user_state_history` keeps the previous snapshots
 *    so any single write can be undone. At a handful of users this costs
 *    almost nothing; it stays bounded by pruning to the most recent few per
 *    user on write.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_state', (table) => {
    table.integer('version').notNullable().defaultTo(1);
  });

  await knex.schema.createTable('user_state_history', (table) => {
    table.increments('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    // The state as it was BEFORE the write that superseded it.
    table.jsonb('data').notNullable();
    table.integer('version').notNullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());

    // Fetching/pruning a user's snapshots is always "newest first for one user".
    table.index(['user_id', 'id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_state_history');
  await knex.schema.alterTable('user_state', (table) => {
    table.dropColumn('version');
  });
}
