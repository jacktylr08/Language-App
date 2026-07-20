import { knexInstance } from '@/config/database';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';

interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  messageType?: string;
}

interface ConversationContext {
  lessonId: string;
  lessonTitle: string;
  vocabulary: Array<{ spanish: string; english: string[]; pronunciation: string }>;
  themes: string[];
}

const client = new Anthropic();

export class TutorService {
  /**
   * Get or create a tutor conversation for a lesson
   */
  async getOrCreateConversation(userId: string, lessonId: string) {
    // Try to find active conversation
    let conversation = await knexInstance('tutor_conversations')
      .where({ user_id: userId, lesson_id: lessonId, status: 'active' })
      .orderBy('created_at', 'desc')
      .first();

    if (!conversation) {
      // Create new conversation
      const newId = await knexInstance('tutor_conversations').insert({
        user_id: userId,
        lesson_id: lessonId,
        status: 'active',
        performance_score: 0,
      });
      conversation = { id: newId[0], user_id: userId, lesson_id: lessonId, status: 'active' };
    }

    return conversation;
  }

  /**
   * Get all messages in a conversation (sorted by creation time)
   */
  async getConversationMessages(conversationId: string): Promise<TutorMessage[]> {
    const messages = await knexInstance('tutor_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'asc');

    return messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      messageType: m.message_type,
    }));
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(conversationId: string, role: 'user' | 'assistant', content: string, messageType?: string) {
    await knexInstance('tutor_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      message_type: messageType,
    });
  }

  /**
   * Get lesson context for tutoring
   */
  async getLessonContext(lessonId: string): Promise<ConversationContext | null> {
    const lesson = await knexInstance('lessons').where({ id: lessonId }).first();
    if (!lesson) return null;

    const vocabulary = await knexInstance('vocabulary')
      .where({ lesson_id: lessonId })
      .select('spanish', 'english', 'pronunciation')
      .limit(15); // Focus on first 15 words for session

    return {
      lessonId,
      lessonTitle: lesson.title,
      vocabulary: vocabulary || [],
      themes: [lesson.theme_category],
    };
  }

  /**
   * Generate tutor response using Claude
   */
  async generateTutorResponse(
    userMessage: string,
    conversationId: string,
    context: ConversationContext,
    userLanguageLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<string> {
    // Fetch conversation history
    const messages = await this.getConversationMessages(conversationId);

    // Build system prompt for tutoring
    const systemPrompt = `You are an expert Spanish language tutor helping a ${userLanguageLevel} learner.

Lesson Context:
- Title: ${context.lessonTitle}
- Vocabulary focus: ${context.vocabulary.map((v) => v.spanish).join(', ')}

Your teaching approach:
1. **Teach actively** - Don't just present information. Explain concepts in a conversational way.
2. **Use the vocabulary** - Incorporate lesson vocabulary in your responses and explanations.
3. **Test interactively** - Ask questions to check understanding. Vary question types:
   - Translation (Spanish → English, English → Spanish)
   - Usage (use the word in a sentence)
   - Comprehension (answer questions about the content)
   - Pronunciation guidance (explain how to say words)
4. **Provide feedback** - When the learner responds:
   - If correct: Affirm and provide context about why it's correct
   - If incorrect: Explain gently, show the correct form, and ask a follow-up to reinforce
5. **Adapt difficulty** - Start simple, gradually increase complexity based on their responses
6. **Be encouraging** - Use positive reinforcement. Learning a language is hard!

Guidelines:
- Keep responses conversational and natural
- Use clear, simple language at beginner level
- Include Spanish examples with English translations when teaching
- Ask ONE focused question at a time
- Reference lesson vocabulary when relevant
- Track progress implicitly (don't keep explicit scores, but remember what they struggled with)

Response format:
Start directly with your teaching/question. Be warm and engaging.`;

    // Convert to Anthropic message format
    const anthropicMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add current user message
    anthropicMessages.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const assistantMessage = response.content[0];
      if (assistantMessage.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return assistantMessage.text;
    } catch (error) {
      logger.error('Error generating tutor response:', error);
      throw error;
    }
  }

  /**
   * Record a performance event (correct/incorrect response)
   */
  async recordPerformance(
    conversationId: string,
    vocabularyId: string | null,
    correct: boolean,
    userResponse: string,
    expectedResponse: string | null = null,
    feedback: string | null = null
  ) {
    await knexInstance('tutor_performance').insert({
      conversation_id: conversationId,
      vocabulary_id: vocabularyId,
      correct,
      user_response: userResponse,
      expected_response: expectedResponse,
      tutor_feedback: feedback,
    });

    // Update conversation performance score
    const stats = await knexInstance('tutor_performance')
      .where({ conversation_id: conversationId })
      .count('* as total')
      .sum({ correct: knexInstance.raw('CASE WHEN correct = true THEN 1 ELSE 0 END') })
      .first();

    const totalQuestions = (stats?.total as number) || 0;
    const correctCount = (stats?.correct as number) || 0;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    await knexInstance('tutor_conversations').where({ id: conversationId }).update({
      performance_score: score,
      updated_at: knexInstance.fn.now(),
    });
  }

  /**
   * Complete a tutoring conversation
   */
  async completeConversation(conversationId: string) {
    await knexInstance('tutor_conversations')
      .where({ id: conversationId })
      .update({
        status: 'completed',
        completed_at: knexInstance.fn.now(),
      });
  }

  /**
   * Get performance analytics for a lesson (across all sessions)
   */
  async getLessonPerformance(userId: string, lessonId: string) {
    const conversations = await knexInstance('tutor_conversations')
      .where({ user_id: userId, lesson_id: lessonId })
      .select('id');

    if (conversations.length === 0) {
      return { averageScore: 0, totalSessions: 0, vocabularyStats: {} };
    }

    const conversationIds = conversations.map((c) => c.id);

    // Get overall stats
    const overallStats = await knexInstance('tutor_performance')
      .whereIn('conversation_id', conversationIds)
      .count('* as total')
      .sum({ correct: knexInstance.raw('CASE WHEN correct = true THEN 1 ELSE 0 END') })
      .first();

    // Get per-vocabulary stats
    const vocabStats = await knexInstance('tutor_performance')
      .whereIn('conversation_id', conversationIds)
      .where({ vocabulary_id: knexInstance.raw("'vocab_id' IS NOT NULL") })
      .groupBy('vocabulary_id')
      .select('vocabulary_id')
      .count('* as total')
      .sum({ correct: knexInstance.raw('CASE WHEN correct = true THEN 1 ELSE 0 END') });

    const totalQuestions = (overallStats?.total as number) || 0;
    const correctCount = (overallStats?.correct as number) || 0;
    const averageScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    return {
      averageScore,
      totalSessions: conversations.length,
      totalQuestions,
      correctAnswers: correctCount,
      vocabularyStats: vocabStats || [],
    };
  }
}

export const tutorService = new TutorService();
