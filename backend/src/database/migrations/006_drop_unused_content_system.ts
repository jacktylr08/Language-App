import type { Knex } from 'knex';

/**
 * The app moved to a localStorage-first content model (curriculum.ts on the
 * client + the `user_state` blob from migration 005) a while back, but the
 * original DB-backed content/tutor system from migrations 001, 003, and 004
 * was never cleaned up — it's real Postgres storage, seeded on every deploy,
 * for tables no route or frontend code reads anymore. This drops it.
 *
 * `users` (and its trigger/function) are untouched — auth still depends on it.
 */
const DEAD_TABLES = [
  // from 004_add_tutor_system
  'tutor_performance',
  'tutor_messages',
  'tutor_conversations',
  // from 003_add_phase_curriculum
  'user_vocabulary_state',
  'lesson_phases',
  'vocabulary_encounters',
  // from 001_initial_schema
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
];

export async function up(knex: Knex): Promise<void> {
  for (const table of DEAD_TABLES) {
    // CASCADE handles the dense web of foreign keys between these tables
    // regardless of drop order.
    await knex.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }
}

/**
 * Deliberately irreversible. Recreating 18 tables' worth of a content system
 * nothing reads is not a real rollback path — if this system is ever wanted
 * back, it should be redesigned against the current architecture, not
 * resurrected byte-for-byte from here.
 */
export async function down(): Promise<void> {
  throw new Error(
    '006_drop_unused_content_system is not reversible — see the comment in this file.'
  );
}
