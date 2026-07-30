/**
 * The sentence section's scoping rule.
 *
 * The requirement is "everything I've covered, nothing I haven't", and getting
 * it wrong is invisible in the UI: the section still works, it just quietly
 * asks a learner to produce a structure they were never taught, which is
 * exactly the experience the section exists to fix.
 */
import {
  completedSlugs,
  sentencesInScope,
  buildSentenceSession,
  sentenceScopeSummary,
  sentenceSectionReady,
  nextStage,
} from '../sentence-scope';
import { getSentenceBank, sentencesForLesson, sentenceId } from '../sentence-bank';
import { completeLessonLocal, placeLearnerAtWeek, loadProgress, recordSentenceResult } from '../progress';
import { getCurriculum } from '../curriculum';

const curriculum = getCurriculum();
const ordered = [...curriculum].sort((a, b) => a.week - b.week || a.order - b.order);

beforeEach(() => localStorage.clear());

describe('the bank itself', () => {
  it('harvests a substantial number of authored sentences', () => {
    // If this collapses, the section silently has nothing to teach with.
    expect(getSentenceBank().length).toBeGreaterThan(500);
  });

  it('never includes a single word — that is vocabulary, not composition', () => {
    expect(getSentenceBank().every((s) => s.words >= 2)).toBe(true);
  });

  it('gives every sentence an English meaning to produce it from', () => {
    expect(getSentenceBank().every((s) => s.en.trim().length > 0)).toBe(true);
  });

  it('ids are stable against reordering but change with the text', () => {
    expect(sentenceId('family', 'Mi madre es doctora')).toBe(
      sentenceId('family', 'Mi madre es doctora')
    );
    expect(sentenceId('family', 'Mi madre es doctora')).not.toBe(
      sentenceId('family', 'Mi padre es doctor')
    );
    // Same text in a different lesson is a different production target.
    expect(sentenceId('family', 'Hola')).not.toBe(sentenceId('greetings-essentials', 'Hola'));
  });

  it('ids are unique across the whole bank', () => {
    const ids = getSentenceBank().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('nothing more — scope never runs ahead of the learner', () => {
  it('gives a brand-new learner nothing at all', () => {
    expect(sentencesInScope()).toEqual([]);
    expect(sentenceSectionReady()).toBe(false);
    expect(buildSentenceSession()).toEqual([]);
  });

  it('unlocks exactly the lessons completed, and no others', () => {
    completeLessonLocal(ordered[0].slug, 90);
    completeLessonLocal(ordered[1].slug, 90);

    expect(completedSlugs()).toEqual([ordered[0].slug, ordered[1].slug]);

    const scopeSlugs = new Set(sentencesInScope().map((s) => s.slug));
    expect(scopeSlugs).toEqual(new Set([ordered[0].slug, ordered[1].slug]));
  });

  it('never includes a lesson that is merely unlocked but unfinished', () => {
    completeLessonLocal(ordered[0].slug, 90);
    // ordered[1] is now unlocked, but not done.
    const scopeSlugs = new Set(sentencesInScope().map((s) => s.slug));
    expect(scopeSlugs.has(ordered[1].slug)).toBe(false);
  });

  it('every sentence a session offers comes from a completed lesson', () => {
    for (const l of ordered.slice(0, 6)) completeLessonLocal(l.slug, 90);
    const done = new Set(completedSlugs());
    const session = buildSentenceSession();
    expect(session.length).toBeGreaterThan(0);
    expect(session.every((s) => done.has(s.slug))).toBe(true);
  });

  it('counts placement at onboarding as covered', () => {
    // The learner asserted they know this material, and the same claim already
    // raises the tutor's ceiling — refusing it here would leave someone placed
    // at week 12 with an empty section.
    placeLearnerAtWeek(5);
    expect(sentencesInScope().length).toBeGreaterThan(0);
    expect(sentenceSectionReady()).toBe(true);
  });
});

describe('nothing less — scope reaches across the whole history', () => {
  it('draws from early lessons, not just the most recent one', () => {
    for (const l of ordered.slice(0, 8)) completeLessonLocal(l.slug, 90);
    const session = buildSentenceSession();
    const weeks = new Set(session.map((s) => s.week));
    // A session that only ever surfaced the newest lesson would be a single
    // week — the complaint being fixed is precisely that older material never
    // gets produced.
    expect(session.some((s) => s.slug === ordered[0].slug)).toBe(true);
    expect(weeks.size).toBeGreaterThanOrEqual(1);
  });

  it('keeps early lessons in play without confining the session to them', () => {
    // This used to assert strict oldest-lesson-first ordering, which WAS the
    // bug: a learner several lessons in got a session made entirely of week
    // one and never saw the material they'd just finished. The real
    // requirement is that the whole covered range stays reachable.
    for (const l of ordered.slice(0, 8)) completeLessonLocal(l.slug, 90);
    const session = buildSentenceSession();
    const weeks = new Set(session.map((s) => s.week));
    expect(weeks.size).toBeGreaterThan(1);
  });

  it('includes every completed lesson that has material, given enough sessions', () => {
    for (const l of ordered.slice(0, 5)) completeLessonLocal(l.slug, 90);
    const withMaterial = ordered
      .slice(0, 5)
      .filter((l) => sentencesForLesson(l.slug).length > 0)
      .map((l) => l.slug);
    const reachable = new Set(sentencesInScope().map((s) => s.slug));
    for (const slug of withMaterial) expect(reachable.has(slug)).toBe(true);
  });
});

describe('the support ladder', () => {
  it('climbs tiles → skeleton → free and then stops', () => {
    expect(nextStage('tiles')).toBe('skeleton');
    expect(nextStage('skeleton')).toBe('free');
    expect(nextStage('free')).toBeNull();
  });

  it('starts every unseen sentence at full support', () => {
    completeLessonLocal(ordered[0].slug, 90);
    expect(buildSentenceSession().every((s) => s.stage === 'tiles' && s.fresh)).toBe(true);
  });

  it('promotes one rung on a correct answer, not straight to free', () => {
    completeLessonLocal(ordered[0].slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    expect(loadProgress().sentences![first.id].stage).toBe('skeleton');
  });

  it('demotes only one rung on a wrong answer', () => {
    completeLessonLocal(ordered[0].slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    recordSentenceResult(first.id, true, 'skeleton');
    expect(loadProgress().sentences![first.id].stage).toBe('free');
    recordSentenceResult(first.id, false, 'free');
    // Back to skeleton — not all the way to tiles. Wiping real progress for
    // one slip is the regression that has bitten this app before.
    expect(loadProgress().sentences![first.id].stage).toBe('skeleton');
  });

  it('never demotes below the first rung', () => {
    completeLessonLocal(ordered[0].slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, false, 'tiles');
    expect(loadProgress().sentences![first.id].stage).toBe('tiles');
  });

  it('cannot be promoted past the recorded stage by a stale replay', () => {
    completeLessonLocal(ordered[0].slug, 90);
    const first = buildSentenceSession()[0];
    // A tab left open on an old session claiming a `free` success when the
    // learner is really still on tiles must not skip two rungs.
    recordSentenceResult(first.id, true, 'free');
    expect(loadProgress().sentences![first.id].stage).toBe('skeleton');
  });

  it('records attempt counts for both outcomes', () => {
    completeLessonLocal(ordered[0].slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    recordSentenceResult(first.id, false, 'skeleton');
    const st = loadProgress().sentences![first.id];
    expect(st.correct).toBe(1);
    expect(st.wrong).toBe(1);
  });
});

describe('variety and rung mix — the two things the first version got wrong', () => {
  /**
   * Reported after shipping: "it's basically the same 10 questions over and
   * over and it only does the build it round." Both were real, and both were
   * invisible to the original tests because they only ever asserted on a
   * single session in isolation.
   */
  it('does not hand back an identical session every time', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    const p = loadProgress();
    const a = buildSentenceSession(p).map((s) => s.id);
    const b = buildSentenceSession(p).map((s) => s.id);
    const c = buildSentenceSession(p).map((s) => s.id);
    // Leaving a session without answering used to return the exact same ten.
    expect(a.join() === b.join() && b.join() === c.join()).toBe(false);
  });

  it('spreads new material across every completed lesson, not just the oldest', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    const slugs = new Set(buildSentenceSession().map((s) => s.slug));
    // Oldest-first ordering meant a 10-sentence session came entirely from
    // lesson one, so someone ten lessons in never saw their recent work.
    expect(slugs.size).toBeGreaterThan(3);
  });

  it('surfaces higher rungs instead of drowning them in fresh tiles', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    // Put a handful of sentences part-way up the ladder.
    const inFlightIds = buildSentenceSession(loadProgress(), 6).map((s) => s.id);
    for (const id of inFlightIds) recordSentenceResult(id, true, 'tiles');

    // Past the short cooldown, but with hundreds of untouched sentences still
    // available — the situation where tiles used to crowd everything out.
    const later = Date.now() + 60 * 60 * 1000;
    const session = buildSentenceSession(loadProgress(), 10, later);
    const stages = new Set(session.map((s) => s.stage));
    expect(stages.has('skeleton')).toBe(true);
    expect(session.filter((s) => s.stage === 'skeleton').length).toBeGreaterThanOrEqual(3);
  });

  it('offers all three rungs in one session once the learner has material at each', () => {
    // The complaint in one assertion. Fresh sentences are always at `tiles`
    // and there are hundreds of them, so without reserved shares both higher
    // rungs are unreachable — including `free`, which previously only filled
    // leftover slots that never existed.
    for (const l of ordered.slice(0, 6)) completeLessonLocal(l.slug, 90);
    const ids = sentencesInScope()
      .slice(0, 8)
      .map((s) => s.id);
    ids.forEach((id, i) => {
      recordSentenceResult(id, true, 'tiles');
      if (i % 2 === 0) recordSentenceResult(id, true, 'skeleton');
    });

    const later = Date.now() + 60 * 60 * 1000;
    const stages = new Set(buildSentenceSession(loadProgress(), 10, later).map((s) => s.stage));
    expect(stages.has('tiles')).toBe(true);
    expect(stages.has('skeleton')).toBe(true);
    expect(stages.has('free')).toBe(true);
  });

  it('still returns a full session when nothing is in flight yet', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    expect(buildSentenceSession(loadProgress(), 10).length).toBe(10);
  });

  it('still returns a full session when everything available is in flight', () => {
    // Only the first lesson, so the pool is small and mostly on the ladder.
    completeLessonLocal(ordered[0].slug, 90);
    const all = sentencesInScope();
    for (const s of all) recordSentenceResult(s.id, true, 'tiles');
    const later = Date.now() + 60 * 60 * 1000;
    const session = buildSentenceSession(loadProgress(), 5, later);
    expect(session.length).toBe(Math.min(5, all.length));
  });

  it('opens the session on the lowest rung available', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    const ids = buildSentenceSession(loadProgress(), 6).map((s) => s.id);
    for (const id of ids) recordSentenceResult(id, true, 'tiles');
    const later = Date.now() + 60 * 60 * 1000;
    const session = buildSentenceSession(loadProgress(), 10, later);
    const ranks = session.map((s) => ['tiles', 'skeleton', 'free'].indexOf(s.stage));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('lets a sentence practised earlier today come back the same evening', () => {
    // The six-hour lock meant the ladder could not advance within a day.
    for (const l of ordered.slice(0, 3)) completeLessonLocal(l.slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    const inHalfAnHour = Date.now() + 30 * 60 * 1000;
    const session = buildSentenceSession(loadProgress(), 10, inHalfAnHour);
    expect(session.some((s) => s.id === first.id && s.stage === 'skeleton')).toBe(true);
  });
});

describe('session composition', () => {
  it('does not immediately repeat a sentence just practised', () => {
    for (const l of ordered.slice(0, 6)) completeLessonLocal(l.slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    expect(buildSentenceSession().some((s) => s.id === first.id)).toBe(false);
  });

  it('brings a cooled-down in-flight sentence back, at its next rung', () => {
    for (const l of ordered.slice(0, 6)) completeLessonLocal(l.slug, 90);
    const first = buildSentenceSession()[0];
    recordSentenceResult(first.id, true, 'tiles');
    // Well past the cooldown.
    const later = Date.now() + 48 * 60 * 60 * 1000;
    const session = buildSentenceSession(loadProgress(), 10, later);
    // Guaranteed a place, rather than guaranteed to be first — the session is
    // ordered easiest-rung-first so it opens on something winnable, which
    // puts any remaining `tiles` sentences ahead of it.
    const entry = session.find((s) => s.id === first.id);
    expect(entry).toBeDefined();
    expect(entry!.stage).toBe('skeleton');
  });

  it('caps the session at the requested size', () => {
    for (const l of ordered.slice(0, 10)) completeLessonLocal(l.slug, 90);
    expect(buildSentenceSession(loadProgress(), 4).length).toBe(4);
  });

  it('summary numbers agree with what the session can actually draw from', () => {
    for (const l of ordered.slice(0, 5)) completeLessonLocal(l.slug, 90);
    const summary = sentenceScopeSummary();
    expect(summary.total).toBe(sentencesInScope().length);
    expect(summary.fresh + summary.learning + summary.free).toBe(summary.total);
    expect(summary.lessons).toBe(5);
  });
});
