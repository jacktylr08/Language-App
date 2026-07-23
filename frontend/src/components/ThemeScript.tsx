import Script from 'next/script';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

/**
 * Runs before hydration (Next's `beforeInteractive` strategy — the
 * documented App Router way to inject a blocking script into the initial
 * HTML) so the .dark class, if applicable, is already set before first
 * paint. Without this the page would flash the wrong theme for a beat if
 * this ran as a regular client-side effect instead.
 */
export function ThemeScript() {
  return <Script id="theme-init" strategy="beforeInteractive">{THEME_INIT_SCRIPT}</Script>;
}
