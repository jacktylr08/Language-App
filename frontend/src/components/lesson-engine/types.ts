export type Feedback =
  | { kind: 'correct'; note?: string }
  | { kind: 'wrong'; correctAnswer: string; note?: string }
  | null;
