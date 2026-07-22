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
