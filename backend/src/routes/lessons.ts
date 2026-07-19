import { Router, Response } from 'express';
import { Lesson } from '@/models/Lesson';
import { LessonSegment } from '@/models/LessonSegment';
import { ComprehensionQuestion } from '@/models/ComprehensionQuestion';
import { verifyToken, AuthRequest } from '@/middleware/auth';
import { lessonProgress } from '@/services/lesson-progress';
import { auth } from '@/services/auth';
import { tutorService } from '@/services/tutor-service';
import { logger } from '@/utils/logger';
import { knexInstance } from '@/config/database';

const router = Router();

// List lessons (public, no auth required)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { level, phase, theme, limit = 20, offset = 0 } = req.query;

    let query = Lesson.query().where('published', true).where('deleted_at', null);

    if (level) {
      query = query.where('level', parseInt(level as string));
    }
    if (phase) {
      query = query.where('lesson_type', phase as string);
    }
    if (theme) {
      query = query.where('theme_category', theme as string);
    }

    const lessons = await query
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string))
      .orderBy('level', 'asc')
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

// Get available lessons for authenticated user
router.get('/available', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phase, limit = 20 } = req.query;

    const user = await auth.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const lessons = await lessonProgress.getAvailableLessons(
      req.userId!,
      user.created_at!,
      phase as string | undefined,
      parseInt(limit as string)
    );

    res.json({ lessons });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch available lessons';
    logger.error('Get available lessons error:', message);
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

    // Fetch related content
    const segments = await LessonSegment.query()
      .where('lesson_id', id)
      .orderBy('sequence_order', 'asc');

    const questions = await ComprehensionQuestion.query()
      .where('lesson_id', id)
      .orderBy('sequence_order', 'asc');

    res.json({
      ...lesson,
      segments,
      questions,
    });
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

    const user = await auth.getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if can start
    const canStart = await lessonProgress.canStartLesson(req.userId!, id, user.created_at!);
    if (!canStart.canStart) {
      res.status(403).json({ error: canStart.reason });
      return;
    }

    const progress = await lessonProgress.startLesson(req.userId!, id);

    res.json({
      success: true,
      progress: {
        id: progress.id,
        status: progress.status,
        startedAt: progress.started_at,
      },
    });
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

    const progress = await lessonProgress.completeLesson(req.userId!, id);

    res.json({
      success: true,
      progress: {
        id: progress.id,
        status: progress.status,
        completedAt: progress.completed_at,
        extractedVocabularyCount: progress.extracted_vocabulary_count,
        extractedVocabularyIds: progress.extracted_vocabulary_ids,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete lesson';
    logger.error('Complete lesson error:', message);
    res.status(500).json({ error: message });
  }
});

// ===== TUTOR ENDPOINTS =====

// Get or create a tutor conversation
router.get('/:id/tutor/conversation', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: lessonId } = req.params;
    const userId = req.userId!;

    const conversation = await tutorService.getOrCreateConversation(userId, lessonId);
    const messages = await tutorService.getConversationMessages(conversation.id);

    res.json({
      conversationId: conversation.id,
      messages,
      performanceScore: conversation.performance_score,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get conversation';
    logger.error('Get tutor conversation error:', message);
    res.status(500).json({ error: message });
  }
});

// Send message to tutor
router.post('/:id/tutor/message', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: lessonId } = req.params;
    const userId = req.userId!;
    const { message, conversationId } = req.body;

    if (!message || !conversationId) {
      res.status(400).json({ error: 'Missing message or conversationId' });
      return;
    }

    // Verify conversation
    const conversation = await knexInstance('tutor_conversations')
      .where({
        id: conversationId,
        user_id: userId,
        lesson_id: lessonId,
      })
      .first();

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Get lesson context
    const context = await tutorService.getLessonContext(lessonId);
    if (!context) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // Store user message
    await tutorService.addMessage(conversationId, 'user', message);

    // Generate tutor response
    const tutorResponse = await tutorService.generateTutorResponse(
      message,
      conversationId,
      context,
      'beginner'
    );

    // Store tutor message
    await tutorService.addMessage(conversationId, 'assistant', tutorResponse, 'feedback');

    res.json({
      conversationId,
      tutorResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate tutor response';
    logger.error('Tutor message error:', message);
    res.status(500).json({ error: message });
  }
});

// Record performance
router.post('/:id/tutor/performance', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: lessonId } = req.params;
    const userId = req.userId!;
    const { conversationId, vocabularyId, correct, userResponse, feedback } = req.body;

    if (!conversationId || userResponse === undefined || correct === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Verify conversation
    const conversation = await knexInstance('tutor_conversations')
      .where({
        id: conversationId,
        user_id: userId,
        lesson_id: lessonId,
      })
      .first();

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Record performance
    await tutorService.recordPerformance(conversationId, vocabularyId, correct, userResponse, null, feedback);

    // Get updated performance score
    const updated = await knexInstance('tutor_conversations')
      .where({ id: conversationId })
      .select('performance_score')
      .first();

    res.json({
      success: true,
      performanceScore: updated?.performance_score,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to record performance';
    logger.error('Record performance error:', message);
    res.status(500).json({ error: message });
  }
});

// Get tutor performance analytics
router.get('/:id/tutor/performance', verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: lessonId } = req.params;
    const userId = req.userId!;

    const performance = await tutorService.getLessonPerformance(userId, lessonId);

    res.json(performance);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get performance';
    logger.error('Get performance error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
