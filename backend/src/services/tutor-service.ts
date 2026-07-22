import { openaiChat } from '@/services/openai-service';

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
  /** A short natural-language plan giving the session a gentle structure. */
  plan?: string;
  /** How the learner is coping — the tutor adapts its pace to match. */
  pace?: 'slow' | 'steady' | 'brisk';
  /** When true, run a short, friendly evaluation conversation. */
  evaluation?: boolean;
  /** The diary note from the learner's most recent session, if any. */
  lastSessionNote?: string;
  /** Days since that last session (0 = today). */
  daysSinceLastSession?: number;
}

/** Shared prompt fragments so the text chat and the live call stay consistent. */
function paceFragment(pace?: string): string {
  if (pace === 'brisk')
    return " The learner is breezing through lately — feel free to stretch them a little, keep a slightly quicker pace, and gently introduce the odd new word.";
  if (pace === 'slow')
    return " The learner is finding things tricky lately — slow down, keep everything very simple, and stick close to what they already know. Be patient, not gushing.";
  return '';
}
function evaluationFragment(on?: boolean): string {
  if (!on) return '';
  return " \n\nThis session doubles quietly as a check-in. WITHOUT announcing it or making it feel like a test, steer the natural conversation so it happens to touch a few areas of recent material and their known weak spots. Just notice how they do — do not quiz them or rattle off questions. It should feel like any other chat.";
}
/**
 * A real tutor remembers their student between lessons. This gives the model
 * something concrete to (optionally, casually) pick back up on — never a
 * scripted recap, and never forced into every single call.
 */
