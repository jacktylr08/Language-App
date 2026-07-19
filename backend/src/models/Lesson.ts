import { Model } from 'objection';

export class Lesson extends Model {
  static tableName = 'lessons';

  id!: string;
  title!: string;
  description?: string;
  level!: number;
  curriculum_phase!: string;
  content_type!: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  phonetic_focus?: string[];
  theme?: string;
  prerequisites?: string[];
  calendar_unlock_day?: number;
  estimated_duration_minutes?: number;
  version?: number;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title', 'level', 'curriculum_phase', 'content_type'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        description: { type: 'string' },
        level: { type: 'integer', minimum: 0, maximum: 5 },
        curriculum_phase: { type: 'string', enum: ['foundation', 'core', 'conversation', 'real_media'] },
        content_type: {
          type: 'string',
          enum: ['listening_comprehension', 'story', 'conversation', 'media'],
        },
        audio_url: { type: 'string' },
        audio_duration_seconds: { type: 'integer' },
        phonetic_focus: { type: 'array', items: { type: 'string' } },
        theme: { type: 'string' },
        prerequisites: { type: 'array', items: { type: 'string', format: 'uuid' } },
        calendar_unlock_day: { type: 'integer' },
        estimated_duration_minutes: { type: 'integer' },
        version: { type: 'integer' },
        published: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        deleted_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
