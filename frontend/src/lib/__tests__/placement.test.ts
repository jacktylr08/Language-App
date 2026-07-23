import {
  LEVEL_OPTIONS,
  startWeekForLevel,
  BAND_COUNT,
  PLACEMENT_QUIZ_LENGTH,
  bandStartWeek,
  buildPlacementQuestionPool,
  initialPlacementProgress,
  pickNextPlacementQuestion,
  recordPlacementAnswer,
  isPlacementQuizComplete,
  startWeekForPlacement,
  type PlacementProgress,
} from '../placement';

describe('startWeekForLevel (self-report fast path)', () => {
  it('maps every level option to a real, resolvable start week', () => {
    for (const opt of LEVEL_OPTIONS) {
      expect(startWeekForLevel(opt.value)).toBeGreaterThanOrEqual(1);
    }
  });

  it('a complete beginner starts at week 1 (no skip)', () => {
    expect(startWeekForLevel('new')).toBe(1);
  });

  it('later levels skip progressively further ahead', () => {
    const weeks = ['new', 'beginner', 'intermediate', 'advanced'].map((l) =>
      startWeekForLevel(l as 'new' | 'beginner' | 'intermediate' | 'advanced')
    );
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b));
    expect(new Set(weeks).size).toBe(weeks.length);
  });
});

describe('bandStartWeek', () => {
  it('matches the course\'s own 4-week phase boundaries', () => {
    expect(bandStartWeek(0)).toBe(1);
    expect(bandStartWeek(1)).toBe(5);
    expect(bandStartWeek(BAND_COUNT - 1)).toBe(21);
  });

  it('clamps out-of-range bands instead of throwing', () => {
    expect(bandStartWeek(-5)).toBe(bandStartWeek(0));
    expect(bandStartWeek(999)).toBe(bandStartWeek(BAND_COUNT - 1));
  });
});

describe('buildPlacementQuestionPool', () => {
  const pool = buildPlacementQuestionPool();

  it('builds real questions pulled from the shipped curriculum, not invented content', () => {
    expect(pool.length).toBeGreaterThan(20);
  });

  it('every question has 4 options and a correct answer that is one of them', () => {
    for (const q of pool) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options).toContain(q.correctAnswer);
    }
  });

  it('covers a spread of difficulty bands, not just one', () => {
    const bands = new Set(pool.map((q) => q.band));
    expect(bands.size).toBeGreaterThan(1);
  });

  it('every question id is unique', () => {
    const ids = pool.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('adaptive placement staircase', () => {
  const pool = buildPlacementQuestionPool();

  it('starts in the middle band', () => {
    const progress = initialPlacementProgress();
    expect(progress.band).toBe(Math.floor(BAND_COUNT / 2));
    expect(progress.history).toHaveLength(0);
  });

  it('moves to a harder band after a correct answer', () => {
    let progress = initialPlacementProgress();
    const q = pickNextPlacementQuestion(pool, progress)!;
    const startBand = progress.band;
    progress = recordPlacementAnswer(progress, q, true);
    expect(progress.band).toBe(Math.min(startBand + 1, BAND_COUNT - 1));
  });

  it('moves to an easier band after a wrong answer', () => {
    let progress = initialPlacementProgress();
    const q = pickNextPlacementQuestion(pool, progress)!;
    const startBand = progress.band;
    progress = recordPlacementAnswer(progress, q, false);
    expect(progress.band).toBe(Math.max(startBand - 1, 0));
  });

  it('never asks the same question twice', () => {
    let progress = initialPlacementProgress();
    for (let i = 0; i < PLACEMENT_QUIZ_LENGTH; i++) {
      const q = pickNextPlacementQuestion(pool, progress);
      expect(q).not.toBeNull();
      progress = recordPlacementAnswer(progress, q!, i % 2 === 0);
    }
    expect(new Set(progress.askedIds).size).toBe(progress.askedIds.length);
  });

  it('completes after exactly PLACEMENT_QUIZ_LENGTH questions', () => {
    let progress = initialPlacementProgress();
    expect(isPlacementQuizComplete(progress)).toBe(false);
    for (let i = 0; i < PLACEMENT_QUIZ_LENGTH; i++) {
      const q = pickNextPlacementQuestion(pool, progress)!;
      progress = recordPlacementAnswer(progress, q, true);
    }
    expect(isPlacementQuizComplete(progress)).toBe(true);
  });

  it('a learner who answers everything correctly settles at the highest band', () => {
    let progress = initialPlacementProgress();
    for (let i = 0; i < PLACEMENT_QUIZ_LENGTH; i++) {
      const q = pickNextPlacementQuestion(pool, progress)!;
      progress = recordPlacementAnswer(progress, q, true);
    }
    expect(progress.band).toBe(BAND_COUNT - 1);
    expect(startWeekForPlacement(progress)).toBe(bandStartWeek(BAND_COUNT - 1));
  });

  it('a learner who answers everything wrong settles at the lowest band', () => {
    let progress = initialPlacementProgress();
    for (let i = 0; i < PLACEMENT_QUIZ_LENGTH; i++) {
      const q = pickNextPlacementQuestion(pool, progress)!;
      progress = recordPlacementAnswer(progress, q, false);
    }
    expect(progress.band).toBe(0);
    expect(startWeekForPlacement(progress)).toBe(1);
  });

  it('startWeekForPlacement always resolves to a real course week', () => {
    const progress: PlacementProgress = { band: 3, askedIds: [], correctCount: 0, history: [] };
    expect(startWeekForPlacement(progress)).toBe(13);
  });
});
