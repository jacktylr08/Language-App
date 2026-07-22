import { reconcileReviews, dueWeaknessesFirst, isEvaluationDue } from '../tutor-memory';
import type { LearnerProfile } from '../tutor-memory';

const DAY = 24 * 60 * 60 * 1000;

function baseProfile(overrides: Partial<LearnerProfile> = {}): LearnerProfile {
  return { summary: '', strengths: [], weaknesses: [], mistakes: [], updatedAt: '', ...overrides };
}

describe('reconcileReviews', () => {
  it('schedules a brand-new weakness as due right now', () => {
    const now = Date.parse('2026-01-10T00:00:00.000Z');
    const reviews = reconcileReviews(['confuses ser and estar'], {}, now);
    expect(reviews['confuses ser and estar'].due).toBe(new Date(now).toISOString());
    expect(reviews['confuses ser and estar'].streak).toBe(0);
  });

  it('pushes a weakness further out each time it comes up due and is practised again', () => {
    const now = Date.parse('2026-01-10T00:00:00.000Z');
    const prev = { 'ser vs estar': { due: '2026-01-09T00:00:00.000Z', streak: 0 } }; // was due yesterday
    const reviews = reconcileReviews(['ser vs estar'], prev, now);
    // Streak advances to 1 -> next interval is +1 day (spacing curve: 0,1,3,7,16,35).
    expect(reviews['ser vs estar'].streak).toBe(1);
    expect(reviews['ser vs estar'].due).toBe(new Date(now + 1 * DAY).toISOString());
  });

  it('leaves a weakness schedule untouched if it is not due yet', () => {
    const now = Date.parse('2026-01-10T00:00:00.000Z');
    const future = new Date(now + 5 * DAY).toISOString();
    const prev = { 'ser vs estar': { due: future, streak: 2 } };
    const reviews = reconcileReviews(['ser vs estar'], prev, now);
    expect(reviews['ser vs estar']).toEqual(prev['ser vs estar']);
  });

  it('drops a weakness that has been resolved (no longer reported)', () => {
    const now = Date.parse('2026-01-10T00:00:00.000Z');
    const prev = { 'old issue': { due: '2026-01-01T00:00:00.000Z', streak: 3 } };
    const reviews = reconcileReviews([], prev, now);
    expect(reviews).toEqual({});
  });
});

describe('dueWeaknessesFirst', () => {
  it('returns an empty array when there are no weaknesses', () => {
    expect(dueWeaknessesFirst(null)).toEqual([]);
    expect(dueWeaknessesFirst(baseProfile())).toEqual([]);
  });

  it('puts the most overdue weakness first, and an unscheduled one first of all', () => {
    const profile = baseProfile({
      weaknesses: ['b', 'a', 'c'],
      reviews: {
        a: { due: '2026-01-01T00:00:00.000Z', streak: 0 },
        b: { due: '2026-01-05T00:00:00.000Z', streak: 0 },
        // 'c' has no schedule yet — treated as maximally due, so it sorts first.
      },
    });
    expect(dueWeaknessesFirst(profile)).toEqual(['c', 'a', 'b']);
  });
});

describe('isEvaluationDue', () => {
  it('is never due before at least 3 sessions', () => {
    expect(isEvaluationDue(baseProfile({ sessions: 2, lastEvalSession: 0 }))).toBe(false);
  });

  it('becomes due once 5 sessions have passed since the last evaluation', () => {
    expect(isEvaluationDue(baseProfile({ sessions: 5, lastEvalSession: 0 }))).toBe(true);
  });

  it('is not due again immediately after an evaluation just happened', () => {
    expect(isEvaluationDue(baseProfile({ sessions: 5, lastEvalSession: 5 }))).toBe(false);
  });
});
