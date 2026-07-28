/**
 * The app's icon set.
 *
 * Everything used to be emoji — three <svg> elements existed in the entire
 * frontend and every lesson, tab, card and celebration was a 🎉. Emoji look
 * different on every operating system, can't take your brand colours, can't
 * be animated, and read to anyone who looks at a lot of apps as "nobody
 * designed this".
 *
 * These are drawn on a shared 24×24 grid with a 2px stroke and round caps, so
 * they sit together as one family. They inherit `currentColor`, so colour is
 * decided by the surrounding text colour exactly like a glyph would be.
 */

export type IconName =
  // Navigation
  | 'learn'
  | 'review'
  | 'tutor'
  | 'read'
  | 'account'
  // Lesson themes
  | 'sound'
  | 'verbs'
  | 'family'
  | 'objects'
  | 'palette'
  | 'refresh'
  | 'grammar'
  | 'chat'
  // Actions and states
  | 'check'
  | 'close'
  | 'mic'
  | 'speaker'
  | 'flame'
  | 'arrow-right'
  | 'arrow-left'
  | 'lock'
  | 'star'
  | 'headphones'
  | 'sparkle'
  | 'target'
  | 'pencil'
  | 'trophy'
  | 'bandage'
  | 'clock'
  | 'bell'
  | 'moon'
  | 'sun'
  | 'chevron-down';

interface IconProps {
  name: IconName;
  /** Rendered size in px. The grid is 24, so anything scales cleanly. */
  size?: number;
  className?: string;
  /**
   * Decorative by default — icons here almost always sit next to a text
   * label. Pass a label only when the icon is the sole meaning.
   */
  label?: string;
  /** Filled variant, for the active state of a nav tab. */
  filled?: boolean;
}

/** Paths are stroked, not filled, unless the icon reads better solid. */
const PATHS: Record<IconName, JSX.Element> = {
  learn: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </>
  ),
  review: (
    <>
      <path d="M13 2 5 13h5l-1 9 8-11h-5Z" />
    </>
  ),
  tutor: (
    <>
      <path d="M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Z" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  read: (
    <>
      <path d="M3 5.5c3-1 6-1 9 .5 3-1.5 6-1.5 9-.5v13c-3-1-6-1-9 .5-3-1.5-6-1.5-9-.5Z" />
      <path d="M12 6v13" />
    </>
  ),
  // A person, not a cog. The cog version was a circle with radiating spokes,
  // which at 22px in a tab bar is indistinguishable from the `sun` icon two
  // rows below — and "You" is a person anyway, not a settings screen.
  account: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  sound: (
    <>
      <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2M21 12h.01" />
    </>
  ),
  verbs: <path d="M13 2 5 13h5l-1 9 8-11h-5Z" />,
  family: (
    <>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2 20a6 6 0 0 1 12 0M14.5 20a5 5 0 0 1 7.5-4.3" />
    </>
  ),
  objects: (
    <>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9Z" />
      <path d="M3 7.5 12 12l9-4.5M12 12v9" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.7-.8 1.7-1.6 0-1.4-1-1.7-1-2.7 0-.8.6-1.4 1.5-1.4H16a5 5 0 0 0 5-5c0-4-4-7.3-9-7.3Z" />
      <circle cx="8" cy="10" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16" cy="10" r="1" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </>
  ),
  grammar: (
    <>
      <path d="M4 6h16M4 12h10M4 18h13" />
      <circle cx="18.5" cy="12" r="1.6" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4Z" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3L12 5v14l-5-4.5H4Z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  flame: (
    <path d="M12 2.5s4.5 4 4.5 8a4.5 4.5 0 0 1-9 0c0-1.3.5-2.4 1.2-3.3.2 1.5 1 2.3 1.8 2.3 1.3 0 1.5-1.8 1.5-3.3 0-1.5 0-3.7 0-3.7Z" />
  ),
  'arrow-right': <path d="M4 12h15m-6-6 6 6-6 6" />,
  'arrow-left': <path d="M20 12H5m6 6-6-6 6-6" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  star: <path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8Z" />,
  headphones: (
    <>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
      <rect x="2.5" y="14" width="5" height="7" rx="2" />
      <rect x="16.5" y="14" width="5" height="7" rx="2" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v5M12 16v5M4.5 12h5M14.5 12h5" />
      <path d="m7.5 7.5 2.5 2.5M14 14l2.5 2.5M16.5 7.5 14 10M10 14l-2.5 2.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  pencil: (
    <>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4.5 1.5L5 15Z" />
      <path d="m14.5 5.5 3 3" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 5.5H4.5V7a3 3 0 0 0 3 3M17 5.5h2.5V7a3 3 0 0 1-3 3" />
      <path d="M12 14v3.5M8.5 21h7l-.8-3.5h-5.4Z" />
    </>
  ),
  bandage: (
    <>
      <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-30 12 12)" />
      <path d="M10.5 10.5h.01M13.5 13.5h.01M13.5 10.5h.01M10.5 13.5h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M2 12h2M20 12h2M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" />
    </>
  ),
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
};

/** Icons that read better as a solid shape than an outline. */
const SOLID: ReadonlySet<IconName> = new Set(['review', 'verbs', 'flame', 'star', 'moon']);

export function Icon({ name, size = 24, className = '', label, filled }: IconProps) {
  const solid = filled ?? SOLID.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={solid ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={solid ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}
