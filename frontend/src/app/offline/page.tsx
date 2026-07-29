import Link from 'next/link';
import { Profe } from '@/components/Profe';

export const metadata = { title: 'Offline — Fluenta' };

/**
 * Shown when a learner opens a page they've never visited while offline.
 *
 * Precached by the service worker so it's always available. The tone matters:
 * being offline isn't an error the learner caused, and quite a lot of the app
 * genuinely still works — so this points at what they can do rather than
 * apologising.
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <Profe mood="thinking" size={112} className="mx-auto mb-4" />
        <h1 className="font-display text-3xl font-black text-ink dark:text-white mb-2">
          You&apos;re offline
        </h1>
        <p className="text-ink-soft dark:text-stone-400 mb-7 leading-relaxed">
          Your lessons and reading are stored on this device, so most of Fluenta still works.
          Talking to Profe needs a connection.
        </p>
        <div className="space-y-2">
          <Link href="/lessons" className="btn-primary block w-full py-3.5">
            Go to your lessons
          </Link>
          <Link
            href="/read"
            className="block w-full py-3 font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200"
          >
            Read something instead
          </Link>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-600 mt-6">
          Anything you do now syncs as soon as you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
