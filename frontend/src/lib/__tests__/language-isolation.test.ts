/**
 * Everything that has to change when you switch course.
 *
 * Each of these is a real reported symptom, not a hypothetical. Switching to
 * Italian left Profe recalling the last Spanish session, the tutor screen
 * offering to "learn Spanish", and the background flag stuck on Spain's
 * colours. The pattern behind all of them is the same: state that is per-
 * course in principle, sharing something in practice.
 */
import { setActiveLanguageId } from '../languages';
import {
  progressKeyFor,
  tutorProfileKeyFor,
  lessonCheckpointKeyFor,
  PROGRESS_KEY,
  LESSON_CHECKPOINT_KEY,
} from '../keys';
import { loadProfile, saveProfile, type LearnerProfile } from '../tutor-memory';
import { saveCheckpoint, loadCheckpoint, clearCheckpoint } from '../lesson-resume';

/** A resumable checkpoint: part-way through a real queue. */
function checkpointFor(slug: string) {
  return {
    slug,
    index: 2,
    queue: [{ type: 'teach' }, { type: 'teach' }, { type: 'teach' }, { type: 'teach' }],
  } as unknown as Parameters<typeof saveCheckpoint>[0];
}

function profile(summary: string): LearnerProfile {
  return {
    summary,
    strengths: [],
    weaknesses: [],
    mistakes: [],
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
  setActiveLanguageId('es');
});

describe('every per-course store has its own key', () => {
  it('keeps progress, tutor memory and the resume checkpoint apart', () => {
    for (const keyFor of [progressKeyFor, tutorProfileKeyFor, lessonCheckpointKeyFor]) {
      expect(keyFor('it')).not.toBe(keyFor('es'));
    }
  });

  it('leaves the original Spanish keys untouched, so nothing needs migrating', () => {
    expect(progressKeyFor('es')).toBe(PROGRESS_KEY);
    expect(lessonCheckpointKeyFor('es')).toBe(LESSON_CHECKPOINT_KEY);
  });
});

describe("Profe's memory belongs to one course", () => {
  it('stamps the course it was written for', () => {
    saveProfile(profile('Confident with greetings.'));
    const stored = JSON.parse(localStorage.getItem(tutorProfileKeyFor('es'))!);
    expect(stored.languageId).toBe('es');
  });

  it('refuses a profile stamped for another course', () => {
    setActiveLanguageId('it');
    localStorage.setItem(
      tutorProfileKeyFor('it'),
      JSON.stringify({ ...profile('Spanish notes'), languageId: 'es' })
    );
    expect(loadProfile()).toBeNull();
  });

  it('drops an unstamped copy that is identical to the default course', () => {
    // Exactly what the old sync produced: the account's single stored profile
    // written into both keys, so Profe greeted an Italian learner with what
    // they had done last time in Spanish.
    const raw = JSON.stringify(profile('Talked about weekend plans; mixed up por/para.'));
    localStorage.setItem(tutorProfileKeyFor('es'), raw);
    localStorage.setItem(tutorProfileKeyFor('it'), raw);

    setActiveLanguageId('it');
    expect(loadProfile()).toBeNull();
    // Removed, not merely ignored — otherwise it gets re-uploaded.
    expect(localStorage.getItem(tutorProfileKeyFor('it'))).toBeNull();

    // Spanish's own profile is untouched.
    setActiveLanguageId('es');
    expect(loadProfile()?.summary).toContain('weekend plans');
  });

  it('keeps a genuinely different Italian profile', () => {
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify(profile('Spanish notes')));
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify(profile('Italian notes')));
    setActiveLanguageId('it');
    expect(loadProfile()?.summary).toBe('Italian notes');
  });

  it('never treats the default course as a copy of itself', () => {
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify(profile('Spanish notes')));
    expect(loadProfile()?.summary).toBe('Spanish notes');
  });
});

describe('a half-finished lesson does not cross courses', () => {
  it('offers a Spanish checkpoint only inside Spanish', () => {
    // Both courses have `greetings-essentials`, so a shared key meant a lesson
    // abandoned in one was resumed against a different lesson in the other.
    saveCheckpoint(checkpointFor('greetings-essentials'));
    expect(loadCheckpoint('greetings-essentials')).not.toBeNull();

    setActiveLanguageId('it');
    expect(loadCheckpoint('greetings-essentials')).toBeNull();

    setActiveLanguageId('es');
    expect(loadCheckpoint('greetings-essentials')).not.toBeNull();
  });

  it('clearing one course leaves the other alone', () => {
    saveCheckpoint(checkpointFor('greetings-essentials'));
    setActiveLanguageId('it');
    saveCheckpoint(checkpointFor('greetings-essentials'));
    clearCheckpoint();
    expect(loadCheckpoint('greetings-essentials')).toBeNull();

    setActiveLanguageId('es');
    expect(loadCheckpoint('greetings-essentials')).not.toBeNull();
  });
});
