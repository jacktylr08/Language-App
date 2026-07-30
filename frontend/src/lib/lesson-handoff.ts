/**
 * The bridge from a finished lesson to a conversation that uses it.
 *
 * The app had a structured course and a live tutor, and no connection between
 * them. You finished a lesson on food and clothing, tapped "Continue", and
 * landed back on a dashboard — where a tutor card sat waiting to have a
 * conversation about nothing in particular. Two good products in one app,
 * running in parallel, neither making the other worth more.
 *
 * That parallel structure is also what made the course feel ordinary. Tapping
 * through vocabulary exercises is what every language app does; the reason to
 * use this one is that thirty seconds later you say those words out loud to
 * someone who corrects you. If the learner never crosses that gap, they never
 * see the actual product — and the gap was theirs to find.
 *
 * So a finished lesson now ends with a concrete, small, obviously-doable task
 * built from that lesson's own vocabulary. Not "talk to your tutor" — "tell
 * Profe what your family is like, using padre, madre and hermana". Two
 * minutes, using exactly what you just learned, while it's still warm.
 */

import { getPriorLessons, type CurriculumLesson, type VocabItem } from './curriculum';
import { SCENARIOS, type Scenario } from './scenarios';

export interface LessonHandoff {
  /** What the learner is being asked to do, in their own language. */
  task: string;
  /** The few words the task is built around — shown as a nudge, not a test. */
  words: VocabItem[];
  /** Roughly how long, in minutes. Deliberately small. */
  minutes: number;
  /**
   * A matching role-play, where the lesson maps cleanly onto one. Most lessons
   * don't, and inventing a scene for "Ser vs Estar" would be worse than simply
   * asking the learner to talk about themselves.
   */
  scenario?: Scenario;
}

/**
 * Lessons whose subject matter genuinely is one of the existing role-play
 * scenes. Keyed by slug rather than theme: theme is far too coarse — "nouns"
 * covers both restaurant food and household objects, and only one of those is
 * a restaurant.
 */
const SCENARIO_BY_SLUG: Readonly<Record<string, string>> = {
  restaurant: 'restaurant',
  'places-directions': 'directions',
  'travel-hotel': 'hotel',
  'health-body': 'doctor',
  'work-career': 'job-interview',
};

/**
 * What to ask someone to do with a lesson, by theme.
 *
 * Each is phrased as a thing to say rather than a topic to cover — "tell Profe
 * about..." gives the learner a first sentence, which is the entire difference
 * between starting a conversation and staring at a Start Call button.
 */
function taskForTheme(theme: CurriculumLesson['theme'], title: string): string {
  switch (theme) {
    case 'phonetics':
      return 'Say hello to Profe and introduce yourself out loud';
    case 'verbs':
      return 'Tell Profe what you did today, and what you usually do';
    case 'family':
      return 'Describe your family to Profe — who they are, what they are like';
    case 'nouns':
      return 'Describe what is around you right now to Profe';
    case 'adjectives':
      return 'Describe someone you know to Profe, in as much detail as you can';
    case 'grammar':
      return `Use what "${title}" just taught you in a real conversation with Profe`;
    case 'conversation':
      return 'Have the conversation for real with Profe';
    case 'review':
      return 'Put this week to work in a conversation with Profe';
  }
}

/**
 * Builds the handoff for a lesson the learner has just finished.
 *
 * Returns null when there's nothing worth practising out loud — a lesson with
 * no vocabulary of its own gives the task nothing to be about, and a vague
 * "go and chat" offer is worse than no offer, because it teaches the learner
 * that the button leads somewhere unfocused.
 */
export function handoffFor(lesson: CurriculumLesson | null | undefined): LessonHandoff | null {
  if (!lesson) return null;

  // Words the learner can actually build a sentence out of. Three is enough
  // to make the task concrete and few enough to hold in your head while
  // talking — a list of twelve reads as homework.
  //
  // Review lessons carry no vocabulary of their own: they re-test what came
  // before. Taking that literally left the six phase reviews — the end of
  // every phase, and graduation — as the only lessons in the course with no
  // conversation to go and have, which is precisely backwards. Those are the
  // moments a learner has most to show. So they borrow from the lessons they
  // review, sampled from the end so the words are the freshest ones.
  const own = lesson.vocab.slice(0, 3);
  const words =
    own.length > 0
      ? own
      : getPriorLessons(lesson.slug)
          .flatMap((l) => l.vocab)
          .slice(-3);
  if (words.length === 0) return null;

  const scenarioId = SCENARIO_BY_SLUG[lesson.slug];
  const scenario = scenarioId ? SCENARIOS.find((s) => s.id === scenarioId) : undefined;

  return {
    task: scenario ? scenario.description : taskForTheme(lesson.theme, lesson.title),
    words,
    minutes: 2,
    scenario,
  };
}

/**
 * The URL that opens the tutor already pointed at this lesson.
 *
 * `just=1` is what tells the tutor the learner finished it moments ago rather
 * than at some point in the past — see buildHandoffContext. A scenario, where
 * one fits, additionally sets the scene.
 */
export function handoffHref(lesson: CurriculumLesson, handoff: LessonHandoff): string {
  const params = new URLSearchParams({ lesson: lesson.slug, just: '1' });
  if (handoff.scenario) params.set('scenario', handoff.scenario.id);
  return `/tutor?${params.toString()}`;
}
