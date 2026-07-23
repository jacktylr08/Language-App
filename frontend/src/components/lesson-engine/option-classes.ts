import type { Feedback } from './types';

export function optionClasses(
  option: string,
  selected: string | null,
  feedback: Feedback,
  correctAnswer: string
): string {
  const base = 'w-full px-5 py-4 text-left text-lg font-semibold ';
  if (!feedback) {
    return base + 'option-tile';
  }
  if (option === correctAnswer) {
    return base + 'option-tile option-tile-correct';
  }
  if (option === selected) {
    return base + 'option-tile option-tile-wrong animate-shake';
  }
  return base + 'option-tile option-tile-faded';
}
