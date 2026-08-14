/**
 * Resume an interrupted lesson.
 *
 * A generated lesson runs 50–59 exercises, around eleven minutes. Per-word
 * results were already saved as they happened, so vocabulary progress
 * survived an interruption — but the lesson itself only counted as complete
 * at the final item, so a phone call at item 50 of 55 meant starting the
 * whole thing again, unstarred and still locked. On a phone that's most of
 * the reason a lesson goes unfinished.
 *
 * The whole QUEUE is stored, not just the index. The queue is shuffled at
 * build time (chunk order, distractors, challenge angles), so rebuilding it
 * and jumping to position 40 would drop the learner into a different lesson
 * at an arbitrary point. Storing the queue is the only way "40 of 55" means
 * what it says.
 *
 * Device-local by design: this is not synced. Finishing on a different
 * device than you started on is a rare case, and syncing a half-session
 * would mean resolving two partial attempts against each other for no real
 * benefit.
 */

import { lessonCheckpointKeyFor } from './keys';
import { getActiveLanguageId } from './languages';

/** Resolved per call — the active course can change between reads. */
function checkpointKey(): string {
  return lessonCheckpointKeyFor(getActiveLanguageId());
}
import type { Exercise } from './exercise-engine';
import type { SessionStats } from '@/components/lesson-engine/useLessonSession';

/** Old checkpoints are worse than none — the lesson has moved on in the learner's head. */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

export interface LessonCheckpoint {
  slug: string;
  queue: Exercise[];
  index: number;
  stats: SessionStats;
  combo: number;
  savedAt: number;
}

/**
 * Only one checkpoint is kept, for the most recent lesson. Keeping several
 * would mean a stale half-attempt at an old lesson resurfacing weeks later,
 * which is more confusing than helpful.
 */
export function saveCheckpoint(checkpoint: Omit<LessonCheckpoint, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  // Nothing done yet, or everything done — neither is worth resuming.
  if (checkpoint.index <= 0 || checkpoint.index >= checkpoint.queue.length) {
    clearCheckpoint(checkpoint.slug);
    return;
  }
  try {
    localStorage.setItem(
      checkpointKey(),
      JSON.stringify({ ...checkpoint, savedAt: Date.now() })
    );
  } catch {
    // Storage full or unavailable. Resuming is a convenience, not a
    // guarantee — the lesson still works, it just starts from the top.
  }
}

/** The saved position for this lesson, or null if there isn't a usable one. */
export function loadCheckpoint(slug: string): LessonCheckpoint | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(checkpointKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonCheckpoint;

    if (parsed.slug !== slug) return null;
    if (!Array.isArray(parsed.queue) || parsed.queue.length === 0) return null;
    if (typeof parsed.index !== 'number' || parsed.index <= 0 || parsed.index >= parsed.queue.length) {
      return null;
    }
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      clearCheckpoint(slug);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCheckpoint(slug?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (slug) {
      // Don't wipe another lesson's checkpoint on this lesson's completion.
      const raw = localStorage.getItem(checkpointKey());
      if (raw && (JSON.parse(raw) as LessonCheckpoint).slug !== slug) return;
    }
    localStorage.removeItem(checkpointKey());
  } catch {
    /* nothing to clear */
  }
}
