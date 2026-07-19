import { Router, Response } from 'express';
import Joi from 'joi';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { sr, ReviewResult } from '@/services/spaced-repetition';
import { logger } from '@/utils/logger';

const router = Router();

const submitReviewSchema = Joi.object({
  quality: Joi.number().integer().min(0).max(5).required(),
  responseTimeMs: Joi.number().integer().optional(),
  context: Joi.string().optional(),
});

// Get vocabulary due for review today
router.get('/due-today', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dueVocabIds = await sr.getDueToday(req.userId!);
    res.json({ dueVocabIds, count: dueVocabIds.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get due vocabulary';
    logger.error('Get due vocabulary error:', message);
    res.status(500).json({ error: message });
  }
});

// Get full review queue
router.get('/queue', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 20 } = req.query;
    const queue = await sr.getReviewQueue(req.userId!, parseInt(limit as string));
    res.json({ queue, count: queue.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get review queue';
    logger.error('Get review queue error:', message);
    res.status(500).json({ error: message });
  }
});

// Submit a review
router.post(
  '/vocabulary/:vocabId',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { vocabId } = req.params;
      const { error, value } = submitReviewSchema.validate(req.body);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const reviewResult: ReviewResult = {
        quality: value.quality,
        responseTimeMs: value.responseTimeMs,
        context: value.context,
      };

      const newState = await sr.submitReview(req.userId!, vocabId, reviewResult);

      res.json({
        success: true,
        state: newState,
        message: `Review processed. Next review: ${newState.nextReviewAt?.toISOString()}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit review';
      logger.error('Submit review error:', message);
      res.status(400).json({ error: message });
    }
  }
);

// Get acquisition metrics
router.get(
  '/analytics',
  verifyToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // TODO: Implement analytics based on user_acquisition_metrics
      res.json({
        wordsEncountered: 0,
        wordsRecognized: 0,
        wordsMastered: 0,
        estimatedVocabulary: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get analytics';
      logger.error('Get analytics error:', message);
      res.status(500).json({ error: message });
    }
  }
);

export default router;
