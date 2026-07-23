import type { Knex } from 'knex';

/**
 * Server-side refresh token records, enabling real logout and rotation.
 *
 * Only a hash of the token is stored (never the raw token) — same reasoning
 * as password hashing: a DB leak shouldn't hand out usable credentials.
 * A row is created every time a refresh token is issued (register/login/
 * refresh) and marked `revoked_at` when it's rotated (used once, at /refresh)
 * or explicitly logged out. /refresh rejects any token whose row is missing,
 * revoked, or past `expires_at`.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable().unique();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('expires_at', { useTz: true }).notNullable();
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.index('user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
