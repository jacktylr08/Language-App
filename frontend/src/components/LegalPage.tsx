import Link from 'next/link';
import { BrandMark } from '@/components/icons/BrandMark';
import { Icon } from '@/components/icons/Icon';

/**
 * The shell for the privacy policy, terms and support pages.
 *
 * These are a hard requirement to submit to either app store — Apple and
 * Google both need a reachable privacy policy URL and a support URL, and the
 * app had neither. They're also the pages where being vague is worst: anyone
 * reading them is trying to find out what actually happens to their data, so
 * they name the third parties involved plainly rather than saying "trusted
 * partners".
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] pb-24">
      <div className="max-w-2xl mx-auto px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 py-2 text-sm font-bold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
        >
          <Icon name="arrow-left" size={16} /> Fluenta
        </Link>

        <BrandMark size={44} className="rounded-[13px] shadow-card mt-6 mb-5" />
        <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-tight">
          {title}
        </h1>
        <p className="text-sm text-ink-soft dark:text-stone-500 mt-2 mb-8">Last updated {updated}</p>

        {/* Deliberately generous line-height and a narrow measure: these are
            the pages people actually try to read rather than skim. */}
        <div className="space-y-7 text-[15px] leading-relaxed text-ink dark:text-stone-200">
          {children}
        </div>

        <nav className="mt-14 pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-ink-soft dark:text-stone-400">
          <Link href="/privacy" className="hover:text-ink dark:hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink dark:hover:text-white">
            Terms
          </Link>
          <Link href="/support" className="hover:text-ink dark:hover:text-white">
            Support
          </Link>
        </nav>
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-black text-ink dark:text-white mb-2">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
