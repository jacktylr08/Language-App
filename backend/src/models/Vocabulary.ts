import { Model } from 'objection';

export class Vocabulary extends Model {
  static tableName = 'vocabulary';

  id!: string;
  spanish!: string;
  english!: string[];
  part_of_speech?: string;
  frequency_rank?: number;
  ipa_pronunciation?: string;
  difficulty_factor?: number;
  example_sentence_spanish?: string;
  example_sentence_english?: string;
  lesson_ids?: string[];
  related_vocab_ids?: string[];
  category?: string;
  image_url?: string;
  audio_url?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['spanish', 'english'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        spanish: { type: 'string' },
        english: { type: 'array', items: { type: 'string' } },
        part_of_speech: { type: 'string' },
        frequency_rank: { type: 'integer' },
        ipa_pronunciation: { type: 'string' },
        difficulty_factor: { type: 'number', minimum: 1.3, maximum: 2.5 },
        example_sentence_spanish: { type: 'string' },
        example_sentence_english: { type: 'string' },
        lesson_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        related_vocab_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
        category: { type: 'string' },
        image_url: { type: 'string' },
        audio_url: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        deleted_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
