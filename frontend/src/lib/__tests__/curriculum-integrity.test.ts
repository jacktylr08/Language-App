/**
 * Invariants the curriculum DATA has to hold, independently of any component.
 *
 * These exist because content bugs don't look like bugs — nothing throws, no
 * test goes red, and the lesson renders. It just quietly teaches the wrong
 * thing. The fill-in-the-blank case below shipped and sat there: one blank
 * stored as "no fume" against a sentence starting "No fume", which made
 * FillBlankExercise's split() find nothing, print the whole sentence
 * (answer included) and leave an empty blank dangling after it.
 */
import { curriculum } from '../curriculum/es';

describe('fill-in-the-blank sentences', () => {
  it('every blank appears verbatim in its own sentence', () => {
    // FillBlankExercise renders via sentence.es.split(sentence.blank). A blank
    // that isn't found produces a one-element array — the whole sentence,
    // answer and all, with no gap to fill.
    const broken = curriculum.flatMap((lesson) =>
      lesson.sentences
        .filter((s) => !s.es.includes(s.blank))
        .map((s) => `${lesson.slug}: "${s.blank}" not found in "${s.es}"`)
    );
    expect(broken).toEqual([]);
  });

  it('no blank is empty or whitespace-only', () => {
    const empty = curriculum.flatMap((lesson) =>
      lesson.sentences.filter((s) => !s.blank.trim()).map(() => lesson.slug)
    );
    expect(empty).toEqual([]);
  });
});

describe('concept checks', () => {
  it('every correct answer is one of the options offered', () => {
    // Otherwise the question is unanswerable: no option matches, so the
    // learner is marked wrong whatever they pick.
    const broken = curriculum.flatMap((lesson) =>
      (lesson.conceptChecks ?? [])
        .filter((c) => !c.options.includes(c.correct))
        .map((c) => `${lesson.slug}: "${c.correct}" not among [${c.options.join(', ')}]`)
    );
    expect(broken).toEqual([]);
  });

  it('every question offers at least two distinct options', () => {
    const broken = curriculum.flatMap((lesson) =>
      (lesson.conceptChecks ?? [])
        .filter((c) => new Set(c.options).size < 2)
        .map((c) => `${lesson.slug}: "${c.question}"`)
    );
    expect(broken).toEqual([]);
  });
});

describe('vocabulary', () => {
  const allVocab = curriculum.flatMap((l) => l.vocab.map((v) => ({ ...v, lesson: l.slug })));

  it('ids are unique across the whole course', () => {
    // Progress and FSRS scheduling are keyed by id — a collision means two
    // words sharing one memory model.
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const v of allVocab) {
      const prior = seen.get(v.id);
      if (prior) collisions.push(`${v.id} in both ${prior} and ${v.lesson}`);
      else seen.set(v.id, v.lesson);
    }
    expect(collisions).toEqual([]);
  });

  /**
   * Same Spanish AND same English under two ids is a genuine duplicate: the
   * learner's history for the word is split across two FSRS cards, so a word
   * they've drilled to mastery reappears as brand new.
   *
   * Three of these predate this test. They're listed rather than fixed here
   * because merging ids has to carry existing learner progress forward, which
   * is a data migration, not a content edit. The point of the list is that it
   * can only ever shrink — a new duplicate fails this test.
   */
  const KNOWN_DUPLICATES = ['el regalo|gift', 'el vecino|neighbour', 'el billete|ticket'];

  it('does not introduce new duplicate words', () => {
    const byPair = new Map<string, string[]>();
    for (const v of allVocab) {
      const key = `${v.es.toLowerCase()}|${v.en.toLowerCase()}`;
      byPair.set(key, [...(byPair.get(key) ?? []), v.id]);
    }
    const duplicates = [...byPair.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([pair]) => pair)
      .filter((pair) => !KNOWN_DUPLICATES.includes(pair));

    expect(duplicates).toEqual([]);
  });

  it('every word has the fields the exercise engine renders', () => {
    // A missing pron/example doesn't crash — it renders as an empty teach
    // card, which is worse, because it looks deliberate.
    const incomplete = allVocab
      .filter((v) => !v.es.trim() || !v.en.trim() || !v.pron.trim() || !v.exampleEs.trim() || !v.exampleEn.trim())
      .map((v) => `${v.lesson}: ${v.id}`);
    expect(incomplete).toEqual([]);
  });
});

describe('course structure', () => {
  it('has no gap in the week sequence', () => {
    const weeks = new Set(curriculum.map((l) => l.week));
    const missing = [];
    for (let w = 1; w <= Math.max(...weeks); w++) if (!weeks.has(w)) missing.push(w);
    expect(missing).toEqual([]);
  });

  it('gives every lesson a unique slug', () => {
    const slugs = curriculum.map((l) => l.slug);
    expect(slugs.length).toBe(new Set(slugs).size);
  });

  it('gives every non-review lesson something to teach', () => {
    // Review lessons deliberately carry no vocab — they pull from earlier
    // lessons. Everything else needs its own material or the generated
    // session is empty.
    const empty = curriculum.filter((l) => !l.isReview && l.vocab.length === 0).map((l) => l.slug);
    expect(empty).toEqual([]);
  });
});
