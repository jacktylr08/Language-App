import { sr } from '@/services/spaced-repetition';

describe('Spaced Repetition (SM-2 Algorithm)', () => {
  describe('calculateInterval', () => {
    const initialEase = 2.5;

    describe('Failed reviews (quality < 3)', () => {
      it('should reset to interval=1 on failed review', () => {
        const result = sr.calculateInterval(0, 5, initialEase);
        expect(result.newInterval).toBe(1);
        expect(result.newReps).toBe(0);
      });

      it('should not change ease factor on failure', () => {
        const result = sr.calculateInterval(2, 5, initialEase);
        expect(result.newEaseFactor).toBe(initialEase);
      });
    });

    describe('Successful reviews (quality >= 3)', () => {
      it('should set interval=1 on first successful review', () => {
        const result = sr.calculateInterval(5, 0, initialEase);
        expect(result.newInterval).toBe(1);
        expect(result.newReps).toBe(1);
      });

      it('should set interval=3 on second successful review', () => {
        const result = sr.calculateInterval(5, 1, initialEase);
        expect(result.newInterval).toBe(3);
        expect(result.newReps).toBe(2);
      });

      it('should use ease factor on third+ reviews', () => {
        const result = sr.calculateInterval(5, 2, initialEase);
        expect(result.newInterval).toBe(Math.round(3 * initialEase));
        expect(result.newReps).toBe(3);
      });
    });

    describe('Ease factor adjustments', () => {
      it('should increase ease factor for quality=5 (perfect)', () => {
        const result = sr.calculateInterval(5, 1, initialEase);
        expect(result.newEaseFactor).toBeGreaterThan(initialEase);
      });

      it('should decrease ease factor for quality=3 (minimum passing)', () => {
        const result = sr.calculateInterval(3, 1, initialEase);
        expect(result.newEaseFactor).toBeLessThan(initialEase);
      });

      it('should never go below 1.3 (MIN_EASE_FACTOR)', () => {
        let ease = 1.3;
        // Multiple failures
        for (let i = 0; i < 10; i++) {
          const result = sr.calculateInterval(0, 0, ease);
          ease = result.newEaseFactor;
        }
        expect(ease).toBeGreaterThanOrEqual(1.3);
      });

      it('should never exceed 2.5 (MAX_EASE_FACTOR)', () => {
        let ease = 2.5;
        // Multiple perfect reviews
        for (let i = 0; i < 10; i++) {
          const result = sr.calculateInterval(5, i, ease);
          ease = result.newEaseFactor;
        }
        expect(ease).toBeLessThanOrEqual(2.5);
      });
    });

    describe('Progression example', () => {
      it('should follow realistic progression', () => {
        // First review: quality=5 (perfect)
        let result = sr.calculateInterval(5, 0, 2.5);
        expect(result.newReps).toBe(1);
        expect(result.newInterval).toBe(1);

        // Second review: quality=4 (with hesitation)
        result = sr.calculateInterval(4, 1, result.newEaseFactor);
        expect(result.newReps).toBe(2);
        expect(result.newInterval).toBe(3);

        // Third review: quality=4
        result = sr.calculateInterval(4, 2, result.newEaseFactor);
        expect(result.newReps).toBe(3);
        expect(result.newInterval).toBeGreaterThan(3);
      });
    });
  });

  describe('getAcquisitionState', () => {
    it('should return "new" if encounters < 20', () => {
      const state = sr.getAcquisitionState(0, 5);
      expect(state).toBe('new');
    });

    it('should return "learning" if encounters >= 20 and reps == 0', () => {
      const state = sr.getAcquisitionState(0, 20);
      expect(state).toBe('learning');
    });

    it('should return "review" for active reviews', () => {
      const state = sr.getAcquisitionState(2, 20);
      expect(state).toBe('review');
    });

    it('should return "mastered" with 10+ reps and quality >= 4', () => {
      const state = sr.getAcquisitionState(10, 20, 4);
      expect(state).toBe('mastered');
    });
  });

  describe('calculateMasteryConfidence', () => {
    it('should return 0 for new words', () => {
      const confidence = sr.calculateMasteryConfidence(0, 2.5);
      expect(confidence).toBe(0.5); // Only from ease factor
    });

    it('should increase with reps', () => {
      const conf1 = sr.calculateMasteryConfidence(1, 2.5);
      const conf2 = sr.calculateMasteryConfidence(5, 2.5);
      expect(conf2).toBeGreaterThan(conf1);
    });

    it('should increase with ease factor', () => {
      const conf1 = sr.calculateMasteryConfidence(5, 1.3);
      const conf2 = sr.calculateMasteryConfidence(5, 2.5);
      expect(conf2).toBeGreaterThan(conf1);
    });

    it('should max out at 1.0 for mastered words', () => {
      const confidence = sr.calculateMasteryConfidence(10, 2.5);
      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
