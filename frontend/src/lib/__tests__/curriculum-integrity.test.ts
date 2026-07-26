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

  it('every blank names a word that exists in its own lesson', () => {
    // A wordId pointing at a word from a DIFFERENT lesson would send the
    // result to the wrong FSRS card just as surely as the old guess did.
    const broken = curriculum.flatMap((lesson) =>
      lesson.sentences
        .filter((s) => s.wordId && !lesson.vocab.some((w) => w.id === s.wordId))
        .map((s) => `${lesson.slug}: wordId "${s.wordId}" is not in this lesson's vocab`)
    );
    expect(broken).toEqual([]);
  });

  it('every blank resolves to a word, so no result is recorded against the wrong one', () => {
    // The engine used to fall back to lessonVocab[0] when its substring guess
    // failed — 26 of 246 sentences (11%), mostly conjugated forms like
    // "Trabajo" against the infinitive "trabajar", all landing on whichever
    // word happened to be listed first.
    const unresolved = curriculum.flatMap((lesson) =>
      lesson.sentences
        .filter((s) => {
          if (s.wordId) return false;
          return !lesson.vocab.some((w) =>
            s.blank.toLowerCase().includes(w.es.replace(/^(el|la|yo|tú|él|ella|nosotros)\s+/i, '').toLowerCase())
          );
        })
        .map((s) => `${lesson.slug}: "${s.blank}" needs an explicit wordId`)
    );
    expect(unresolved).toEqual([]);
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

  it('teaches no word twice under two ids', () => {
    // Same Spanish AND same English under two ids splits the learner's memory
    // of the word across two FSRS cards, so something drilled to mastery
    // reappears as brand new. Three of these existed (el regalo, el vecino,
    // el billete) — each was re-teaching in a later lesson a word an earlier
    // one had already covered, wasting the slot as well as the history.
    const byPair = new Map<string, string[]>();
    for (const v of allVocab) {
      const key = `${v.es.toLowerCase()}|${v.en.toLowerCase()}`;
      byPair.set(key, [...(byPair.get(key) ?? []), v.id]);
    }
    const duplicates = [...byPair.entries()]
      .filter(([, ids]) => ids.length > 1)
      .map(([pair, ids]) => `${pair} (${ids.join(', ')})`);

    expect(duplicates).toEqual([]);
  });

  it('accepts every meaning of a word that has more than one', () => {
    // "rico" is both delicious and rich — two legitimate entries sharing a
    // surface form, NOT a duplicate. But a recall exercise shows the Spanish
    // and grades the typed English, so unless each entry also accepts the
    // other's meaning, a learner who answers "rich" for "rico" is marked
    // wrong for being right.
    const bySurface = new Map<string, typeof allVocab>();
    for (const v of allVocab) {
      const key = v.es.toLowerCase();
      bySurface.set(key, [...(bySurface.get(key) ?? []), v]);
    }

    const unfair: string[] = [];
    for (const [surface, entries] of bySurface) {
      if (entries.length < 2) continue;
      for (const v of entries) {
        const accepted = [v.en, ...(v.enAlt ?? [])].map((e) => e.toLowerCase());
        for (const other of entries) {
          if (other.id === v.id) continue;
          if (!accepted.includes(other.en.toLowerCase())) {
            unfair.push(`"${surface}" (${v.id}) rejects "${other.en}", which ${other.id} says it means`);
          }
        }
      }
    }
    expect(unfair).toEqual([]);
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

  it('gives every non-review lesson a dialogue', () => {
    // Grammar was taught as slides and drills alone in 41 of 54 lessons —
    // including the whole spine (both preterites, the imperfect, the
    // subjunctive pair, object pronouns, the perfect, the conditional).
    // Those are exactly the structures a learner only internalises by
    // hearing them used in an exchange.
    const missing = curriculum.filter((l) => !l.isReview && !l.dialogue?.length).map((l) => l.slug);
    expect(missing).toEqual([]);
  });

  it('writes dialogues as a real exchange, not a monologue', () => {
    const bad = curriculum
      .filter((l) => l.dialogue?.length)
      .flatMap((l) => {
        const turns = l.dialogue!;
        const speakers = new Set(turns.map((t) => t.speaker));
        const problems: string[] = [];
        if (turns.length < 6) problems.push(`${l.slug}: only ${turns.length} turns`);
        if (speakers.size < 2) problems.push(`${l.slug}: only one speaker`);
        if (turns.some((t) => !t.es.trim() || !t.en.trim())) problems.push(`${l.slug}: a turn is missing text`);
        return problems;
      });
    expect(bad).toEqual([]);
  });

  it('gives every non-review lesson something to teach', () => {
    // Review lessons deliberately carry no vocab — they pull from earlier
    // lessons. Everything else needs its own material or the generated
    // session is empty.
    const empty = curriculum.filter((l) => !l.isReview && l.vocab.length === 0).map((l) => l.slug);
    expect(empty).toEqual([]);
  });
});
