'use client';

import { useMemo, useState } from 'react';
import {
  type ReadingPassage as ReadingPassageData,
  type ReadingResult,
  type WordLookup,
  lookupWord,
  normalizeToken,
  reconcileReadingProgress,
} from '@/lib/readings';
import { touchStreak } from '@/lib/progress';

interface ReadingPassageProps {
  passage: ReadingPassageData;
  onClose: () => void;
}

interface Token {
  raw: string;
  isWord: boolean;
}

function tokenizeParagraph(paragraph: string): Token[] {
  // Keep whitespace as its own token so natural line-wrapping reflows
  // exactly like plain text — only non-whitespace chunks are tappable.
  return paragraph.split(/(\s+)/).map((raw) => ({ raw, isWord: raw.trim().length > 0 }));
}

export function ReadingPassage({ passage, onClose }: ReadingPassageProps) {
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [gloss, setGloss] = useState<{ word: string; en: string } | null>(null);
  const [result, setResult] = useState<ReadingResult | null>(null);

  const paragraphs = useMemo(() => passage.text.trim().split(/\n\s*\n/), [passage.text]);

  const handleTapWord = (raw: string, lookup: WordLookup) => {
    setGloss({ word: normalizeToken(raw), en: lookup.en });
    if (lookup.vocabId) {
      setTappedIds((prev) => {
        const next = new Set(prev);
        next.add(lookup.vocabId!);
        return next;
      });
    }
  };

  const handleFinish = () => {
    const stats = reconcileReadingProgress(passage, tappedIds);
    touchStreak();
    setResult(stats);
  };

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-5xl">{passage.emoji}</p>
        <h1 className="font-display text-3xl font-black text-ink dark:text-white">
          Nice reading
        </h1>
        <div className="flex gap-6">
          <div>
            <p className="font-display text-3xl font-black text-brand-600 dark:text-brand-400">
              {result.recognized}
            </p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">read without help</p>
          </div>
          <div>
            <p className="font-display text-3xl font-black text-terra-500">{result.reviewed}</p>
            <p className="text-xs text-ink-soft dark:text-stone-400 mt-1">tapped for help</p>
          </div>
        </div>
        <button onClick={onClose} className="btn-primary h-12 px-8">
          Back to reading list
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-10 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> Reading list
        </button>
        <span className="text-xs font-bold text-ink-soft/70 dark:text-stone-500">
          Tap any word for its meaning
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <p className="text-4xl mb-2">{passage.emoji}</p>
        <h1 className="font-display text-3xl font-black text-ink dark:text-white mb-8">
          {passage.title}
        </h1>

        <div className="space-y-5 text-lg leading-loose text-ink dark:text-stone-200">
          {paragraphs.map((para, pi) => (
            <p key={pi}>
              {tokenizeParagraph(para).map((tok, ti) => {
                if (!tok.isWord) return <span key={ti}>{tok.raw}</span>;
                const wordLookup = lookupWord(tok.raw, passage);
                if (!wordLookup) return <span key={ti}>{tok.raw}</span>;
                const tapped = !!wordLookup.vocabId && tappedIds.has(wordLookup.vocabId);
                return (
                  <span
                    key={ti}
                    onClick={() => handleTapWord(tok.raw, wordLookup)}
                    className={`cursor-pointer rounded px-0.5 transition-colors ${
                      tapped
                        ? 'bg-terra-100 dark:bg-terra-900/40 underline decoration-terra-400 decoration-2 underline-offset-2'
                        : 'hover:bg-brand-100 dark:hover:bg-brand-900/30'
                    }`}
                  >
                    {tok.raw}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        <button onClick={handleFinish} className="btn-primary w-full py-4 mt-10">
          I'm done reading
        </button>
      </div>

      {gloss && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-ink dark:bg-stone-800 text-white px-6 py-4 shadow-glow">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <p className="font-bold">
              {gloss.word} <span className="font-normal opacity-80">— {gloss.en}</span>
            </p>
            <button onClick={() => setGloss(null)} className="opacity-70 hover:opacity-100 text-xl">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
