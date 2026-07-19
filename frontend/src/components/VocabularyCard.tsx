'use client';

import { useState } from 'react';

interface VocabularyCardProps {
  id: string;
  spanish: string;
  english: string[];
  audioUrl?: string;
  exampleSentence?: {
    spanish: string;
    english: string;
  };
  reps: number;
  masteryConfidence: number;
  onReview: (quality: 0 | 1 | 2 | 3 | 4 | 5, responseTime: number) => void;
  disabled?: boolean;
}

export function VocabularyCard({
  id,
  spanish,
  english,
  audioUrl,
  exampleSentence,
  reps,
  masteryConfidence,
  onReview,
  disabled,
}: VocabularyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime] = useState(Date.now());

  const handleReview = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    const responseTime = Date.now() - startTime;
    onReview(quality, responseTime);
  };

  const playAudio = async () => {
    if (!audioUrl) return;
    try {
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  };

  const confidenceBar = Math.round(masteryConfidence * 100);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div
        onClick={() => !disabled && setIsFlipped(!isFlipped)}
        className={`relative w-full h-80 cursor-pointer transform transition-transform duration-300 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div
          className="absolute w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 flex flex-col justify-center items-center text-white"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <p className="text-sm opacity-75 mb-4">Spanish Word</p>
            <p className="text-5xl font-bold mb-8">{spanish}</p>

            {audioUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playAudio();
                }}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                🔊 Hear It
              </button>
            )}

            <p className="text-sm opacity-50 mt-8">Click to reveal answer</p>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute w-full h-full bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-8 flex flex-col justify-center items-start text-white"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="w-full">
            <p className="text-sm opacity-75 mb-2">English Translation</p>
            <p className="text-2xl font-bold mb-6">{english.join(', ')}</p>

            {exampleSentence && (
              <div className="mb-6 bg-black bg-opacity-20 p-4 rounded">
                <p className="text-xs opacity-75 mb-2">Example:</p>
                <p className="italic mb-2">{exampleSentence.spanish}</p>
                <p className="text-sm">{exampleSentence.english}</p>
              </div>
            )}

            <p className="text-xs opacity-75 mb-2">
              Reviews: {reps} | Mastery: {confidenceBar}%
            </p>

            <p className="text-xs opacity-50">Click to see Spanish again</p>
          </div>
        </div>
      </div>

      {/* Quality buttons */}
      {isFlipped && !disabled && (
        <div className="mt-8">
          <p className="text-center text-slate-700 dark:text-slate-300 mb-4 font-medium">
            How well did you know this?
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleReview(0)}
              className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition-colors"
              title="Forgot completely"
            >
              ✗ Forgot
            </button>
            <button
              onClick={() => handleReview(2)}
              className="py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold text-sm transition-colors"
              title="Incorrect but with effort"
            >
              ~ Hard
            </button>
            <button
              onClick={() => handleReview(4)}
              className="py-2 px-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold text-sm transition-colors"
              title="Correct with hesitation"
            >
              ◐ Okay
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => handleReview(3)}
              className="py-2 px-3 bg-lime-600 hover:bg-lime-700 text-white rounded font-semibold text-sm transition-colors"
              title="Correct but difficult"
            >
              ◔ Got It
            </button>
            <button
              onClick={() => handleReview(5)}
              className="py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm transition-colors"
              title="Perfect response"
            >
              ✓ Perfect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
