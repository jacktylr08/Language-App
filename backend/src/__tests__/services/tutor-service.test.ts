jest.mock('@/services/openai-service', () => ({
  openaiChat: jest.fn(),
}));

import { tutorService } from '@/services/tutor-service';
import { openaiChat } from '@/services/openai-service';

const mockedOpenaiChat = openaiChat as jest.Mock;

describe('buildLiveInstructions — language mix by course progress', () => {
  it('tells the tutor to speak mainly English for a learner in their first few weeks', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 1 });
    expect(instructions).toMatch(/MAINLY IN ENGLISH/);
    expect(instructions).not.toMatch(/MAINLY IN SPANISH/);
  });

  it('defaults to the same brand-new-learner guidance when no week is given', () => {
    const instructions = tutorService.buildLiveInstructions({});
    expect(instructions).toMatch(/MAINLY IN ENGLISH/);
  });

  it('shifts to roughly half English, half Spanish by the middle of the course', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 8 });
    expect(instructions).toMatch(/HALF ENGLISH, HALF SPANISH/);
  });

  it('leans mostly Spanish once well into the course', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 15 });
    expect(instructions).toMatch(/MOSTLY SPANISH/);
  });

  it('speaks mainly Spanish for a near-fluent learner', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 22 });
    expect(instructions).toMatch(/MAINLY IN SPANISH/);
    expect(instructions).not.toMatch(/MAINLY IN ENGLISH/);
  });

  it('puts the language guidance in its own early paragraph, not buried in a bullet list', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 1 });
    const languageIdx = instructions.indexOf('LANGUAGE —');
    const talkLikeIdx = instructions.indexOf('Talk like a real person');
    expect(languageIdx).toBeGreaterThan(-1);
    expect(languageIdx).toBeLessThan(talkLikeIdx);
  });
});

describe('buildLiveInstructions — language parameterization (multi-language architecture)', () => {
  it('defaults to Spanish when no language is given, unchanged from before this was parameterized', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 1 });
    expect(instructions).toMatch(/genuinely human Spanish tutor/);
  });

  it('uses whatever language is passed instead of hardcoding Spanish', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 1, language: 'French' });
    expect(instructions).toMatch(/genuinely human French tutor/);
    expect(instructions).not.toMatch(/\bSpanish\b/);
  });

  it('threads the language through the language-mix guidance at every course stage', () => {
    expect(tutorService.buildLiveInstructions({ weekReached: 1, language: 'German' })).toMatch(
      /teaching them German one bit at a time/
    );
    expect(tutorService.buildLiveInstructions({ weekReached: 8, language: 'German' })).toMatch(
      /HALF ENGLISH, HALF GERMAN/
    );
    expect(tutorService.buildLiveInstructions({ weekReached: 15, language: 'German' })).toMatch(
      /MOSTLY GERMAN/
    );
    expect(tutorService.buildLiveInstructions({ weekReached: 22, language: 'German' })).toMatch(
      /MAINLY IN GERMAN/
    );
  });
});

describe('gradeWriting — language parameterization', () => {
  beforeEach(() => {
    mockedOpenaiChat.mockReset();
    mockedOpenaiChat.mockResolvedValue(
      JSON.stringify({ correct: true, feedback: 'Nice!', corrected: 'Hoy fue un buen día' })
    );
  });

  it('defaults to Spanish in the system prompt when no language is given', async () => {
    await tutorService.gradeWriting({
      level: 'beginner',
      instruction: 'Describe your day',
      suggestedVocab: [],
      answer: 'Hoy fue un buen día',
    });
    const systemPrompt = mockedOpenaiChat.mock.calls[0][0];
    expect(systemPrompt).toMatch(/warm Spanish tutor/);
  });

  it('uses the given language in the system prompt instead of hardcoding Spanish', async () => {
    await tutorService.gradeWriting({
      level: 'beginner',
      instruction: 'Describe your day',
      suggestedVocab: [],
      answer: "Aujourd'hui était une bonne journée",
      language: 'French',
    });
    const systemPrompt = mockedOpenaiChat.mock.calls[0][0];
    expect(systemPrompt).toMatch(/warm French tutor/);
    expect(systemPrompt).not.toMatch(/\bSpanish\b/);
  });
});

