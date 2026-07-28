'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { dueWordCount } from '@/lib/progress';
import { useSyncedState } from '@/lib/hooks';
import { Icon, type IconName } from '@/components/icons/Icon';

/**
 * Persistent navigation.
 *
 * Before this, every screen invented its own way back — /read had a "back to
 * lessons" link, /tutor and /practice/listen called router.push('/lessons'),
 * and /practice had no exit at all. Everything was a spoke off the dashboard,
 * so getting from a reading passage to the tutor meant two moves through the
 * hub. On a phone that cost is most of what decides whether a feature gets
 * used at all.
 *
 * Review carries a due-count badge because that's the app's best reason to
 * come back on any given day, and until now it was the one thing with no
 * route to it whatsoever.
 */

const TABS: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: '/lessons', label: 'Learn', icon: 'learn' },
  { href: '/practice', label: 'Review', icon: 'review' },
  { href: '/tutor', label: 'Tutor', icon: 'chat' },
  { href: '/read', label: 'Read', icon: 'read' },
  { href: '/account', label: 'You', icon: 'account' },
];

/**
 * Routes that own the whole screen. A lesson in progress is a focused,
 * timed thing with its own exit — a tab bar sitting under it is both a
 * distraction and an easy way to lose your place by mis-tapping.
 */
const FULL_SCREEN = [
  /^\/lessons\/[^/]+$/, // a lesson in progress
  /^\/practice$/, // a practice session in progress
  /^\/practice\/listen$/, // eyes-free audio mode
  /^\/read\/[^/]+$/, // a reading passage
  /^\/tutor$/, // a live voice call — a mis-tap here drops the call
  /^\/onboarding$/,
];

export function BottomNav() {
  const pathname = usePathname();
  const syncTick = useSyncedState();
  // Rendered from client state only after mount: the server has no idea
  // whether this visitor is signed in, and rendering the bar then removing it
  // would flash on every first paint.
  const [mounted, setMounted] = useState(false);
  const [due, setDue] = useState(0);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && isAuthenticated()) setDue(dueWordCount());
  }, [mounted, syncTick, pathname]);

  if (!mounted || !isAuthenticated()) return null;
  if (FULL_SCREEN.some((re) => re.test(pathname))) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-stone-200/80 dark:border-stone-800 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="max-w-lg mx-auto flex">
        {TABS.map((tab) => {
          // /lessons must not light up while you're on /lessons/greetings —
          // that's a lesson, not the list.
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-stone-400 dark:text-stone-500 hover:text-ink dark:hover:text-stone-300'
                }`}
              >
                <Icon name={tab.icon} size={22} filled={active && tab.icon !== 'account'} />
                <span className="text-[10px] font-extrabold tracking-wide">{tab.label}</span>
                {tab.href === '/practice' && due > 0 && (
                  <span
                    className="absolute top-1.5 right-[calc(50%-1.35rem)] min-w-[17px] h-[17px] px-1 rounded-full bg-terra-500 text-white text-[10px] font-extrabold leading-[17px] text-center tabular-nums"
                    aria-label={`${due} words due for review`}
                  >
                    {due > 99 ? '99+' : due}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
