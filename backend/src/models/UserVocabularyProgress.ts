import { Model } from 'objection';

export class UserVocabularyProgress extends Model {
  static tableName = 'user_vocabulary_progress';

  id!: string;
  user_id!: string;
  vocabulary_id!: string;
  interval_days!: number;
  ease_factor!: number;
  reps!: number;
  encounters!: number;
  acquisition_state!: 'new' | 'learning' | 'review' | 'mastered';
  mastery_confidence!: number;
  correct_streak!: number;
  last_encounter_at?: string;
  last_review_at?: string;
  next_review_at?: string;
  first_encountered_lesson_id?: string;
  first_review_timestamp?: string;
  created_at?: string;
  updated_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'vocabulary_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        vocabulary_id: { type: 'string', format: 'uuid' },
        interval_days: { type: 'integer', minimum: 0 },
        ease_factor: { type: 'number', minimum: 1.3, maximum: 2.5 },
        reps: { type: 'integer', minimum: 0 },
        encounters: { type: 'integer', minimum: 0 },
        acquisition_state: {
          type: 'string',
          enum: ['new', 'learning', 'review', 'mastered'],
        },
        mastery_confidence: { type: 'number', minimum: 0, maximum: 1 },
        correct_streak: { type: 'integer', minimum: 0 },
        last_encounter_at: { type: 'string', format: 'date-time' },
        last_review_at: { type: 'string', format: 'date-time' },
        next_review_at: { type: 'string', format: 'date-time' },
        first_encountered_lesson_id: { type: 'string', format: 'uuid' },
        first_review_timestamp: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
