import { Model } from 'objection';

export class LessonProgress extends Model {
  static tableName = 'lesson_progress';

  id!: string;
  user_id!: string;
  lesson_id!: string;
  status!: 'not_started' | 'in_progress' | 'completed' | 'unlocked_for_review';
  started_at?: string;
  completed_at?: string;
  completion_percentage!: number;
  comprehension_attempts!: number;
  comprehension_correct!: number;
  comprehension_last_score?: number;
  extracted_vocabulary_count!: number;
  extracted_vocabulary_ids?: string[];
  reading_time_seconds!: number;
  words_seen!: number;
  review_count!: number;
  last_review_at?: string;
  created_at?: string;
  updated_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'lesson_id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        lesson_id: { type: 'string', format: 'uuid' },
        status: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'completed', 'unlocked_for_review'],
        },
        started_at: { type: 'string', format: 'date-time' },
        completed_at: { type: 'string', format: 'date-time' },
        completion_percentage: { type: 'integer', minimum: 0, maximum: 100 },
        comprehension_attempts: { type: 'integer' },
        comprehension_correct: { type: 'integer' },
        comprehension_last_score: { type: 'number' },
        extracted_vocabulary_count: { type: 'integer' },
        extracted_vocabulary_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        reading_time_seconds: { type: 'integer' },
        words_seen: { type: 'integer' },
        review_count: { type: 'integer' },
        last_review_at: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
