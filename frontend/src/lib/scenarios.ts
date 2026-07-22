/**
 * Selectable practice scenarios for the live tutor — a specific real-world
 * situation to role-play, independent of curriculum progress. Layered on top
 * of the normal tutor context (see buildScenarioContext in tutor-context.ts)
 * so the level ceiling, known vocab, and memory still apply — a scenario
 * never lets the tutor teach ahead of what's actually been learned.
 */
export interface Scenario {
  id: string;
  label: string;
  emoji: string;
  /** Shown in the picker UI. */
  description: string;
  /** Fed into the tutor's plan — the situation to role-play. */
  prompt: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'restaurant',
    label: 'At a restaurant',
    emoji: '🍽️',
    description: 'Order food, ask about dishes, handle the bill',
    prompt:
      'Role-play a restaurant scene: you are the waiter, the learner is the customer. Greet them, help them order, answer questions about the menu, and bring the bill when they ask for it.',
  },
  {
    id: 'doctor',
    label: "Doctor's visit",
    emoji: '🩺',
    description: 'Describe symptoms, understand advice',
    prompt:
      "Role-play a doctor's appointment: you are the doctor, the learner is the patient. Ask what's wrong, ask simple follow-up questions about their symptoms, and give basic advice.",
  },
  {
    id: 'airport',
    label: 'At the airport',
    emoji: '✈️',
    description: 'Check in, ask about gates and delays',
    prompt:
      'Role-play an airport check-in desk: you work the desk, the learner is the traveller. Check them in, ask about luggage, and answer questions about gates, delays, or connections.',
  },
  {
    id: 'job-interview',
    label: 'Job interview',
    emoji: '💼',
    description: 'Talk about experience and skills',
    prompt:
      'Role-play a friendly job interview: you are the interviewer, the learner is the candidate. Ask about their background, experience, and why they want the role — keep it encouraging, not intimidating.',
  },
  {
    id: 'directions',
    label: 'Asking for directions',
    emoji: '🧭',
    description: 'Find your way around a new place',
    prompt:
      'Role-play a stranger on the street: the learner has stopped you to ask for directions somewhere in town. Give them directions, ask clarifying questions about where they are headed, and react naturally.',
  },
  {
    id: 'hotel',
    label: 'Hotel check-in',
    emoji: '🏨',
    description: 'Check in, ask about the room and amenities',
    prompt:
      'Role-play a hotel front desk: you are reception, the learner is checking in. Confirm their reservation, ask simple questions, and answer questions about the room, breakfast, or wifi.',
  },
];

export function getScenario(id: string | null | undefined): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
