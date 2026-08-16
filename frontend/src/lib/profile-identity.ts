/**
 * Telling a course's own tutor memory apart from a copy of another course's.
 *
 * Lives in its own module, with no imports, because both tutor-memory (which
 * reads profiles) and sync (which writes them) need it, and tutor-memory
 * already calls into sync — a value import the other way would close a
 * runtime cycle.
 *
 * The shape here is deliberately structural rather than LearnerProfile: these
 * three fields are all the comparison looks at.
 */
interface Identifiable {
  updatedAt?: string;
  summary?: string;
  history?: Array<{ date: string }>;
}

/**
 * A fingerprint of WHICH sessions a profile is made of.
 *
 * Deliberately not a comparison of the stored strings. The first attempt at
 * this checked byte-equality against the default course's profile, and it
 * stopped working the moment either side was touched: writing a profile adds
 * a languageId stamp, and merging rewrites field order, so two copies of the
 * same memories stopped looking alike. These fields identify the underlying
 * conversations instead — `updatedAt` is the millisecond the reflect call
 * returned, and the history dates are the exact timestamps of each session.
 * Two courses genuinely studied apart cannot collide on them.
 */
function sessionFingerprint(p: Identifiable): string {
  return JSON.stringify([p.updatedAt ?? '', p.summary ?? '', (p.history ?? []).map((h) => h.date)]);
}

/** An empty profile has nothing to identify it, so it must never match. */
function hasSubstance(p: Identifiable): boolean {
  return !!(p.updatedAt || p.summary || p.history?.length);
}

/**
 * Are these two profiles built from the same sessions — i.e. is one a copy of
 * the other rather than a memory earned in its own course?
 */
export function isSameLearnerMemory(
  a?: Identifiable | null,
  b?: Identifiable | null
): boolean {
  if (!a || !b || !hasSubstance(a)) return false;
  return sessionFingerprint(a) === sessionFingerprint(b);
}
