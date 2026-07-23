/**
 * Manual light/dark theme override. Tailwind here is configured with
 * `darkMode: 'class'`, which means dark styling only ever activates when a
 * `.dark` class is present on <html> — nothing was ever adding that class,
 * so dark mode was inert regardless of OS preference until this existed.
 * 'system' (the default) restores that OS-linked behavior; 'light'/'dark'
 * are an explicit override persisted across visits.
 */
export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'fluenta-theme';

export function getStoredTheme(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(KEY);
  return v === 'light' || v === 'dark' ? v : 'system';
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Applies the given preference to the document right now — no persistence. */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return;
  const dark = pref === 'dark' || (pref === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

/** Persists the preference (or clears it, for 'system') and applies it immediately. */
export function setTheme(pref: ThemePref): void {
  if (typeof window === 'undefined') return;
  if (pref === 'system') localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

/**
 * The exact snippet run inline (see ThemeScript) before hydration so the
 * correct theme is applied before first paint — inlined as a string here so
 * both places share one source of truth for the logic instead of drifting.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${KEY}';var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
