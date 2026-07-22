import { saveLearnerGoal, loadLearnerGoal } from '../learner-goal';

describe('learner goal', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing has been saved yet', () => {
    expect(loadLearnerGoal()).toBeNull();
  });

  it('round-trips a saved goal', () => {
    saveLearnerGoal('travel');
    expect(loadLearnerGoal()).toBe('travel');
  });

  it('ignores garbage previously written to the key', () => {
    localStorage.setItem('aprende-learner-goal-v1', 'not-a-real-goal');
    expect(loadLearnerGoal()).toBeNull();
  });
});
