import { tutorService } from '@/services/tutor-service';

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
