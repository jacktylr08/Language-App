'use client';

import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function AudioPlayer({ audioUrl, onTimeUpdate }: AudioPlayerProps) {
  const howlerRef = useRef<Howl | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!audioUrl) return;

    // Create Howler instance
    howlerRef.current = new Howl({
      src: [audioUrl],
      html5: true,
      onload: () => {
        setDuration(howlerRef.current!.duration());
        setError('');
      },
      onplay: () => setIsPlaying(true),
      onstop: () => setIsPlaying(false),
      onpause: () => setIsPlaying(false),
    });

    // Handle errors. NOTE: Howler's event is 'playerror' (single "r").
    // Using an unknown event name makes Howler.on() dereference an
    // undefined listener array and throw, which crashed the whole page.
    howlerRef.current.on('loaderror', () => {
      setError('Failed to load audio');
    });
    howlerRef.current.on('playerror', () => {
      setError('Failed to play audio');
    });

    // Update current time
    const interval = setInterval(() => {
      if (howlerRef.current && howlerRef.current.playing()) {
        const current = howlerRef.current.seek();
        setCurrentTime(current);
        onTimeUpdate?.(current);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      howlerRef.current?.unload();
    };
  }, [audioUrl, onTimeUpdate]);

  // Apply playback speed
  useEffect(() => {
    if (howlerRef.current) {
      howlerRef.current.rate(speed);
    }
  }, [speed]);

  const togglePlayPause = () => {
    if (!howlerRef.current) return;

    if (isPlaying) {
      howlerRef.current.pause();
    } else {
      howlerRef.current.play();
    }
  };

  const handleSeek = (time: number) => {
    if (howlerRef.current) {
      howlerRef.current.seek(time);
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-800 p-6 rounded-lg shadow-lg">
      {/* Play/Pause */}
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={togglePlayPause}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          {isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={(e) => handleSeek(parseFloat(e.target.value))}
          className="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between items-center text-sm text-stone-600 dark:text-stone-400 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Speed control */}
      <div className="flex items-center justify-center gap-2">
        <label className="text-sm text-stone-600 dark:text-stone-400">Speed:</label>
        <select
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="px-3 py-1 border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-700 text-stone-900 dark:text-white text-sm"
        >
          <option value={0.75}>0.75x</option>
          <option value={1.0}>1.0x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
        </select>
      </div>
    </div>
  );
}
