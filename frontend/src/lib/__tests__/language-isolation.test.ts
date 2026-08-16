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
import { buildSyncPayloadForTest, applySyncPayloadForTest } from '../sync';
import { buildTutorContext } from '../tutor-context';

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

  it('still spots the copy once the Spanish original carries its own stamp', () => {
    // The first version of this check compared the two stored strings. Saving
    // the Spanish profile adds `languageId: "es"` to it, so the strings stop
    // matching and the copy sails through — the check has to compare the
    // sessions, not the bytes.
    const copy = profile('Talked about weekend plans; mixed up por/para.');
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify(copy));
    saveProfile(copy); // writes the Spanish key, stamped

    expect(localStorage.getItem(tutorProfileKeyFor('es'))).not.toBe(
      localStorage.getItem(tutorProfileKeyFor('it'))
    );

    setActiveLanguageId('it');
    expect(loadProfile()).toBeNull();
  });

  it('does not let a sync round-trip launder the copy into a real profile', () => {
    // The chain that kept Profe speaking Spanish in Italian even after the
    // keys were split. The copy is unstamped, so it uploads happily; applying
    // the blob used to stamp whatever arrived with the course it landed in,
    // which turned an obvious copy into one that looked native and could
    // never be spotted again.
    const shared = profile('Talked about weekend plans; mixed up por/para.');
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify(shared));
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify(shared));

    applySyncPayloadForTest(buildSyncPayloadForTest());

    const stored = localStorage.getItem(tutorProfileKeyFor('it'));
    expect(stored).toBeNull();

    setActiveLanguageId('it');
    expect(loadProfile()).toBeNull();

    // And it is gone from what this device would upload next.
    expect(buildSyncPayloadForTest().languages?.it?.tutorProfile).toBeFalsy();

    setActiveLanguageId('es');
    expect(loadProfile()?.summary).toContain('weekend plans');
  });

  it('rejects a copy that a previous sync already stamped as Italian', () => {
    // Anyone whose device ran the laundering version above already has this
    // on disk: Spanish memories wearing an Italian stamp. Trusting the stamp
    // would leave them stuck with it forever.
    const shared = profile('Talked about weekend plans; mixed up por/para.');
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify({ ...shared, languageId: 'es' }));
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify({ ...shared, languageId: 'it' }));

    setActiveLanguageId('it');
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem(tutorProfileKeyFor('it'))).toBeNull();
  });

  it('does not mistake two empty profiles for copies of each other', () => {
    const blank: LearnerProfile = {
      summary: '',
      strengths: [],
      weaknesses: [],
      mistakes: [],
      updatedAt: '',
    };
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify(blank));
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify({ ...blank, languageId: 'it' }));

    setActiveLanguageId('it');
    expect(loadProfile()).not.toBeNull();
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

describe('what Profe is actually told at the start of a call', () => {
  // The symptom the learner reported is not something any screen renders —
  // it only shows up once the call opens and Profe says it out loud. The
  // note travels in the context object (RealtimeCall passes profileSummary
  // and lastSessionNote straight to the backend), so that is what has to be
  // clean, and a DOM check would have passed while the bug was still live.
  const spanishMemory = () => ({
    ...profile('Confident with greetings; mixed up por/para.'),
    sessionNote: 'Talked about weekend plans.',
    history: [
      { date: '2026-08-15T10:00:00.000Z', note: 'Talked about weekend plans.', mistakes: [] },
    ],
  });

  it('never carries the other course’s last session into this one', () => {
    const memory = spanishMemory();
    localStorage.setItem(tutorProfileKeyFor('es'), JSON.stringify({ ...memory, languageId: 'es' }));
    localStorage.setItem(tutorProfileKeyFor('it'), JSON.stringify({ ...memory, languageId: 'it' }));

    setActiveLanguageId('it');
    const ctx = buildTutorContext();
    expect(ctx.lastSessionNote).toBeUndefined();
    expect(ctx.profileSummary).toBeFalsy();
    expect(ctx.languageName).toBe('Italian');

    setActiveLanguageId('es');
    const spanish = buildTutorContext();
    expect(spanish.lastSessionNote).toBe('Talked about weekend plans.');
    expect(spanish.languageName).toBe('Spanish');
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
