import { PROGRESS_KEY, TUTOR_PROFILE_KEY, progressKeyFor, tutorProfileKeyFor } from '../keys';

describe('language-scoped storage keys', () => {
  it('Spanish keeps the exact original key names — no migration needed for existing learners', () => {
    expect(progressKeyFor('es')).toBe(PROGRESS_KEY);
    expect(tutorProfileKeyFor('es')).toBe(TUTOR_PROFILE_KEY);
  });

  it('a different language gets its own distinct, namespaced key', () => {
    expect(progressKeyFor('fr')).not.toBe(PROGRESS_KEY);
    expect(progressKeyFor('fr')).toContain('fr');
    expect(tutorProfileKeyFor('fr')).not.toBe(TUTOR_PROFILE_KEY);
    expect(tutorProfileKeyFor('fr')).toContain('fr');
  });

  it('two different languages never collide with each other', () => {
    expect(progressKeyFor('fr')).not.toBe(progressKeyFor('de'));
    expect(tutorProfileKeyFor('fr')).not.toBe(tutorProfileKeyFor('de'));
  });
});
