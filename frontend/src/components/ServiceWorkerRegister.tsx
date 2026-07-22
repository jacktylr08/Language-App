'use client';

import { useEffect } from 'react';

/**
 * next-pwa's auto-injected registration script only targets the Pages
 * Router's main.js entry, which this App-Router-only app never produces —
 * so the generated /sw.js was never actually registering itself in
 * production. Without a registration, navigator.serviceWorker.ready (which
 * offline caching and push reminders both depend on) never resolves.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
