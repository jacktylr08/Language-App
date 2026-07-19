import { Model } from 'objection';

export class ComprehensionQuestion extends Model {
  static tableName = 'comprehension_questions';

  id!: string;
  lesson_id!: string;
  question_type!: 'multiple_choice' | 'open_ended' | 'fill_blank';
  question_english!: string;
  question_spanish!: string;
  options?: string[];
  correct_answer?: number;
  acceptable_answers?: string[];
  sequence_order?: number;
  created_at?: string;
}