describe('buildLiveInstructions — never ask the learner to repeat themselves', () => {
  it('explicitly bans asking the learner to repeat a phrase', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 5 });
    expect(instructions).toMatch(/NEVER ASK THEM TO REPEAT/);
    expect(instructions).toMatch(/say it once more/i);
    expect(instructions).toMatch(/repeat after me/i);
  });

  it('puts the no-repeat rule in its own early paragraph, not buried in a bullet list', () => {
    const instructions = tutorService.buildLiveInstructions({ weekReached: 5 });
    const noRepeatIdx = instructions.indexOf('NEVER ASK THEM TO REPEAT');
    const talkLikeIdx = instructions.indexOf('Talk like a real person');
    expect(noRepeatIdx).toBeGreaterThan(-1);
    expect(noRepeatIdx).toBeLessThan(talkLikeIdx);
  });
});

describe('buildLiveInstructions — conversation shape', () => {
  /**
   * A learner reported the exact failure this guards against: "where are you
   * from?" → "England" → "what do you like about England?" → "the weather" →
   * "why do you like the weather?" — a chain of disconnected questions that
   * never builds anything, with one-word answers accepted forever.
   */
  const instructions = tutorService.buildLiveInstructions({ weekReached: 4 });

  it('explicitly bans the interview pattern', () => {
    expect(instructions).toMatch(/DON'T INTERVIEW THEM/);
    expect(instructions).toMatch(/BANNED/);
  });

  it('requires contributing something, not just extracting answers', () => {
    expect(instructions).toMatch(/ADD something/);
    expect(instructions).toMatch(/model sentence/i);
  });

  it('requires staying on one thread instead of pivoting every turn', () => {
    expect(instructions).toMatch(/SAME thread/);
  });

  it('puts the interview ban in its own early paragraph, not buried in a bullet list', () => {
    const idx = instructions.indexOf("DON'T INTERVIEW THEM");
    const talkLikeIdx = instructions.indexOf('Talk like a real person');
    expect(idx).toBeGreaterThan(-1);
    expect(idx).toBeLessThan(talkLikeIdx);
  });

  it('tells the tutor to notice and respond to struggle rather than plough on', () => {
    expect(instructions).toMatch(/NOTICE WHEN THEY'RE STRUGGLING/);
    expect(instructions).toMatch(/simplify/i);
  });

  it('requires beginners to actually produce the target language, not just discuss it in English', () => {
    const beginner = tutorService.buildLiveInstructions({ weekReached: 1 });
    expect(beginner).toMatch(/get them SAYING Spanish, not just discussing it/);
  });

  it('applies the same conversation-shape guidance to the text chat', async () => {
    mockedOpenaiChat.mockReset();
    mockedOpenaiChat.mockResolvedValue('hola');
    await tutorService.chat([{ role: 'user', content: 'hi' }], { weekReached: 4 });
    const systemPrompt = mockedOpenaiChat.mock.calls[0][0];
    expect(systemPrompt).toMatch(/DON'T INTERVIEW THEM/);
    expect(systemPrompt).toMatch(/NOTICE WHEN THEY'RE STRUGGLING/);
  });
});

describe('buildLiveInstructions — turn-taking on a live call', () => {
  /**
   * The complaint these exist for: in any room that wasn't silent, Profe
   * stopped mid-sentence, started the same sentence again, stopped again.
   * The client-side fix stops most spurious interruptions ever reaching him;
   * this is the other half — when one does get through, he must not rewind.
   */
  const instructions = tutorService.buildLiveInstructions({ weekReached: 4 });

  it('forbids restarting an interrupted sentence from the beginning', () => {
    expect(instructions).toMatch(/DO NOT start that sentence again from the beginning/i);
  });

  it('tells him to ignore a noise rather than asking "sorry, what was that?"', () => {
    expect(instructions).toMatch(/don't ask "sorry, what was that\?" every time/i);
  });

  it('tells him to leave a learner’s thinking pause alone', () => {
    // A tutor who fills every silence is why people find these stressful —
    // and a beginner assembling a sentence needs that pause most of all.
    expect(instructions).toMatch(/LEAVE SILENCE ALONE/);
  });

  it('tells him to yield if they both start at once', () => {
    expect(instructions).toMatch(/Never speak over them/i);
  });
});
