import type { Knex } from 'knex';

/**
 * Normalizes the casing of emails that were stored before normalization
 * existed.
 *
 * Registration/login started lowercasing addresses without ever migrating the
 * rows already in the table. Combined with a case-sensitive `=` lookup, every
 * account whose stored address contained an uppercase character became
 * invisible to login — indistinguishable, from the learner's side, from the
 * account having been deleted.
 *
 * The lookup itself is now case-insensitive (see findByEmail in
 * services/auth.ts), so this migration is belt-and-braces: it makes the stored
 * data consistent so the unique index actually means what it claims.
 *
 * Deliberately NON-destructive. If two rows only differ by case (a learner who
 * got locked out and re-registered, creating an empty duplicate), lowercasing
 * both would violate the unique index — so those are left exactly as they are
 * and reported instead. Merging two accounts is a judgement call about whose
 * data wins; it is not something a migration should decide silently.
 * scripts/recover-account.ts handles those case by case.
 */
export async function up(knex: Knex): Promise<void> {
  const { rows: collisions } = await knex.raw<{ rows: { normalized: string }[] }>(
    'SELECT LOWER(email) AS normalized FROM users GROUP BY LOWER(email) HAVING COUNT(*) > 1'
  );

  if (collisions.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[010] ${collisions.length} address(es) exist as more than one account differing only by ` +
        'case. Left untouched — resolve with scripts/recover-account.ts: ' +
        collisions.map((r) => r.normalized).join(', ')
    );
  }

  // Only rows that would not collide once lowercased.
  const { rowCount } = await knex.raw(
    `UPDATE users u
        SET email = LOWER(u.email)
      WHERE u.email <> LOWER(u.email)
        AND NOT EXISTS (
          SELECT 1 FROM users other
           WHERE other.id <> u.id
             AND LOWER(other.email) = LOWER(u.email)
        )`
  );

  // eslint-disable-next-line no-console
  console.log(`[010] Lowercased ${rowCount ?? 0} previously mixed-case email(s).`);
}

/**
 * Irreversible by nature — the original casing isn't recorded anywhere, and
 * it carries no meaning (addresses are case-insensitive in practice). A no-op
 * down is honest here; throwing would block rolling back unrelated migrations.
 */
export async function down(): Promise<void> {
  /* nothing to undo */
}
