import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LessonEngine } from '@/components/LessonEngine';
import { getCurriculum } from '@/lib/curriculum';
import type { Exercise } from '@/lib/exercise-engine';
import { api } from '@/lib/api';

jest.mock('@/lib/tts', () => ({
  speakNeural: jest.fn(),
  stopSpeaking: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn() },
}));

// Keep the real buildRetry (wrong answers depend on it) but pin down the
// queue itself so each test controls exactly which exercise is on screen.
jest.mock('@/lib/exercise-engine', () => {
  const actual = jest.requireActual('@/lib/exercise-engine');
  return { ...actual, buildLessonSession: jest.fn() };
});

import { buildLessonSession } from '@/lib/exercise-engine';

const lesson = getCurriculum().find((l) => l.slug === 'ser-identity')!;

function vocab(id: string, es: string, en: string) {
  return { id, es, en, pron: '', exampleEs: '', exampleEn: '' };
}

function setQueue(exercises: Exercise[]) {
  (buildLessonSession as jest.Mock).mockReturnValue(exercises);
}

async function start() {
  render(<LessonEngine lesson={lesson} mode="lesson" />);
  fireEvent.click(await screen.findByText('START LESSON'));
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('LessonEngine — mcq flow', () => {
  it('marks a correct answer and lets the learner continue', async () => {
    setQueue([
      { type: 'mcq_es_en', word: vocab('v1', 'hola', 'hello'), options: ['hello', 'goodbye', 'please', 'thanks'] },
    ]);
    await start();

    fireEvent.click(screen.getByText('hello'));
    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.getByText('CONTINUE')).toBeInTheDocument();
  });

  it('shows the right answer when the learner picks wrong', async () => {
    setQueue([
      { type: 'mcq_es_en', word: vocab('v1', 'hola', 'hello'), options: ['hello', 'goodbye', 'please', 'thanks'] },
    ]);
    await start();

    fireEvent.click(screen.getByText('goodbye'));
    expect(await screen.findByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText('Correct answer:', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('hello').length).toBeGreaterThan(0);
  });
});

describe('LessonEngine — type_es and type_en recall', () => {
  it('marks a correctly typed Spanish answer correct (type_es)', async () => {
    setQueue([{ type: 'type_es', word: vocab('v1', 'después', 'after / then') }]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Escribe en español…'), { target: { value: 'después' } });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
  });

  it('marks a correctly typed English meaning correct (type_en)', async () => {
    setQueue([{ type: 'type_en', word: vocab('v1', 'hola', 'hello') }]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Type it in English…'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
  });

  it('accepts a listed alternative English answer (type_en with enAlt)', async () => {
    setQueue([
      { type: 'type_en', word: { ...vocab('v1', 'después', 'after / then'), enAlt: ['afterwards', 'then', 'after that'] } },
    ]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Type it in English…'), { target: { value: 'afterwards' } });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
  });

  it('marks a wrong English guess wrong and shows the real meaning (type_en)', async () => {
    setQueue([{ type: 'type_en', word: vocab('v1', 'hola', 'hello') }]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Type it in English…'), { target: { value: 'goodbye' } });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});

describe('LessonEngine — free-composition writing exercise', () => {
  const writingExercise: Exercise = {
    type: 'write_answer',
    word: vocab('wa-1', '', ''),
    writingPrompt: { instruction: 'Write 1–2 sentences in Spanish using at least two of these words.', suggested: ['soy', 'de'] },
    noWordTracking: true,
  };

  it('grades a correct attempt and shows the tutor’s note', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { correct: true, feedback: 'Nicely put together.', corrected: 'Soy de España.' },
    });
    setQueue([writingExercise]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Escribe en español…'), {
      target: { value: 'Soy de España' },
    });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.getByText('Nicely put together.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith(
      '/tutor/grade-writing',
      expect.objectContaining({
        instruction: writingExercise.writingPrompt!.instruction,
        suggestedVocab: writingExercise.writingPrompt!.suggested,
        answer: 'Soy de España',
      })
    );
  });

  it('marks a genuinely wrong attempt and offers a corrected version instead of the raw answer', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { correct: false, feedback: 'That was mostly English.', corrected: 'Soy de Inglaterra.' },
    });
    setQueue([writingExercise]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Escribe en español…'), {
      target: { value: 'I am from England' },
    });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText('A natural way to say it:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Soy de Inglaterra.')).toBeInTheDocument();
  });

  it('fails soft and does not block progress when grading is unavailable', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('network error'));
    setQueue([writingExercise]);
    await start();

    fireEvent.change(screen.getByPlaceholderText('Escribe en español…'), {
      target: { value: 'Soy de España' },
    });
    fireEvent.click(screen.getByText('CHECK'));

    expect(await screen.findByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.getByText(/Couldn.t check that automatically/)).toBeInTheDocument();
  });

  it('disables submission until something is written', async () => {
    setQueue([writingExercise]);
    await start();

    expect(screen.getByText('CHECK')).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Escribe en español…'), { target: { value: 'Hola' } });
    expect(screen.getByText('CHECK')).not.toBeDisabled();
  });
});
