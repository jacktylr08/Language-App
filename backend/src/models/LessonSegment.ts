import { Model } from 'objection';

export class LessonSegment extends Model {
  static tableName = 'lesson_segments';

  id!: string;
  lesson_id!: string;
  start_ms!: number;
  end_ms!: number;
  spanish_text!: string;
  english_text!: string;
  pronunciation_focus?: string[];
  vocabulary_ids?: string[];
  sequence_order!: number;
  created_at?: string;
}
