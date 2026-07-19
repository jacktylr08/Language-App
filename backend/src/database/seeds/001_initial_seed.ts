import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data (development only)
  await knex('story_comprehension').del();
  await knex('story_blocks').del();
  await knex('stories').del();
  await knex('comprehension_questions').del();
  await knex('lesson_segments').del();
  await knex('vocabulary_review_history').del();
  await knex('review_queue').del();
  await knex('lesson_progress').del();
  await knex('user_vocabulary_progress').del();
  await knex('vocabulary').del();
  await knex('lessons').del();
  await knex('user_acquisition_metrics').del();
  await knex('users').del();

  // Sample vocabulary (top 20 Spanish words by frequency)
  const vocabulary = [
    {
      spanish: 'el',
      english: ['the', 'the (masculine)'],
      part_of_speech: 'article',
      frequency_rank: 1,
      ipa_pronunciation: 'el',
      example_sentence_spanish: 'El gato es grande.',
      example_sentence_english: 'The cat is big.',
      category: 'article_definite',
    },
    {
      spanish: 'de',
      english: ['of', 'from'],
      part_of_speech: 'preposition',
      frequency_rank: 2,
      ipa_pronunciation: 'de',
      example_sentence_spanish: 'La casa de mi amigo.',
      example_sentence_english: 'The house of my friend.',
      category: 'preposition',
    },
    {
      spanish: 'que',
      english: ['that', 'which', 'what'],
      part_of_speech: 'conjunction',
      frequency_rank: 3,
      ipa_pronunciation: 'ke',
      example_sentence_spanish: 'Creo que es verdad.',
      example_sentence_english: 'I think that it is true.',
      category: 'conjunction',
    },
    {
      spanish: 'y',
      english: ['and'],
      part_of_speech: 'conjunction',
      frequency_rank: 4,
      ipa_pronunciation: 'i',
      example_sentence_spanish: 'Pan y agua.',
      example_sentence_english: 'Bread and water.',
      category: 'conjunction',
    },
    {
      spanish: 'a',
      english: ['to', 'at', 'a'],
      part_of_speech: 'preposition',
      frequency_rank: 5,
      ipa_pronunciation: 'a',
      example_sentence_spanish: 'Voy a la tienda.',
      example_sentence_english: 'I go to the store.',
      category: 'preposition',
    },
  ];

  await knex('vocabulary').insert(vocabulary);
}
