/**
 * Marking a produced sentence.
 *
 * Both failure directions are costly here. Too strict and a learner who wrote
 * a correct sentence without an accent is told they're wrong, which is the
 * fastest way to make someone stop trying to produce anything. Too lenient and
 * the section certifies sentences that aren't Spanish.
 */
import { checkSentence, buildSkeleton, buildTiles } from '../sentence-check';

describe('marking', () => {
  const target = 'Mi madre es doctora';

  it('accepts an exact answer', () => {
    const r = checkSentence('Mi madre es doctora', target);
    expect(r.correct).toBe(true);
    expect(r.nearMiss).toBe(false);
    expect(r.words.every((w) => w.verdict === 'correct')).toBe(true);
  });

  it('ignores case and punctuation', () => {
    expect(checkSentence('mi madre es doctora.', target).correct).toBe(true);
    expect(checkSentence('¡MI MADRE ES DOCTORA!', target).correct).toBe(true);
  });

  it('accepts a missing accent but flags it', () => {
    const r = checkSentence('El cafe esta aqui', 'El café está aquí');
    expect(r.correct).toBe(true);
    expect(r.nearMiss).toBe(true);
    expect(r.note).toMatch(/accent/i);
  });

  it('accepts a single-character typo in a longer word', () => {
    const r = checkSentence('Mi madre es doctorra', target);
    expect(r.correct).toBe(true);
    expect(r.nearMiss).toBe(true);
  });

  it('rejects a genuinely different word and names it', () => {
    const r = checkSentence('Mi padre es doctora', target);
    expect(r.correct).toBe(false);
    expect(r.note).toContain('padre');
    expect(r.note).toContain('madre');
  });

  it('never forgives a word the course teaches as a typo, however close', () => {
    // padre/madre are one keystroke apart, so edit distance alone waves this
    // through. Spanish is full of meaningful minimal pairs, and a learner
    // composing from course material substitutes course words — so knowing
    // the course's own vocabulary is what closes the real gap here.
    expect(checkSentence('Mi padre es doctora', 'Mi madre es doctora').correct).toBe(false);
    expect(checkSentence('Tengo un hermano', 'Tengo un hermana').correct).toBe(false);
  });

  it('documents the limit: an untaught word can still pass as a typo', () => {
    // `cosa` is not in the curriculum, so the checker cannot know it is a real
    // Spanish word and forgives it as a slip for `casa`. Pinning this keeps
    // the guarantee honest — it is "no course word is forgiven", not "no
    // Spanish word is forgiven", which would need a full dictionary.
    expect(checkSentence('La cosa es grande', 'La casa es grande').correct).toBe(true);
  });

  it('still forgives a genuine typo that is not a word', () => {
    expect(checkSentence('Mi madre es doctoraa', target).correct).toBe(true);
  });

  it('enforces word order — Spanish word order carries meaning', () => {
    // A bag of correct words is not a produced sentence, and this section
    // exists specifically to train composition.
    expect(checkSentence('Madre mi doctora es', target).correct).toBe(false);
  });

  it('reports a missing word rather than silently truncating', () => {
    const r = checkSentence('Mi madre es', target);
    expect(r.correct).toBe(false);
    expect(r.words.some((w) => w.verdict === 'missing')).toBe(true);
    expect(r.note).toMatch(/missing/i);
  });

  it('reports an extra word', () => {
    const r = checkSentence('Mi madre es doctora buena', target);
    expect(r.correct).toBe(false);
    expect(r.words.some((w) => w.verdict === 'extra')).toBe(true);
  });

  it('rejects an empty answer', () => {
    expect(checkSentence('', target).correct).toBe(false);
    expect(checkSentence('   ', target).correct).toBe(false);
  });

  it('names only the first problem, not every one', () => {
    // A wall of corrections on a half-known sentence reads as failure.
    const r = checkSentence('Su padre es enfermero', target);
    expect(r.correct).toBe(false);
    expect(r.note.split('should be').length).toBe(2);
  });

  it('returns no note at all when the answer was perfect', () => {
    expect(checkSentence(target, target).note).toBe('');
  });
});

describe('skeletons', () => {
  it('always leaves at least one gap and at least one word', () => {
    for (const s of [
      'Mi madre es doctora',
      'Yo estudio español cada día',
      'El banco está en la calle Mayor',
      'Quisiera un café con leche',
    ]) {
      const sk = buildSkeleton(s);
      const gaps = sk.slots.filter((x) => x.gap).length;
      expect(gaps).toBeGreaterThan(0);
      expect(gaps).toBeLessThan(sk.slots.length);
    }
  });

  it('leaves a real frame standing, even on a short sentence', () => {
    // "Mucho gusto, Marta" is three content words. Blanking half of them left
    // "___ ___ Marta", which is the free stage wearing a disguise — there was
    // no frame left to complete.
    for (const s of ['Mucho gusto, Marta', 'Hasta luego', 'Buenos días, señor']) {
      const sk = buildSkeleton(s);
      const gaps = sk.slots.filter((x) => x.gap).length;
      const shown = sk.slots.length - gaps;
      expect(shown).toBeGreaterThanOrEqual(gaps);
    }
  });

  it('never blanks more than about a third of a longer sentence', () => {
    const sk = buildSkeleton('El banco está en la calle Mayor esta mañana');
    const gaps = sk.slots.filter((x) => x.gap).length;
    expect(gaps).toBeLessThanOrEqual(Math.ceil(sk.slots.length / 3));
  });

  it('blanks content words, keeping the grammatical frame visible', () => {
    // The learner already has the shape; what they can't do is supply the
    // meaning-bearing words. Blanking articles would test nothing.
    const sk = buildSkeleton('El banco está en la calle Mayor');
    const blanked = sk.answers.map((a) => a.toLowerCase());
    expect(blanked).not.toContain('el');
    expect(blanked).not.toContain('en');
    expect(blanked).not.toContain('la');
  });

  it('answers line up with the gaps, in order', () => {
    const sk = buildSkeleton('Yo estudio español cada día');
    expect(sk.answers).toEqual(sk.slots.filter((s) => s.gap).map((s) => s.text));
  });

  it('still produces a gap for a sentence made only of function words', () => {
    const sk = buildSkeleton('¿Qué es esto?');
    expect(sk.answers.length).toBeGreaterThan(0);
  });
});

describe('tiles', () => {
  const rng = () => 0.5;

  it('contains every word of the sentence', () => {
    const tiles = buildTiles('Mi madre es doctora', ['perro', 'azul'], rng);
    for (const w of ['Mi', 'madre', 'es', 'doctora']) expect(tiles).toContain(w);
  });

  it('adds distractors so it is not solvable by counting tiles', () => {
    const tiles = buildTiles('Mi madre es doctora', ['perro', 'azul', 'grande'], rng);
    expect(tiles.length).toBeGreaterThan(4);
  });

  it('never offers a distractor that is already in the sentence', () => {
    const tiles = buildTiles('Mi madre es doctora', ['madre', 'MADRE', 'perro'], rng);
    expect(tiles.filter((t) => t.toLowerCase() === 'madre').length).toBe(1);
  });

  it('copes with an empty distractor pool', () => {
    const tiles = buildTiles('Mi madre es doctora', [], rng);
    expect(tiles.length).toBe(4);
  });
});
