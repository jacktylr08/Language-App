'use client';

import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/icons/BrandMark';
import { Icon } from '@/components/icons/Icon';

/**
 * The shared shell for sign-in and sign-up.
 *
 * Both were a centred card floating on a page, which is the web's idiom for a
 * form — an app doesn't do that. An app's sign-in is a full screen with a back
 * arrow, a big heading, edge-to-edge fields and the primary button anchored at
 * the bottom where a thumb is.
 *
 * The fields themselves matter as much as the layout: the previous inputs had
 * no autoComplete, so iOS and Android never offered a saved password, and no
 * enterKeyHint, so the keyboard's action key said "return" instead of "Go".
 * Those are the details that make a form feel native rather than embedded.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col">
        <button
          onClick={() => router.back()}
          className="shrink-0 self-start -ml-2 p-2 text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-white"
          aria-label="Back"
        >
          <Icon name="arrow-left" size={22} />
        </button>

        <div className="flex-1 flex flex-col justify-center py-4">
          <BrandMark size={48} className="rounded-[14px] shadow-card mb-5" />
          <h1 className="font-display text-4xl font-black text-ink dark:text-white leading-tight">
            {title}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mt-1.5 mb-7">{subtitle}</p>
          {children}
        </div>

        <div className="shrink-0">{footer}</div>
      </div>
    </div>
  );
}

/**
 * A form field sized for a thumb. 16px text is deliberate — anything smaller
 * makes iOS Safari zoom the whole page on focus, which feels broken.
 */
export function Field({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-bold uppercase tracking-wide text-ink-soft dark:text-stone-400 mb-1.5">
        {label}
      </span>
      <input
        {...props}
        className={`w-full text-base px-4 py-3.5 rounded-2xl border-2 bg-white dark:bg-stone-900/60 text-ink dark:text-white transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/15 ${
          error
            ? 'border-terra-400 focus:border-terra-500'
            : 'border-stone-200 dark:border-stone-700 focus:border-brand-500'
        }`}
      />
    </label>
  );
}

/** Errors sit next to the form, announced, and never as a red banner block. */
export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 text-sm font-semibold text-terra-600 dark:text-terra-400"
    >
      <Icon name="close" size={15} className="mt-0.5 shrink-0" />
      {message}
    </p>
  );
}
