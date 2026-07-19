import { Lesson } from '@/models/Lesson';
import { LessonProgress } from '@/models/LessonProgress';
import { UserVocabularyProgress } from '@/models/UserVocabularyProgress';
import { Vocabulary } from '@/models/Vocabulary';
import { logger } from '@/utils/logger';

export const lessonProgress = {
  /**
   * Check if all prerequisites are completed
   */
  async arePrerequisitesMet(
    userId: string,
    lesson: Lesson
  ): Promise<{ met: boolean; reason?: string }> {
    if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
      return { met: true };
    }

    const completed = await LessonProgress.query()
      .where('user_id', userId)
      .whereIn('lesson_id', lesson.prerequisites)
      .where('status', 'completed');

    if (completed.length < lesson.prerequisites.length) {
      return {
        met: false,
        reason: 'Not all prerequisite lessons completed',
      };
    }

    return { met: true };
  },

  /**
   * Check if lesson is unlocked by calendar
   */
  isCalendarUnlocked(lesson: Lesson, userCreatedAt: string): boolean {
    if (!lesson.calendar_unlock_day) {
      return true;
    }

    const created = new Date(userCreatedAt);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceCreation >= lesson.calendar_unlock_day;
  },

  /**
   * Check if user can start a lesson
   */
  async canStartLesson(
    userId: string,
    lessonId: string,
    userCreatedAt: string
  ): Promise<{ canStart: boolean; reason?: string }> {
    const lesson = await Lesson.query().findById(lessonId);
    if (!lesson) {
      return { canStart: false, reason: 'Lesson not found' };
    }

    // Check calendar unlock
    if (!this.isCalendarUnlocked(lesson, userCreatedAt)) {
      const unlockDay = lesson.calendar_unlock_day!;
      return {
        canStart: false,
        reason: `Unlocks on day ${unlockDay}`,
      };
    }

    // Check prerequisites
    const prereqsResult = await this.arePrerequisitesMet(userId, lesson);
    if (!prereqsResult.met) {
      return {
        canStart: false,
        reason: prereqsResult.reason,
      };
    }

    return { canStart: true };
  },

  /**
   * Start a lesson
   */
  async startLesson(userId: string, lessonId: string): Promise<LessonProgress> {
    const lesson = await Lesson.query().findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Check if already in progress
    let progress = await LessonProgress.query().findOne({
      user_id: userId,
      lesson_id: lessonId,
    });

    if (progress) {
      // Update existing progress
      if (progress.status === 'not_started') {
        progress = await progress.$query().update({
          status: 'in_progress',
          started_at: new Date(),
        });
      }
      return progress;
    }

    // Create new progress
    progress = await LessonProgress.query().insert({
      user_id: userId,
      lesson_id: lessonId,
      status: 'in_progress',
      started_at: new Date(),
    });

    logger.info(`Lesson started: user=${userId}, lesson=${lessonId}`);
    return progress;
  },

  /**
   * Complete a lesson
   * Extracts vocabulary and enrolls them in SR
   */
  async completeLesson(userId: string, lessonId: string): Promise<LessonProgress> {
    const lesson = await Lesson.query().findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    let progress = await LessonProgress.query().findOne({
      user_id: userId,
      lesson_id: lessonId,
    });

    if (!progress) {
      progress = await LessonProgress.query().insert({
        user_id: userId,
        lesson_id: lessonId,
        status: 'completed',
        completed_at: new Date(),
      });
    } else {
      progress = await progress.$query().update({
        status: 'completed',
        completed_at: new Date(),
        completion_percentage: 100,
      });
    }

    // Extract vocabulary from lesson
    const vocabulary = await Vocabulary.query()
      .whereRaw('? = ANY(lesson_ids)', [lessonId])
      .where('deleted_at', null);

    // Enroll in SR for each vocabulary word
    const extractedVocabIds = [];
    for (const vocab of vocabulary) {
      const existingProgress = await UserVocabularyProgress.query().findOne({
        user_id: userId,
        vocabulary_id: vocab.id,
      });

      if (!existingProgress) {
        // Create new SR entry
        await UserVocabularyProgress.query().insert({
          user_id: userId,
          vocabulary_id: vocab.id,
          interval_days: 0,
          ease_factor: 2.5,
          reps: 0,
          encounters: 0, // Will increment on each listen
          acquisition_state: 'new',
          first_encountered_lesson_id: lessonId,
          mastery_confidence: 0.0,
        });
      } else if (existingProgress.first_encountered_lesson_id === null) {
        // Update if not set
        await existingProgress.$query().update({
          first_encountered_lesson_id: lessonId,
        });
      }

      extractedVocabIds.push(vocab.id);
    }

    // Update progress with extracted vocabulary
    progress = await progress.$query().update({
      extracted_vocabulary_count: extractedVocabIds.length,
      extracted_vocabulary_ids: extractedVocabIds,
    });

    logger.info(
      `Lesson completed: user=${userId}, lesson=${lessonId}, vocabulary_count=${extractedVocabIds.length}`
    );

    return progress;
  },

  /**
   * Log encounter (passive vocabulary exposure)
   * Called when user hears/reads a word in listening/reading
   */
  async logEncounter(userId: string, vocabId: string, lessonId: string): Promise<void> {
    try {
      const progress = await UserVocabularyProgress.query().findOne({
        user_id: userId,
        vocabulary_id: vocabId,
      });

      if (progress) {
        await progress.$query().update({
          encounters: progress.encounters + 1,
          last_encounter_at: new Date(),
        });
      } else {
        // First encounter
        await UserVocabularyProgress.query().insert({
          user_id: userId,
          vocabulary_id: vocabId,
          encounters: 1,
          last_encounter_at: new Date(),
          first_encountered_lesson_id: lessonId,
        });
      }
    } catch (error) {
      logger.error('Failed to log encounter:', error);
    }
  },

  /**
   * Get lessons available for user (respecting prerequisites, calendar, etc.)
   */
  async getAvailableLessons(
    userId: string,
    userCreatedAt: string,
    phase?: string,
    limit = 20
  ): Promise<any[]> {
    let query = Lesson.query()
      .where('published', true)
      .where('deleted_at', null)
      .orderBy('level', 'asc')
      .orderBy('created_at', 'asc');

    if (phase) {
      query = query.where('curriculum_phase', phase);
    }

    const lessons = await query.limit(limit);

    // Check availability for each
    const available = await Promise.all(
      lessons.map(async (lesson) => {
        const canStart = await this.canStartLesson(userId, lesson.id, userCreatedAt);
        const userProgress = await LessonProgress.query().findOne({
          user_id: userId,
          lesson_id: lesson.id,
        });

        return {
          ...lesson,
          canStart: canStart.canStart,
          unlockReason: canStart.reason,
          userProgress: userProgress ? { status: userProgress.status } : null,
        };
      })
    );

    return available;
  },
};
