import { Model } from 'objection';

export class VocabularyReviewHistory extends Model {
  static tableName = 'vocabulary_review_history';

  id!: string;
  user_id!: string;
  vocabulary_id!: string;
  quality!: number; // 0-5
  response_time_ms?: number;
  context?: string; // 'vocab_card', 'listening_comprehension', 'conversation'
  interval_days_before?: number;
  ease_factor_before?: number;
  reps_before?: number;
  interval_days_after?: number;
  ease_factor_after?: number;
  reps_after?: number;
  acquisition_state_after?: string;
  created_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'vocabulary_id', 'quality'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        user_id: { type: 'string', format: 'uuid' },
        vocabulary_id: { type: 'string', format: 'uuid' },
        quality: { type: 'integer', minimum: 0, maximum: 5 },
        response_time_ms: { type: 'integer' },
        context: { type: 'string' },
        interval_days_before: { type: 'integer' },
        ease_factor_before: { type: 'number' },
        reps_before: { type: 'integer' },
        interval_days_after: { type: 'integer' },
        ease_factor_after: { type: 'number' },
        reps_after: { type: 'integer' },
        acquisition_state_after: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
