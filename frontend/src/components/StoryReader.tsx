'use client';

import { useState } from 'react';

interface StoryBlock {
  id: string;
  spanish: string;
  english: string;
  vocabulary_highlighted?: string[];
}

interface StoryReaderProps {
  title: string;
  blocks: StoryBlock[];
  readingTimeMinutes?: number;
  onComplete: () => void;
}

export function StoryReader({ title, blocks, readingTimeMinutes, onComplete }: StoryReaderProps) {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [highlightedVocabId, setHighlightedVocabId] = useState<string | null>(null);

  const currentBlock = blocks[currentBlockIndex];
  const isLastBlock = currentBlockIndex === blocks.length - 1;

  const handleNext = () => {
    if (isLastBlock) {
      onComplete();
    } else {
      setCurrentBlockIndex(currentBlockIndex + 1);
      setShowEnglish(false);
      setHighlightedVocabId(null);
    }
  };

  const handlePrevious = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(currentBlockIndex - 1);
      setShowEnglish(false);
      setHighlightedVocabId(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 dark:text-white mb-2">{title}</h1>
        {readingTimeMinutes && (
          <p className="text-stone-600 dark:text-stone-400">
            Estimated reading time: {readingTimeMinutes} minutes
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="mb-8 bg-white dark:bg-stone-800 p-6 rounded-lg shadow">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Section {currentBlockIndex + 1} of {blocks.length}
          </span>
        </div>
        <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentBlockIndex + 1) / blocks.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Story content */}
      <div className="bg-white dark:bg-stone-800 p-8 rounded-lg shadow-lg mb-8">
        {/* Spanish text */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-4 uppercase tracking-wide">
            Spanish
          </h2>
          <p className="text-lg leading-relaxed text-stone-900 dark:text-white font-serif">
            {currentBlock.spanish}
          </p>
        </div>

        {/* English translation toggle */}
        <button
          onClick={() => setShowEnglish(!showEnglish)}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium mb-4"
        >
          {showEnglish ? '▼ Hide' : '▶ Show'} English Translation
        </button>

        {/* English text */}
        {showEnglish && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 mb-4 uppercase tracking-wide">
              English
            </h2>
            <p className="text-lg leading-relaxed text-stone-700 dark:text-stone-200">
              {currentBlock.english}
            </p>
          </div>
        )}

        {/* Highlighted vocabulary info */}
        {highlightedVocabId && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              Click a word in the Spanish text to see its meaning
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentBlockIndex === 0}
          className="flex-1 py-3 px-4 border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-semibold rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <button
          onClick={handleNext}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          {isLastBlock ? 'Complete Story' : 'Next →'}
        </button>
      </div>

      {/* Reading tips */}
      <div className="mt-8 p-4 bg-stone-100 dark:bg-stone-800 rounded-lg text-sm text-stone-600 dark:text-stone-400">
        <p>
          <strong>💡 Tip:</strong> Read without the English translation first. Try to understand from
          context. Use translation when stuck.
        </p>
      </div>
    </div>
  );
}
