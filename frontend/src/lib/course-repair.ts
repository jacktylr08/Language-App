/**
 * Undoing progress that leaked from one course into another.
 *
 * For a period, the sync layer wrote the account's single server-side state
 * blob into whichever course happened to be active. Switching to Italian
 * therefore copied the learner's SPANISH progress into the Italian key: 108
 * words "known", lessons up to week 5 marked complete, a streak that was never
 * earned there.
 *
 * Fixing the sync (see lib/sync.ts) stops that happening again, but it does
 * nothing about the copies already sitting in local storage — and, worse, the
 * corrected sync would then dutifully upload them under the right language key
 * and make the corruption permanent. Repairing on read is what actually clears
 * it, and it has to run before anything renders a number.
 *
 * The detection is exact rather than heuristic. Every vocabulary id is unique
 * to its course, so a word id in the Italian progress that belongs to the
 * Spanish curriculum is proof the blob was copied — no guessing involved.
 */

import { getCurriculumFor, getRegisteredCurriculumLanguages } from './curriculum';
import type { ProgressState } from './progress';

interface CourseIndex {
  words: Set<string>;
  slugs: Set<string>;
}

const indexCache = new Map<string, CourseIndex>();

function indexFor(languageId: string): CourseIndex {
  const cached = indexCache.get(languageId);
  if (cached) return cached;
  const curriculum = getCurriculumFor(languageId);
  const built: CourseIndex = {
    words: new Set(curriculum.flatMap((l) => l.vocab.map((v) => v.id))),
    slugs: new Set(curriculum.map((l) => l.slug)),
  };
  indexCache.set(languageId, built);
  return built;
}

export interface RepairResult {
  state: ProgressState;
  /** True when something foreign was found and removed. */
  repaired: boolean;
}

/**
 * Strips anything belonging to a different course out of one course's progress.
 *
 * Deliberately conservative in one direction and decisive in the other:
 *
 *  - A word id that belongs to NO registered course is left alone. That's a
 *    renamed or retired vocabulary item, not contamination, and deleting it
 *    would throw away real review history.
 *  - A word id that belongs to ANOTHER course is removed, and its presence is
 *    what marks the whole blob as copied.
 *  - Once a blob is known to be copied, any lesson slug the contaminating
 *    course also has is removed too. Both courses have `greetings-essentials`,
 *    and there is no way to tell a genuinely-earned completion from a copied
 *    one — but a lesson wrongly marked complete is worse than one you're asked
 *    to redo, because it silently locks material you have never seen. Slugs
 *    unique to this course (`essere-identity`) are untouched, which is exactly
 *    why they still showed as unstarted while the shared ones did not.
 */
export function repairProgressForLanguage(
  languageId: string,
  state: ProgressState
): RepairResult {
  const own = indexFor(languageId);
  const others = getRegisteredCurriculumLanguages().filter((id) => id !== languageId);
  if (others.length === 0) return { state, repaired: false };

  const foreignWords = new Set<string>();
  const foreignSlugs = new Set<string>();
  for (const id of others) {
    const other = indexFor(id);
    for (const w of other.words) if (!own.words.has(w)) foreignWords.add(w);
    for (const s of other.slugs) foreignSlugs.add(s);
  }

  const wordIds = Object.keys(state.words ?? {});
  const contaminated = wordIds.some((id) => foreignWords.has(id));
  if (!contaminated) return { state, repaired: false };

  const words: ProgressState['words'] = {};
  for (const [id, w] of Object.entries(state.words ?? {})) {
    if (!foreignWords.has(id)) words[id] = w;
  }

  const lessons: ProgressState['lessons'] = {};
  for (const [slug, rec] of Object.entries(state.lessons ?? {})) {
    // Keep only what this course alone could have produced.
    if (!foreignSlugs.has(slug)) lessons[slug] = rec;
  }

  const sentences: NonNullable<ProgressState['sentences']> = {};
  for (const [id, s] of Object.entries(state.sentences ?? {})) {
    // Sentence ids are `${slug}:${hash}` — keep those whose lesson survived.
    const slug = id.slice(0, id.lastIndexOf(':'));
    if (slug && lessons[slug]) sentences[id] = s;
  }

  const nothingLeft =
    Object.keys(lessons).length === 0 && Object.keys(words).length === 0;

  // With nothing genuine left, this course was never actually started here —
  // so the streak and activity days it inherited aren't its own either.
  const repaired: ProgressState = nothingLeft
    ? {
        streak: 0,
        bestStreak: 0,
        lastActiveDay: '',
        activeDays: [],
        lessons: {},
        words: {},
      }
    : {
        ...state,
        lessons,
        words,
        ...(Object.keys(sentences).length ? { sentences } : {}),
      };

  return { state: repaired, repaired: true };
}

/** Test seam — the caches are keyed by language and otherwise never invalidated. */
export function resetCourseIndexCacheForTest(): void {
  indexCache.clear();
}
