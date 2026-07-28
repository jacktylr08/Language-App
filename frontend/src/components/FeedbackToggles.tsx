'use client';

import { useEffect, useState } from 'react';
import {
  soundEnabled,
  hapticsEnabled,
  setSoundEnabled,
  setHapticsEnabled,
  feedback,
} from '@/lib/feedback';
import { Icon } from '@/components/icons/Icon';

/**
 * Sound and vibration switches.
 *
 * Both default ON, so a learner who never opens settings gets the designed
 * experience — but they're the first thing anyone reaches for when they're
 * on a train, so they belong in settings rather than buried.
 *
 * Turning sound ON plays the confirmation tone immediately. That's the point:
 * a toggle for something you can't perceive is untrustworthy, and the tap
 * that flips it is also the user gesture browsers require before an
 * AudioContext may start.
 */
function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? 'bg-brand-500' : 'bg-stone-300 dark:bg-stone-700'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function FeedbackToggles() {
  // Read after mount — localStorage isn't available during the server render,
  // and defaulting to `false` here would flash both switches off.
  const [mounted, setMounted] = useState(false);
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    setMounted(true);
    setSound(soundEnabled());
    setHaptics(hapticsEnabled());
  }, []);

  if (!mounted) return null;

  const hapticsSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon name="speaker" size={20} className="mt-0.5 shrink-0 text-ink-soft dark:text-stone-400" />
          <div className="min-w-0">
            <p className="font-bold text-ink dark:text-white">Sound effects</p>
            <p className="text-sm text-ink-soft dark:text-stone-400">
              Short tones when you answer and finish a lesson.
            </p>
          </div>
        </div>
        <Switch
          on={sound}
          label="Sound effects"
          onChange={(next) => {
            setSoundEnabled(next);
            setSound(next);
            // Play it the moment it's switched on, so the setting proves itself.
            if (next) feedback('correct');
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Icon name="target" size={20} className="mt-0.5 shrink-0 text-ink-soft dark:text-stone-400" />
          <div className="min-w-0">
            <p className="font-bold text-ink dark:text-white">Vibration</p>
            <p className="text-sm text-ink-soft dark:text-stone-400">
              {hapticsSupported
                ? 'A small buzz with each answer.'
                : "This browser doesn't support vibration."}
            </p>
          </div>
        </div>
        <Switch
          on={haptics && hapticsSupported}
          label="Vibration"
          onChange={(next) => {
            if (!hapticsSupported) return;
            setHapticsEnabled(next);
            setHaptics(next);
            if (next) feedback('tap');
          }}
        />
      </div>
    </div>
  );
}
