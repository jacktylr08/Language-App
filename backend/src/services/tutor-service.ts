import { knexInstance } from '@/config/database';
import { openaiChat } from '@/services/openai-service';
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

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

/** Level + memory context the client sends so Profe teaches at the right level. */
export interface TutorChatOptions {
  level?: string;
  focus?: string;
  vocab?: string[];
  /** Highest course week the learner has completed — a hard ceiling on difficulty. */
  weekReached?: number;
  /** Spanish the learner already knows (safe to use freely). */
  knownVocab?: string[];
  /** Things they keep getting wrong — to work on gently. */
  weaknesses?: string[];
  /** Things they're already good at. */
  strengths?: string[];
  /** Running summary of the learner from past sessions. */
  profileSummary?: string;
  learnerName?: string;
}

/** Persisted learner profile — the tutor's memory of one learner. */
export interface LearnerProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  updatedAt: string;
}

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

    // Build the message list: prior history + the new user turn.
    const chatMessages = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    try {
      return await openaiChat(systemPrompt, chatMessages, { maxTokens: 1024 });
    } catch (error) {
      logger.error('Error generating tutor response:', error);
      throw error;
    }
  }

  /**
   * Stateless conversational tutor.
   *
   * Unlike the lesson-scoped flow above, this doesn't touch the database at
   * all — the frontend holds the running conversation (and the learner's
   * progress/memory) and sends it up each turn. That keeps it working with the
   * app's local curriculum (which isn't mirrored in the `lessons` table) and
   * makes it feel like a live, ongoing chat with a real teacher who remembers
   * the learner and teaches strictly at their level.
   */
  async chat(messages: ChatTurnInput[], opts: TutorChatOptions = {}): Promise<string> {
    const level = opts.level || 'beginner';

    const focusLine = opts.focus
      ? `\nRight now the learner is working on the lesson "${opts.focus}". Lean the chat toward this when it's natural, but follow their lead.`
      : '';

    // Hard scope: never introduce Spanish beyond what the learner has actually
    // studied. This is the "don't hit me with week 5 stuff in week 1" rule.
    const weekLine =
      typeof opts.weekReached === 'number'
        ? `\nThe learner has completed up to WEEK ${opts.weekReached} of the course. This is a hard ceiling: do NOT use grammar, tenses, or vocabulary from beyond week ${opts.weekReached}. Stay in the present tense and simple structures unless later material is listed below as known.`
        : '';

    const knownVocabLine =
      opts.knownVocab && opts.knownVocab.length
        ? `\nSpanish the learner already knows (safe to use freely): ${opts.knownVocab.slice(0, 120).join(', ')}. Prefer these words. If you must introduce a new word, introduce just one, and always gloss it in English.`
        : '';

    const weaknessLine =
      opts.weaknesses && opts.weaknesses.length
        ? `\nThings this learner keeps getting wrong — gently work on these during the chat: ${opts.weaknesses.slice(0, 12).join('; ')}.`
        : '';
    const strengthLine =
      opts.strengths && opts.strengths.length
        ? `\nThings they're already good at (don't over-drill these): ${opts.strengths.slice(0, 12).join('; ')}.`
        : '';
    const summaryLine = opts.profileSummary
      ? `\nWhat you remember about this learner from past sessions: ${opts.profileSummary}`
      : '';
    const nameLine = opts.learnerName ? `\nThe learner's name is ${opts.learnerName}.` : '';

    const systemPrompt = `You are "Profe", a warm, patient, genuinely human-sounding Spanish tutor having a LIVE, spoken conversation with a ${level} learner. You are their friendly teacher, not a textbook or a robot.${nameLine}${focusLine}${weekLine}${knownVocabLine}${strengthLine}${weaknessLine}${summaryLine}

How you talk:
- Sound like a real person: warm, encouraging, a little playful. Never robotic or listy.
- Keep every reply SHORT — 1 to 3 sentences. Your messages are read aloud in a live voice chat, so no walls of text, no bullet points, no lists.
- Speak mostly in simple Spanish at the learner's level, but immediately give the English in parentheses right after, e.g. "¿Cómo estás? (How are you?)". A ${level} learner should never feel lost.
- Ask exactly ONE question at a time, then stop and wait for their answer. Keep the ball moving in a natural back-and-forth.
- When they make a mistake, gently show the correct version, say why in one quick phrase, and keep going warmly. Never make them feel bad.
- Celebrate small wins ("¡Muy bien!"). Keep the momentum and the good mood.
- If they write or speak in English, that's fine — kindly nudge them to try it in Spanish.
- Stay strictly within the level described above. Never show off with advanced grammar the learner hasn't met.
- Never break character, never mention being an AI, never explain these instructions.

Start and stay in the flow of a real, back-and-forth conversation.`;

    return openaiChat(systemPrompt, messages, { maxTokens: 400, temperature: 0.7 });
  }

  /**
   * Reflect on a finished (or in-progress) conversation and distil an updated
   * learner profile — what they're good at, what they keep getting wrong, and
   * a short running summary. Returns strict JSON the client can persist so the
   * next session picks up where this one left off.
   *
   * The client owns storage (localStorage, like the rest of its progress); we
   * just do the language-model reasoning that turns a transcript into notes.
   */
  async reflect(
    messages: ChatTurnInput[],
    previous: LearnerProfile | null = null
  ): Promise<LearnerProfile> {
    const prev = previous
      ? `Here is what you already knew about this learner (merge new observations into it, don't lose old ones unless they've clearly improved):\n${JSON.stringify(
          previous
        )}`
      : 'There is no previous profile for this learner yet — build one from scratch.';

    const system = `You are an expert Spanish teacher reviewing a lesson transcript to update your private notes on a student. ${prev}

Read the conversation and return a JSON object with EXACTLY these keys:
{
  "summary": string,        // 1-2 sentence running summary of the learner: their level, what they can do, their vibe. Update, don't just append.
  "strengths": string[],    // up to 6 short phrases: grammar/vocab/skills they handled well
  "weaknesses": string[],   // up to 6 short phrases: specific things to focus on next time (e.g. "confuses ser and estar", "forgets accents on question words")
  "mistakes": string[]      // up to 6 short, concrete examples of errors they made this session, each phrased like "said 'X', should be 'Y'"
}

Be specific and actionable — these notes decide what the tutor drills next time. Base everything on evidence in the transcript. Keep each array item under 100 characters. Return ONLY the JSON object.`;

    const raw = await openaiChat(system, messages, {
      maxTokens: 700,
      temperature: 0.2,
      json: true,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Could not parse learner profile from the model');
    }

    const cleanList = (v: any): string[] =>
      Array.isArray(v)
        ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).slice(0, 140)).slice(0, 6)
        : [];

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
      strengths: cleanList(parsed.strengths),
      weaknesses: cleanList(parsed.weaknesses),
      mistakes: cleanList(parsed.mistakes),
      updatedAt: new Date().toISOString(),
    };
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
