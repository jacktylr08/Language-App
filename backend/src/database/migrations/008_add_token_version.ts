import type { Knex } from 'knex';

/**
 * Token revocation via a per-user version counter.
 *
 * Every access/refresh JWT embeds the user's `token_version` at issuance.
 * Bumping this column (done on password change) instantly invalidates every
 * token issued before the bump, even though JWTs are otherwise stateless and
 * can't be individually revoked — the auth middleware rejects any token
 * whose embedded version doesn't match the current DB value.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.integer('token_version').notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('token_version');
  });
}
