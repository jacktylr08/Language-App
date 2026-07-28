/**
 * Loading placeholders that keep the page's shape.
 *
 * The app had seventeen spinners, each centred on an otherwise blank screen.
 * A spinner in the void is the most reliable "this is a website" tell there
 * is: native apps show you the structure of what's arriving and fill it in.
 * It also *feels* faster, because the layout stops jumping when the data
 * lands — the boxes were already the right size.
 */

function Block({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-800/70 ${className}`}
      aria-hidden
    />
  );
}

/**
 * Wraps any skeleton so screen readers announce a load rather than reading
 * out a screenful of meaningless boxes.
 */
function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** The dashboard: journey card, a hero card, then the phase list. */
export function DashboardSkeleton() {
  return (
    <Frame label="Loading your lessons">
      <div className="min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          <Block className="h-9 w-40" />
          <Block className="h-5 w-64" />
          <Block className="h-36 w-full mt-6" />
          <Block className="h-32 w-full" />
          <Block className="h-32 w-full" />
          <div className="space-y-2 pt-2">
            <Block className="h-16 w-full" />
            <Block className="h-16 w-full" />
            <Block className="h-16 w-full" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** A lesson or practice session about to start. */
export function LessonSkeleton() {
  return (
    <Frame label="Loading your lesson">
      <div className="min-h-screen bg-paper dark:bg-paper-dark flex flex-col">
        <div className="px-4 pt-4">
          <Block className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full flex flex-col items-center gap-4">
            <Block className="h-24 w-24 rounded-[28px]" />
            <Block className="h-10 w-56" />
            <Block className="h-5 w-72" />
            <Block className="h-24 w-full mt-4" />
            <Block className="h-14 w-full mt-4" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** The reading library grid. */
export function ReadingListSkeleton() {
  return (
    <Frame label="Loading the reading list">
      <div className="min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          <Block className="h-5 w-32" />
          <Block className="h-9 w-52" />
          <div className="space-y-3 pt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Block key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** A single reading passage. */
export function PassageSkeleton() {
  return (
    <Frame label="Loading the passage">
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          <Block className="h-5 w-28" />
          <Block className="h-10 w-10 rounded-xl mt-4" />
          <Block className="h-9 w-56" />
          <div className="space-y-3 pt-4">
            <Block className="h-5 w-full" />
            <Block className="h-5 w-full" />
            <Block className="h-5 w-4/5" />
            <Block className="h-5 w-full mt-6" />
            <Block className="h-5 w-full" />
            <Block className="h-5 w-3/4" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** The account/settings page. */
export function SettingsSkeleton() {
  return (
    <Frame label="Loading your settings">
      <div className="min-h-screen pb-24">
        <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          <Block className="h-5 w-24" />
          <Block className="h-11 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    </Frame>
  );
}

/**
 * The fallback for a screen with no bespoke skeleton yet — still better than
 * a spinner, because it holds the page height and doesn't spin.
 */
export function PageSkeleton() {
  return (
    <Frame label="Loading">
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
          <Block className="h-9 w-48" />
          <Block className="h-5 w-64" />
          <Block className="h-40 w-full mt-4" />
          <Block className="h-40 w-full" />
        </div>
      </div>
    </Frame>
  );
}
