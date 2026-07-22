import { tutorFlaggedVocabIds, combinedMistakeCount } from '../learner-insights';
import { recordWordResult } from '../progress';
import { TUTOR_PROFILE_KEY } from '../keys';
import type { LearnerProfile } from '../tutor-memory';

function profileWith(weaknesses: string[], mistakes: string[] = []): LearnerProfile {
  return { summary: '', strengths: [], weaknesses, mistakes, updatedAt: new Date().toISOString() };
}

describe('tutorFlaggedVocabIds', () => {
  it('returns nothing for a null profile', () => {
    expect(tutorFlaggedVocabIds(null)).toEqual([]);
  });

  it('matches a multi-word phrase mentioned in a weakness note', () => {
    const ids = tutorFlaggedVocabIds(profileWith(['keeps forgetting to say por favor']));
    expect(ids).toContain('por-favor');
  });

  it('matches a distinctive single word mentioned in a mistake note', () => {
    const ids = tutorFlaggedVocabIds(profileWith([], ["said 'gracias' oddly, otherwise fine"]));
    expect(ids).toContain('gracias');
  });

  it('does not flag short, generic words — avoids false positives from filler text', () => {
    // "no" is a real vocab entry, but as a bare 2-letter word it's far too
    // common in ordinary English/Spanish sentences to be a reliable signal.
    const ids = tutorFlaggedVocabIds(profileWith(['no real issues today']));
    expect(ids).not.toContain('no');
  });
});

describe('combinedMistakeCount', () => {
  beforeEach(() => localStorage.clear());

  it('unions lesson mistakes and tutor-flagged words without double counting', () => {
    // A lesson/practice mistake on one word...
    recordWordResult('hola', false);
    recordWordResult('hola', false);

    // ...and a *different* word flagged by the tutor in a live conversation.
    localStorage.setItem(
      TUTOR_PROFILE_KEY,
      JSON.stringify(profileWith(['keeps forgetting to say por favor']))
    );

    expect(combinedMistakeCount()).toBe(2);
  });

  it('does not count the same word twice when both sources flag it', () => {
    recordWordResult('gracias', false);
    localStorage.setItem(
      TUTOR_PROFILE_KEY,
      JSON.stringify(profileWith(["said 'gracias' oddly"]))
    );

    expect(combinedMistakeCount()).toBe(1);
  });
});
