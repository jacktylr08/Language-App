import { Model } from 'objection';

export class Story extends Model {
  static tableName = 'stories';

  id!: string;
  title!: string;
  description?: string;
  difficulty_level!: number;
  reading_time_minutes?: number;
  associated_lesson_id?: string;
  vocabulary_scope?: string[];
  theme?: string;
  published?: boolean;
  created_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'difficulty_level'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        difficulty_level: { type: 'integer', minimum: 0, maximum: 5 },
        reading_time_minutes: { type: 'integer' },
        associated_lesson_id: { type: 'string', format: 'uuid' },
        vocabulary_scope: { type: 'array', items: { type: 'string', format: 'uuid' } },
        theme: { type: 'string' },
        published: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
