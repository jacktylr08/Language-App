'use client';

import { useEffect, useRef, useState } from 'react';

interface SpeechAudioPlayerProps {
  script: string;
  onSentenceChange?: (sentenceIndex: number) => void;
}

export function SpeechAudioPlayer({ script, onSentenceChange }: SpeechAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.9);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [voicesReady, setVoicesReady] = useState(false);
  const [error, setError] = useState('');
  const spanishVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isMountedRef = useRef(true);

  // Split script into sentences for sequential playback
  const sentences = script
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Load Spanish voice
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setError('Speech synthesis not supported in this browser');
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer Spain Spanish, then any Spanish voice
      const spanishVoice =
        voices.find((v) => v.lang === 'es-ES') ||
        voices.find((v) => v.lang.startsWith('es-')) ||
        voices.find((v) => v.lang.startsWith('es'));

      if (spanishVoice) {
        spanishVoiceRef.current = spanishVoice;
        setVoicesReady(true);
      } else if (voices.length > 0) {
        setError('No Spanish voice available on this device');
      }
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      isMountedRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakSentence = (index: number) => {
    if (!isMountedRef.current) return;
    if (index >= sentences.length) {
      setIsPlaying(false);
      setCurrentIndex(0);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.lang = 'es-ES';
    utterance.rate = speed;
    utterance.pitch = 1;
    if (spanishVoiceRef.current) {
      utterance.voice = spanishVoiceRef.current;
    }

    utterance.onend = () => {
      if (!isMountedRef.current) return;
      const nextIndex = index + 1;
      setCurrentIndex(nextIndex);
      onSentenceChange?.(nextIndex);
      if (isPlayingRef.current) {
        speakSentence(nextIndex);
      }
    };

    utterance.onerror = () => {
      setError('Playback error');
      setIsPlaying(false);
    };

    utterancesRef.current.push(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handlePlay = () => {
    if (!voicesReady) return;

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.cancel();
        speakSentence(currentIndex);
      }
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setCurrentIndex(0);
    onSentenceChange?.(0);
    setIsPlaying(true);
    setTimeout(() => speakSentence(0), 100);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakSentence(currentIndex), 100);
    }
  };

  if (error) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 rounded-lg border border-amber-300 dark:border-amber-700">
        <p className="font-semibold">🔊 Audio Notice</p>
        <p className="text-sm mt-1">{error}</p>
        <p className="text-sm mt-2">You can still read the transcript below.</p>
      </div>
    );
  }

  const progress = sentences.length > 0 ? (currentIndex / sentences.length) * 100 : 0;

  return (
    <div className="bg-white dark:bg-stone-800 p-6 rounded-lg shadow-lg">
      {/* Play/Restart buttons */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handlePlay}
          disabled={!voicesReady}
          className="flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-stone-400 text-white transition-colors shadow-lg"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <button
          onClick={handleRestart}
          disabled={!voicesReady}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 transition-colors"
          aria-label="Restart"
          title="Restart from beginning"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mt-2">
          <span>
            Sentence {currentIndex + 1} of {sentences.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Current sentence highlight */}
      {isPlaying && sentences[currentIndex] && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border-l-4 border-blue-600">
          <p className="text-stone-900 dark:text-stone-100 italic">
            "{sentences[currentIndex]}"
          </p>
        </div>
      )}

      {/* Speed control */}
      <div className="flex items-center justify-center gap-2">
        <label className="text-sm text-stone-600 dark:text-stone-400 font-semibold">
          Speed:
        </label>
        <div className="flex gap-1">
          {[0.7, 0.85, 1.0, 1.15].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
                speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-500 dark:text-stone-500 text-center mt-4">
        🎧 Native browser-powered Castilian Spanish
      </p>
    </div>
  );
}
