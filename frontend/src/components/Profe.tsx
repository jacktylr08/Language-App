'use client';

/**
 * Profe.
 *
 * The AI tutor is the best thing in this app and, until now, it was a string.
 * The word "Profe" appeared 25 times in the UI and there was nothing to look
 * at — no face, no reaction, nothing that behaved like a someone. Duolingo
 * isn't loved for its scheduler; it's loved for Duo.
 *
 * Drawn rather than photographed, and deliberately simple: a warm round face,
 * one strong shape (the glasses), and a small set of states. Simple survives
 * being 32px in a nav card and 200px on a call screen, and it doesn't fall
 * into the uncanny valley the way a detailed face does.
 *
 * Every state changes the eyes and mouth only. Keeping the head, hair and
 * glasses fixed is what makes it read as the same character reacting, rather
 * than five different drawings.
 */

export type ProfeMood =
  | 'idle' // resting, a small smile — the default everywhere
  | 'happy' // you got it right
  | 'thinking' // waiting on the model, or on you
  | 'listening' // the mic is live
  | 'speaking' // the tutor is talking
  | 'encouraging'; // you got it wrong; this is the one that must not gloat

interface ProfeProps {
  mood?: ProfeMood;
  size?: number;
  className?: string;
  /** Adds a gentle idle bob. Off inside a lesson, where stillness is kinder. */
  animate?: boolean;
}

const SKIN = '#E8B48C';
const SKIN_SHADE = '#D89E72';
const HAIR = '#3B2A24';
const FRAME = '#1B6742';
const SCARF = '#C4573F';

export function Profe({ mood = 'idle', size = 96, className = '', animate = false }: ProfeProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${animate ? 'animate-bounce-slow' : ''} ${className}`}
      role="img"
      aria-label="Profe, your language tutor"
    >
      {/* Shoulders and scarf — enough body to stop the head floating */}
      <path d="M22 120c0-17 17-28 38-28s38 11 38 28Z" fill={SCARF} />
      <path d="M44 96c5 5 11 7 16 7s11-2 16-7l-4-8H48Z" fill={SKIN_SHADE} />

      {/* Head */}
      <ellipse cx="60" cy="58" rx="31" ry="33" fill={SKIN} />
      {/* Ears */}
      <ellipse cx="29" cy="60" rx="5" ry="7" fill={SKIN_SHADE} />
      <ellipse cx="91" cy="60" rx="5" ry="7" fill={SKIN_SHADE} />

      {/* Hair — a soft cap with a slight sweep, drawn once and never changed
          between moods so the character stays recognisably one person. */}
      <path d="M29 54c0-20 14-31 31-31s31 11 31 31c0-9-9-13-16-14-6-1-9 3-18 3s-13-5-20-2c-5 2-8 6-8 13Z" fill={HAIR} />

      {/* Glasses — the single strongest shape, and what makes a 32px version
          still read as Profe rather than a generic face. */}
      <g stroke={FRAME} strokeWidth="3" fill="none">
        <circle cx="48" cy="57" r="11" />
        <circle cx="72" cy="57" r="11" />
        <path d="M59 57h2M37 55l-6-2M83 55l6-2" strokeLinecap="round" />
      </g>

      <Eyes mood={mood} />
      <Mouth mood={mood} />

      {/* Speaking gets a small sound cue rather than an animated mouth — an
          open mouth that isn't synced to real audio looks broken. */}
      {mood === 'speaking' && (
        <g stroke={FRAME} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85">
          <path d="M99 50a9 9 0 0 1 0 14">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.1s" repeatCount="indefinite" />
          </path>
          <path d="M105 44a16 16 0 0 1 0 26">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.1s"
              begin="0.25s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      )}

      {/* Listening: a pulse by the ear, so the learner can see the mic is live
          without reading anything. */}
      {mood === 'listening' && (
        <circle cx="99" cy="57" r="5" fill={SCARF}>
          <animate attributeName="r" values="4;7;4" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.35;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function Eyes({ mood }: { mood: ProfeMood }) {
  // Happy eyes are closed arcs — the "smiling with your eyes" shape does more
  // for warmth than any change to the mouth.
  if (mood === 'happy') {
    return (
      <g stroke={HAIR} strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M43 58c2-4 8-4 10 0M67 58c2-4 8-4 10 0" />
      </g>
    );
  }
  if (mood === 'thinking') {
    // Both pupils up AND to one side. Up alone reads as blank or vacant —
    // it's the sideways glance that makes it look like someone considering
    // rather than someone switched off.
    return (
      <g fill={HAIR}>
        <circle cx="51.5" cy="53.5" r="3.2" />
        <circle cx="75.5" cy="53.5" r="3.2" />
        <circle cx="52.4" cy="52.6" r="1" fill="#fff" />
        <circle cx="76.4" cy="52.6" r="1" fill="#fff" />
      </g>
    );
  }
  return (
    <g fill={HAIR}>
      <circle cx="48" cy="57" r="3.4" />
      <circle cx="72" cy="57" r="3.4" />
      {/* A catchlight in each eye. Tiny, and it's most of what stops the face
          looking dead. */}
      <circle cx="49.2" cy="55.8" r="1.1" fill="#fff" />
      <circle cx="73.2" cy="55.8" r="1.1" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: ProfeMood }) {
  const stroke = { stroke: '#A85B4A', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' as const };
  switch (mood) {
    case 'happy':
      return <path d="M50 72c4 6 16 6 20 0" {...stroke} strokeWidth={3.5} />;
    case 'speaking':
      return <ellipse cx="60" cy="73" rx="6" ry="5" fill="#A85B4A" />;
    case 'thinking':
      // Slightly off-centre — a considering mouth, not a sad one.
      return <path d="M53 73h11" {...stroke} />;
    case 'listening':
      return <path d="M53 72c3 3 8 3 11 0" {...stroke} />;
    case 'encouraging':
      // A small, warm smile. Getting an answer wrong should be met with
      // steadiness, never with a frown or a look of disappointment.
      return <path d="M52 72c3 4 13 4 16 0" {...stroke} />;
    default:
      return <path d="M52 71c3 4 13 4 16 0" {...stroke} />;
  }
}

/**
 * Profe with a line of dialogue — the form used on the dashboard and at the
 * end of a lesson, where the character should feel like it's addressing you.
 */
export function ProfeSays({
  children,
  mood = 'idle',
  size = 64,
  className = '',
}: {
  children: React.ReactNode;
  mood?: ProfeMood;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Profe mood={mood} size={size} className="shrink-0 -mt-1" />
      <div className="relative flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-stone-100 dark:bg-stone-800 px-4 py-3">
        <p className="text-[15px] leading-snug text-ink dark:text-stone-200">{children}</p>
      </div>
    </div>
  );
}
