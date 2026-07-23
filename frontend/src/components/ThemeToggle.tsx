'use client';

import { useEffect, useState } from 'react';
import { applyTheme, getStoredTheme, setTheme, type ThemePref } from '@/lib/theme';

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'Auto', icon: '🖥️' },
];

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>('system');

  useEffect(() => {
    setPref(getStoredTheme());

    // Keep 'system' live if the OS preference changes while this page is open.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getStoredTheme() === 'system') applyTheme('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const choose = (next: ThemePref) => {
    setPref(next);
    setTheme(next);
  };

  return (
    <div className="inline-flex rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark p-1" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => choose(o.value)}
          aria-pressed={pref === o.value}
          className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
            pref === o.value
              ? 'bg-brand-600 text-white'
              : 'text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200'
          }`}
        >
          <span aria-hidden>{o.icon}</span> {o.label}
        </button>
      ))}
    </div>
  );
}
