import { UserVocabularyProgress } from '@/models/UserVocabularyProgress';
import { logger } from '@/utils/logger';

export interface SRState {
  intervalDays: number;
  easeFactor: number;
  reps: number;
  encounters: number;
  acquisitionState: 'new' | 'learning' | 'review' | 'mastered';
  nextReviewAt?: Date;
}

export interface ReviewResult {
  quality: number; // 0-5
  responseTimeMs?: number;
  context?: string; // 'vocab_card', 'listening_comprehension', 'conversation'
}

// SM-2 Algorithm constants
const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 2.5;
const INTERVAL_FACTORS = [0, 1, 3]; // days for reps 0, 1, 2+

export const sr = {
  /**
   * Calculate next interval based on SM-2 algorithm
   * @param quality User's quality rating (0-5)
   * @param reps Number of previous successful reviews
   * @param easeFactor Current ease factor
   * @returns { newInterval, newEaseFactor, newReps }
   */
  calculateInterval(quality: number, reps: number, easeFactor: number): {
    newInterval: number;
    newEaseFactor: number;
    newReps: number;
  } {
    if (quality < 3) {
      // Failed review - reset to learning
      return {
        newInterval: 1,
        newEaseFactor: easeFactor,
        newReps: 0,
      };
    }

    // Successful review
    let newReps = reps + 1;
    let newInterval: number;

    if (newReps === 1) {
      newInterval = 1;
    } else if (newReps === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.round(INTERVAL_FACTORS[2] * easeFactor);
    }

    // Update ease factor using SM-2 formula
    const newEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );

    return {
      newInterval,
      newEaseFactor,
      newReps,
    };
  },

  /**
   * Determine acquisition state based on reps and encounters
   */
  getAcquisitionState(
    reps: number,
    encounters: number,
    quality?: number
  ): 'new' | 'learning' | 'review' | 'mastered' {
    // Can only start active review after 20+ passive encounters
    if (encounters < 20) {
      return 'new';
    }

    if (reps === 0) {
      return 'learning';
    }

    // Mastered: 10+ reps and last 3 reviews were quality >= 4
    // (simplified - in production, track last reviews)
    if (reps >= 10 && (quality === undefined || quality >= 4)) {
      return 'mastered';
    }

    return 'review';
  },

  /**
   * Process a vocabulary review and update SR state
   */
  async submitReview(
    userId: string,
    vocabId: string,
    result: ReviewResult
  ): Promise<SRState> {
    const { quality, responseTimeMs, context } = result;

    if (quality < 0 || quality > 5) {
      throw new Error('Quality must be between 0 and 5');
    }

    // Get current state
    const uvp = await UserVocabularyProgress.query()
      .findOne({ user_id: userId, vocabulary_id: vocabId });

    if (!uvp) {
      throw new Error('Vocabulary not found for user');
    }

    // Check if ready for active review (20+ encounters)
    if (uvp.encounters < 20 && quality > 0) {
      // Passive encounter, increment count
      await uvp.$query().update({
        encounters: uvp.encounters + 1,
        last_encounter_at: new Date(),
      });

      return {
        intervalDays: uvp.interval_days,
        easeFactor: uvp.ease_factor,
        reps: uvp.reps,
        encounters: uvp.encounters + 1,
        acquisitionState: 'new',
      };
    }

    // Calculate new interval
    const { newInterval, newEaseFactor, newReps } = this.calculateInterval(
      quality,
      uvp.reps,
      uvp.ease_factor
    );

    // Determine new state
    const newState = this.getAcquisitionState(newReps, uvp.encounters, quality);

    // Calculate next review time
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    // Update database
    const updatedUvp = await uvp.$query().update({
      interval_days: newInterval,
      ease_factor: newEaseFactor,
      reps: newReps,
      encounters: Math.max(uvp.encounters, 20), // Ensure at least 20
      acquisition_state: newState,
      correct_streak: quality >= 4 ? (uvp.correct_streak || 0) + 1 : 0,
      last_review_at: new Date(),
      next_review_at: nextReviewAt,
      mastery_confidence: this.calculateMasteryConfidence(newReps, newEaseFactor),
    });

    // Log history
    await this.logReviewHistory(userId, vocabId, result, uvp, updatedUvp);

    logger.info(
      `Review processed: user=${userId}, vocab=${vocabId}, quality=${quality}, state=${newState}`
    );

    return {
      intervalDays: newInterval,
      easeFactor: newEaseFactor,
      reps: newReps,
      encounters: updatedUvp.encounters,
      acquisitionState: newState,
      nextReviewAt,
    };
  },

  /**
   * Calculate mastery confidence (0-1)
   * Higher reps + higher ease factor = higher confidence
   */
  calculateMasteryConfidence(reps: number, easeFactor: number): number {
    const repsScore = Math.min(reps / 10, 1); // Max at 10 reps
    const easeScore = (easeFactor - MIN_EASE_FACTOR) / (MAX_EASE_FACTOR - MIN_EASE_FACTOR);
    return (repsScore + easeScore) / 2;
  },

  /**
   * Get due reviews for a user today
   */
  async getDueToday(userId: string): Promise<string[]> {
    const now = new Date();
    const dueItems = await UserVocabularyProgress.query()
      .where('user_id', userId)
      .where('acquisition_state', '!=', 'mastered')
      .where('next_review_at', '<=', now)
      .where('encounters', '>=', 20)
      .select('vocabulary_id');

    return dueItems.map((item) => item.vocabulary_id);
  },

  /**
   * Get full review data for frontend
   */
  async getReviewQueue(userId: string, limit = 20): Promise<any[]> {
    const now = new Date();
    const items = await UserVocabularyProgress.query()
      .where('user_id', userId)
      .where('acquisition_state', '!=', 'mastered')
      .where('next_review_at', '<=', now)
      .where('encounters', '>=', 20)
      .limit(limit)
      .orderBy('next_review_at', 'asc');

    // Fetch vocabulary details for each
    const queue = await Promise.all(
      items.map(async (item) => {
        const vocab = await require('@/models/Vocabulary').Vocabulary.query().findById(
          item.vocabulary_id
        );
        return {
          id: item.id,
          vocabularyId: item.vocabulary_id,
          spanish: vocab?.spanish,
          english: vocab?.english,
          audioUrl: vocab?.audio_url,
          nextReviewAt: item.next_review_at,
          reps: item.reps,
          state: item.acquisition_state,
          masteryConfidence: item.mastery_confidence,
        };
      })
    );

    return queue;
  },

  /**
   * Log review for audit trail
   */
  async logReviewHistory(
    userId: string,
    vocabId: string,
    result: ReviewResult,
    before: any,
    after: any
  ): Promise<void> {
    try {
      const { VocabularyReviewHistory } = require('@/models/VocabularyReviewHistory');
      await VocabularyReviewHistory.query().insert({
        user_id: userId,
        vocabulary_id: vocabId,
        quality: result.quality,
        response_time_ms: result.responseTimeMs,
        context: result.context,
        interval_days_before: before.interval_days,
        ease_factor_before: before.ease_factor,
        reps_before: before.reps,
        interval_days_after: after.interval_days,
        ease_factor_after: after.ease_factor,
        reps_after: after.reps,
        acquisition_state_after: after.acquisition_state,
      });
    } catch (error) {
      logger.error('Failed to log review history:', error);
    }
  },
};