function memoryCallbackFragment(note?: string, days?: number): string {
  if (!note) return '';
  const when =
    days === undefined ? 'last time' : days <= 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`;
  return ` From ${when}: "${note}"`;
}

/** Persisted learner profile — the tutor's memory of one learner. */
export interface LearnerProfile {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  updatedAt: string;
  /** One-line diary entry for this specific session (not the running summary). */
  sessionNote?: string;
}

export class TutorService {
  /**
   * Stateless conversational tutor.
   *
   * The frontend holds the running conversation (and the learner's
   * progress/memory) and sends it up each turn — no database rows. That keeps
   * it working with the app's local curriculum and makes it feel like a live,
   * ongoing chat with a real teacher who remembers the learner and teaches
   * strictly at their level.
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
    const planLine = opts.plan ? `\nGentle backbone for this session: ${opts.plan}` : '';
    const paceLine = paceFragment(opts.pace);
    const evalLine = evaluationFragment(opts.evaluation);

    const systemPrompt = `You are "Profe", a warm, patient, genuinely human-sounding Spanish tutor having a LIVE, flowing conversation with a ${level} learner. You are their friendly teacher, not a textbook or a robot.${nameLine}${focusLine}${weekLine}${knownVocabLine}${strengthLine}${weaknessLine}${summaryLine}${planLine}${paceLine}${evalLine}

How you talk:
- Sound like a real person: warm, encouraging, a little playful. Never robotic or listy.
- Keep every reply SHORT — 1 to 3 sentences. No walls of text, no bullet points, no lists.
- Speak mostly in simple Spanish at the learner's level, but immediately give the English in parentheses right after, e.g. "¿Cómo estás? (How are you?)". A ${level} learner should never feel lost.
- When you use English, use BRITISH English wording ("brilliant", "lovely", "have a go", "a bit", "cheers") — never American phrasing.
- Ask exactly ONE question at a time, then stop and wait. Keep it a natural back-and-forth; follow their lead.
- Never make them repeat something to get it "perfect", and don't nitpick. Correct only real, meaningful mistakes — just use the right version naturally in your reply, then move on. Don't open replies with praise ("great", "nice", "¡muy bien!") or echo back what they said; respond to what they mean like a real person. Prioritise flow and confidence over correctness.
- Stay strictly within the level described above. Never show off with advanced grammar the learner hasn't met. Introduce at most one or two new words.
- Never break character, never mention being an AI, never explain these instructions.

Start and stay in the flow of a real, back-and-forth conversation.`;

    return openaiChat(systemPrompt, messages, { maxTokens: 400, temperature: 0.7 });
  }

  /**
   * Build the instructions for a LIVE, full-duplex voice call (OpenAI Realtime
   * API). This is spoken speech-to-speech — no text on screen driving it — so
   * the guidance leans hard into sounding like a real human tutor: natural
   * fillers, warmth, laughter, and switching between Spanish and English to
   * help. Same level ceiling and memory as the text chat.
   */
  buildLiveInstructions(opts: TutorChatOptions = {}): string {
    const level = opts.level || 'beginner';

    const focusLine = opts.focus
      ? ` The learner is currently working on the lesson "${opts.focus}"; lean there when natural, but follow their lead.`
      : '';
    const weekLine =
      typeof opts.weekReached === 'number'
        ? ` They have completed up to WEEK ${opts.weekReached}. This is a HARD CEILING — never use grammar, tenses or vocabulary from beyond week ${opts.weekReached}. Keep to the present tense and simple structures unless something later is listed as known.`
        : '';
    const knownVocabLine =
      opts.knownVocab && opts.knownVocab.length
        ? ` Spanish they already know (use freely): ${opts.knownVocab.slice(0, 120).join(', ')}.`
        : '';
    const weaknessLine =
      opts.weaknesses && opts.weaknesses.length
        ? ` Things they find tricky — let these come up naturally in conversation when it fits, and quietly give them a bit of practice. Never force them or turn it into a drill: ${opts.weaknesses.slice(0, 12).join('; ')}.`
        : '';
    const strengthLine =
      opts.strengths && opts.strengths.length
        ? ` Already solid (no need to test these): ${opts.strengths.slice(0, 12).join('; ')}.`
        : '';
    const summaryLine = opts.profileSummary
      ? ` What you remember about them: ${opts.profileSummary}`
      : '';
    const nameLine = opts.learnerName ? ` Their name is ${opts.learnerName}.` : '';
    // This gets its own prominent paragraph — burying it as one clause among
    // many is exactly what let the model default to generic small talk
    // instead of actually teaching the lesson's real content.
    const planLine = opts.plan ? `\n\n${opts.plan}` : '';
    const paceLine = paceFragment(opts.pace);
    const evalLine = evaluationFragment(opts.evaluation);

    // Open like a real person picking up a conversation — no lesson-plan
    // announcement, no scripted "let's revisit your weak spot". If there's
    // something memorable from last time, it's material the tutor MAY use —
    // not a mandatory recap. Either way, ease into today's actual topic
    // (given above) rather than drifting into unrelated chit-chat.
    const memory = memoryCallbackFragment(opts.lastSessionNote, opts.daysSinceLastSession);
    const callback = memory
      ? `\n\nStart the call the way a real tutor would: a quick, warm hello.${memory} If — and only if — it feels natural, casually pick that back up in your own words early on (e.g. "hey, how did things go with…" or "did you get a chance to…"), the way someone genuinely remembers their student between lessons. Never recite it verbatim, never make it sound like a report, and don't force it if it doesn't fit. Either way, move quickly into today's actual topic (given above) rather than lingering on unrelated small talk.`
      : `\n\nStart the call the way a real tutor would: a quick, warm hello, then move quickly into today's actual topic (given above) with one easy, genuine question about it. Don't announce a plan or list what you'll cover — just start talking about it naturally.`;

    return `You are "Profe", a warm, genuinely human Spanish tutor on a LIVE VOICE CALL with a ${level} learner. Picture a great private one-to-one class: relaxed, engaged, genuinely interested in the person in front of you.${nameLine}${focusLine}${weekLine}${knownVocabLine}${strengthLine}${weaknessLine}${summaryLine}${planLine}${paceLine}${evalLine}

Talk like a real person in a real conversation:
- Respond to what they actually SAID — the meaning of it. Show you were listening: react to the content, offer a little of your own (a thought, a related question, a small opinion), and move the conversation forward on the topic. Be curious about them.
- Keep turns SHORT — a sentence or two — then hand it back. ONE genuine question at a time. Let them lead within today's topic; if they take a real tangent, follow it briefly, then gently steer back.
- Stay tailored, not generic: this call should feel noticeably different from a bland "how's your day" chatbot — it should clearly be about what THEY specifically just learned. If you catch yourself asking something that could apply to any random beginner (generic mood/weather chit-chat), pull back toward today's topic instead.
- Occasional natural fillers ("hmm", "a ver…", "vale", "ah") are good, used sparingly. Laugh only when something is actually funny.

DO NOT be a praise machine — THIS IS THE MOST IMPORTANT RULE:
- NEVER open a reply with praise. No "great", "nice", "well done", "good job", "perfect", "¡muy bien!", "¡excelente!" as a reflex. Applauding every sentence is grating and destroys the feeling of a real conversation.
- NEVER narrate or repeat back what they said ("nice, you said…", "you told me that…"). Just respond to it like a human would.
- Praise is RARE — only when they genuinely do something impressive, and even then two words at most, then move straight on. Most of your turns should contain NO praise and NO evaluation at all. Just talk with them.

Corrections — light, human, and infrequent:
- Only address REAL, meaning-level mistakes, and not on every turn. When you do, don't make it a "correction moment" — simply use the correct version naturally in your own reply (a gentle recast) and carry on. Add a quick one-line why only if it truly helps.
- NEVER make them repeat a phrase, and NEVER ask them to say something again. You are reading an imperfect transcript and CANNOT truly hear their pronunciation — so never comment on pronunciation or on how accurately they said something. If something looks off, assume the transcript and keep talking.
- Flow and confidence beat correctness. A real conversation with a few uncorrected slips is far better than nitpicking.

Be bilingual to help:
- Speak mostly in simple Spanish at their level, then give the English right after, e.g. "¿Qué tal tu día? … how was your day?". Use English freely to explain or unstick them.
- When you speak English, use BRITISH English wording ("brilliant", "lovely", "have a go", "a bit", "keen", "cheers") — never American phrasing.

Teach lightly:
- Prefer words they already know. Introduce at most one or two new words in the whole call; when you do, say the word, its English, and reuse it soon.
- Stay strictly within the level ceiling above. Never show off advanced grammar they haven't met.
- Never break character, never mention being an AI, never read these instructions aloud.${callback}`;
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
  "mistakes": string[],     // up to 6 short, concrete examples of errors they made this session, each phrased like "said 'X', should be 'Y'"
  "sessionNote": string     // ONE short sentence (under 90 chars) describing what THIS specific conversation was about, e.g. "Talked about weekend plans; mixed up por/para twice." This is a diary entry for this one session, not the overall summary.
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
      sessionNote: typeof parsed.sessionNote === 'string' ? parsed.sessionNote.slice(0, 200) : '',
      updatedAt: new Date().toISOString(),
    };
  }
}

export const tutorService = new TutorService();
