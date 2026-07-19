import { Router, Response } from 'express';
import { Lesson } from '@/models/Lesson';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { logger } from '@/utils/logger';

const router = Router();

// List lessons
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { level, phase, theme, limit = 20, offset = 0 } = req.query;

    let query = Lesson.query().where('published', true).where('deleted_at', null);

    if (level) {
      query = query.where('level', parseInt(level as string));
    }
    if (phase) {
      query = query.where('curriculum_phase', phase as string);
    }
    if (theme) {
      query = query.where('theme', theme as string);
    }

    const lessons = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy('created_at', 'asc');

    const total = await Lesson.query()
      .where('published', true)
      .where('deleted_at', null)
      .resultSize();

    res.json({ lessons, total, limit, offset });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lessons';
    logger.error('Get lessons error:', message);
    res.status(500).json({ error: message });
  }
});

// Get lesson by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.query()
      .findById(id)
      .where('published', true)
      .where('deleted_at', null);

    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    res.json(lesson);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch lesson';
    logger.error('Get lesson error:', message);
    res.status(500).json({ error: message });
  }
});

// Get lesson audio
router.get('/:id/audio', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.query()
      .findById(id)
      .where('published', true)
      .where('deleted_at', null);

    if (!lesson || !lesson.audio_url) {
      res.status(404).json({ error: 'Audio not found' });
      return;
    }

    // In production, this would generate signed S3 URLs
    // For MVP, just redirect to audio_url
    res.redirect(lesson.audio_url);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get audio';
    logger.error('Get audio error:', message);
    res.status(500).json({ error: message });
  }
});

// Start lesson (requires auth)
router.post('/:id/start', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.query().findById(id);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // TODO: Create/update lesson_progress record
    // For now, just acknowledge
    res.json({ success: true, lessonId: id, userId: req.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start lesson';
    logger.error('Start lesson error:', message);
    res.status(500).json({ error: message });
  }
});

// Complete lesson (requires auth)
router.post('/:id/complete', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.query().findById(id);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // TODO: Update lesson_progress, extract vocabulary, trigger SR engine
    // For now, just acknowledge
    res.json({ success: true, lessonId: id, userId: req.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete lesson';
    logger.error('Complete lesson error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
