/**
 * The Fluenta mark.
 *
 * A speech bubble with a tilde inside it. The tilde is the point: it's the
 * one diacritic that is unmistakably Spanish (the ñ), it's a single confident
 * stroke that survives being 40px on a home screen, and it reads as a wave —
 * speech, rhythm, the shape of someone talking. The bubble carries the
 * meaning at a glance; the tilde is what makes it ours rather than any of the
 * hundred other chat-bubble apps.
 *
 * This replaced a literal capital "F" on a green square, written inline in
 * manifest.json as a placeholder and never revisited — the first thing every
 * user ever saw of the app.
 */

export function BrandMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="fluenta-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E9463" />
          <stop offset="100%" stopColor="#1B6742" />
        </linearGradient>
      </defs>
      {/* iOS masks icons to a squircle, so the artwork must survive a crop:
          nothing meaningful goes within ~10% of any edge. */}
      <rect width="512" height="512" rx="112" fill="url(#fluenta-ground)" />
      <path
        d="M136 148h240a40 40 0 0 1 40 40v116a40 40 0 0 1-40 40H252l-74 62a10 10 0 0 1-16-8v-54h-26a40 40 0 0 1-40-40V188a40 40 0 0 1 40-40Z"
        fill="#FAF7F2"
      />
      {/* The tilde. Drawn as one stroke so it stays legible when the whole
          mark is scaled down to a favicon. */}
      <path
        d="M186 258c14-30 34-30 52-14s38 16 52-14"
        stroke="#1B6742"
        strokeWidth="30"
        strokeLinecap="round"
        fill="none"
      />
      {/* A single saffron dot — the accent colour, and the thing that stops
          the mark reading as monochrome at small sizes. */}
      <circle cx="349" cy="246" r="17" fill="#EDA417" />
    </svg>
  );
}

/** The wordmark used in the app's own header — mark plus name, locked up. */
export function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={30} className="rounded-[9px] shadow-sm" />
      <span className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
        Fluenta
      </span>
    </span>
  );
}
