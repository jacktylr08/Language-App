'use client';

import { getActiveLanguage } from '@/lib/languages';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  RealtimeSession,
  realtimeSupported,
  type RealtimeState,
} from '@/lib/realtime';
import type { TutorContext } from '@/lib/tutor-context';
import { loadTutorVoice } from '@/lib/tutor-voice';
import { Profe, type ProfeMood } from '@/components/Profe';
import { Icon } from '@/components/icons/Icon';

interface RealtimeCallProps {
  context: TutorContext | null;
  /** Called when the call ends, with the full spoken transcript. */
  onClose: (transcript: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
}

const STATE_LABEL: Record<RealtimeState, string> = {
  connecting: 'Connecting…',
  listening: 'Listening — just talk',
  user_speaking: 'Listening…',
  thinking: 'Thinking…',
  assistant_speaking: 'Profe is speaking',
  closed: 'Ended',
};

// If we've been "listening" this long with nothing transcribed, the mic is
// probably not actually picking anything up (common on mobile) — say so
// instead of leaving the learner staring at a silent orb.
const QUIET_HINT_MS = 12000;

// Grace period between "End call" and actually hanging up. OpenAI transcribes
// speech asynchronously — the input_audio_transcription.completed event for
// whatever was just said can still be in flight when the learner hits End.
// Closing immediately drops that line from the transcript before it ever
// arrives, so the tutor's memory of the call ends up missing exactly the
// thing they just said.
const END_CALL_GRACE_MS = 1200;

// Live voice minutes are genuinely expensive (real-time audio is billed per
// token in BOTH directions, and every second Profe is talking costs several
// times what a second of listening does) — a call accidentally left open
// (locked phone, backgrounded tab) could otherwise run up real cost with
// nothing to stop it. A 20-minute cap is already longer than a focused
// tutoring session needs, with a warning before it wraps up so it never
// feels like a sudden disconnect.
const MAX_CALL_MS = 20 * 60 * 1000;
const WRAP_UP_WARNING_MS = 18 * 60 * 1000;

export function RealtimeCall({ context, onClose }: RealtimeCallProps) {
  const [state, setState] = useState<RealtimeState>('connecting');
  const [assistantLine, setAssistantLine] = useState('');
  const [userLine, setUserLine] = useState('');
  const [announcedAssistant, setAnnouncedAssistant] = useState('');
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [quietHint, setQuietHint] = useState(false);
  const [ending, setEnding] = useState(false);
  const [wrapUpWarning, setWrapUpWarning] = useState(false);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const endedRef = useRef(false);

  // End the call and hand the transcript back for memory. Waits a beat first
  // so a transcription still in flight for whatever was just said has a
  // chance to land before the connection actually closes.
  const end = useRef((forceEmpty = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const finish = () => {
      const transcript = forceEmpty ? [] : sessionRef.current?.getTranscript() ?? [];
      sessionRef.current?.close();
      sessionRef.current = null;
      onClose(transcript);
    };
    if (forceEmpty) {
      finish();
    } else {
      setEnding(true);
      setTimeout(finish, END_CALL_GRACE_MS);
    }
  });

  // (Re)connect the call. Always closes any previous session first, so a
  // retry after a stuck/failed attempt can never pile a second live mic
  // stream + peer connection on top of one still mid-setup — that pile-up is
  // what made the app appear to freeze on a second tap.
  const startCall = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;

    setStarted(true);
    setError('');
    setQuietHint(false);
    setWrapUpWarning(false);
    setUserLine('');
    setAssistantLine('');

    if (!realtimeSupported()) {
      setError('unsupported');
      return;
    }

    const session = new RealtimeSession({
      onStateChange: (s) => setState(s),
      onUserTranscript: (t) => setUserLine(t),
      onAssistantDelta: (t) => setAssistantLine(t),
      onAssistantDone: (t) => {
        setAssistantLine(t);
        // Announce only the finished line — announcing every streaming
        // delta would spam a screen reader with partial fragments.
        setAnnouncedAssistant(t);
      },
      onError: (m) => setError(m),
    });
    sessionRef.current = session;

    const fetchToken = async () => {
      const c = context;
      try {
        const res = await api.post('/tutor/realtime', {
          level: c?.level,
          language: c?.languageName,
          focus: c?.focus,
          weekReached: c?.weekReached,
          knownVocab: c?.knownVocab,
          plan: c?.plan,
          pace: c?.pace,
          evaluation: c?.evaluation,
          weaknesses: c?.weaknesses,
          strengths: c?.strengths,
          profileSummary: c?.profileSummary,
          lastSessionNote: c?.lastSessionNote,
          daysSinceLastSession: c?.daysSinceLastSession,
          voice: loadTutorVoice(),
        });
        return { token: res.data.token as string, model: res.data.model as string };
      } catch (err: any) {
        if (err.response?.status === 503) setNotConfigured(true);
        throw err;
      }
    };

    session.start(fetchToken).catch((err) => {
      if (err?.response?.status === 503) setNotConfigured(true);
      else if (!endedRef.current) setError(err?.message || 'Could not start the call.');
    });
  }, [context]);

  // Clean up on unmount if the call never got an explicit End (navigated away
  // mid-call). Same grace period as an explicit End — the session object
  // itself doesn't depend on the component staying mounted, so it's safe to
  // finish capturing the transcript and close it a beat later. Only fires
  // onClose if a call had actually started (sessionRef set) — otherwise
  // React 18 StrictMode's dev-only mount→cleanup→remount cycle fires this on
  // the very first render, before "Start talking" was ever tapped, bouncing
  // straight back out of the page.
  useEffect(() => {
    return () => {
      if (!endedRef.current && sessionRef.current) {
        endedRef.current = true;
        const session = sessionRef.current;
        setTimeout(() => {
          const transcript = session?.getTranscript() ?? [];
          session?.close();
          onClose(transcript);
        }, END_CALL_GRACE_MS);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flag when "listening" has gone quiet for a while with nothing heard —
  // the clearest sign the mic isn't actually capturing on this device.
  useEffect(() => {
    setQuietHint(false);
    if (state !== 'listening') return;
    const t = setTimeout(() => setQuietHint(true), QUIET_HINT_MS);
    return () => clearTimeout(t);
  }, [state, userLine]);

  // Cap call length — a warning a couple of minutes out, then a graceful
  // wrap-up, so a call can't be left running (and racking up real cost)
  // indefinitely by accident.
  useEffect(() => {
    if (!started) return;
    const warn = setTimeout(() => setWrapUpWarning(true), WRAP_UP_WARNING_MS);
    const stop = setTimeout(() => end.current(), MAX_CALL_MS);
    return () => {
      clearTimeout(warn);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  /**
   * Hold-to-talk. The default is hands-free, which is what makes this feel
   * like a conversation — but in a café, on a train, or in a house with other
   * people in it, no detection threshold is good enough, and being cut off
   * mid-sentence by a passing bus is worse than pressing a button.
   */
  const [pushToTalk, setPushToTalk] = useState(false);
  const togglePushToTalk = () => {
    setPushToTalk((on) => {
      sessionRef.current?.setPushToTalk(!on);
      // Leaving push-to-talk shouldn't strand the mic muted.
      if (on) setMuted(false);
      return !on;
    });
  };

  const toggleMute = () => {
    setMuted((m) => {
      sessionRef.current?.setMuted(!m);
      return !m;
    });
  };

  const active = state === 'user_speaking' || state === 'listening';
  const speaking = state === 'assistant_speaking';

  /**
   * The call state, as a face. Turn-taking is the thing learners get
   * confused by on a voice call — knowing at a glance whether Profe is
   * waiting for you, working, or talking is worth more than any label.
   */
  const profeMood: ProfeMood =
    state === 'assistant_speaking'
      ? 'speaking'
      : state === 'thinking'
      ? 'thinking'
      : state === 'user_speaking'
      ? 'listening'
      : state === 'listening'
      ? 'listening'
      : 'idle';
  const hasError = !!error && error !== 'unsupported';

  // Brief transitional screen while we give a final transcription a moment
  // to land before actually hanging up (see END_CALL_GRACE_MS).
  if (ending) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
        <p className="text-ink-soft dark:text-stone-400 font-medium">Saving your progress…</p>
      </div>
    );
  }

  // Ready screen: one tap starts the conversation (and grants mic + audio).
  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950">
        <div className="shrink-0 px-4 py-4">
          <a
            href="/lessons"
            className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <Icon name="arrow-left" size={16} /> Lessons
          </a>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Profe mood="idle" size={132} className="mb-6" />
          <h1 className="font-display text-3xl font-black text-ink dark:text-white">
            {context?.evaluation ? 'Time for a little check-in' : 'Talk with Profe'}
          </h1>
          <p className="text-ink-soft dark:text-stone-400 mt-2 max-w-sm">
            {context
              ? `A live ${context.languageName} chat, just at your level — week ${context.weekReached}. Speak naturally; Profe listens and talks back.`
              : `A live ${getActiveLanguage().name} chat. Speak naturally; Profe listens and talks back.`}
          </p>
          <button
            onClick={startCall}
            className="mt-9 h-16 px-10 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-extrabold text-lg shadow-glow hover:brightness-105 transition-all inline-flex items-center gap-3"
          >
            <Icon name="mic" size={22} /> Start talking
          </button>
          <p className="text-xs text-ink-soft/70 dark:text-stone-500 mt-4">
            You’ll be asked to allow your microphone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-paper to-brand-50/40 dark:from-paper-dark dark:to-stone-950">
      {/* Top bar */}
      <div className="shrink-0 px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-soft dark:text-stone-400">
          {context?.evaluation
            ? '📋 Check-in'
            : context?.focus
            ? context.focus
            : context
            ? `Week ${context.weekReached} · ${context.level}`
            : 'Voice call'}
        </span>
        <span className="text-xs font-medium text-ink-soft/70 dark:text-stone-500">Profe · live</span>
      </div>

      {/* Center: orb + captions */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {notConfigured ? (
          <div className="max-w-sm">
            <p className="text-4xl mb-3">🔌</p>
            <p className="font-extrabold text-ink dark:text-white text-lg">Voice isn’t switched on yet</p>
            <p className="text-sm text-ink-soft dark:text-stone-400 mt-1">
              The live voice call needs the OpenAI key on the server. Once it’s set, this works instantly.
            </p>
          </div>
        ) : error === 'unsupported' ? (
          <div className="max-w-sm">
            <p className="text-4xl mb-3">🎙️</p>
            <p className="font-extrabold text-ink dark:text-white text-lg">This browser can’t do voice calls</p>
            <p className="text-sm text-ink-soft dark:text-stone-400 mt-1">
              Try Chrome, Edge or Safari — or use the text chat instead.
            </p>
          </div>
        ) : (
          <>
            {/* Animated orb */}
            <div className="relative flex items-center justify-center mb-10" aria-hidden>
              <div
                className={`absolute rounded-full bg-brand-500/20 ${
                  speaking ? 'w-56 h-56 animate-ping' : active ? 'w-48 h-48 animate-pulse' : 'w-40 h-40'
                }`}
              />
              {/* Profe himself, reacting. Seeing whether he's listening,
                  thinking or talking is most of what makes the turn-taking
                  legible — a coloured orb tells you nothing about who has
                  the floor. */}
              <div
                className={`relative w-36 h-36 rounded-full bg-gradient-to-br shadow-glow flex items-end justify-center overflow-hidden transition-all duration-300 ${
                  speaking
                    ? 'from-brand-300 to-brand-500 scale-110'
                    : active
                    ? 'from-saffron-300 to-terra-400 scale-105'
                    : 'from-stone-200 to-stone-300 dark:from-stone-700 dark:to-stone-800'
                }`}
              >
                <Profe mood={profeMood} size={132} className="translate-y-2" />
              </div>
            </div>

            <p role="status" aria-live="polite" className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-3">
              {hasError ? 'Connection trouble' : STATE_LABEL[state]}
            </p>

            {/* Live captions — the visible text streams token-by-token, which
                would spam a screen reader if announced live; a separate
                visually-hidden region announces only each finished reply. */}
            <div className="min-h-[4.5rem] max-w-lg">
              {assistantLine && (
                <p aria-hidden className="text-lg leading-relaxed text-ink dark:text-white font-medium">
                  {assistantLine}
                </p>
              )}
              {userLine && (
                <p role="status" aria-live="polite" className="text-sm text-ink-soft dark:text-stone-400 mt-3 italic">
                  “{userLine}”
                </p>
              )}
            </div>
            <p role="status" aria-live="polite" className="sr-only">
              {announcedAssistant}
            </p>

            {quietHint && !hasError && state === 'listening' && (
              <p className="mt-2 text-sm text-saffron-600 dark:text-saffron-400">
                Not hearing you — check your mic isn’t muted, or that this site has mic permission.
              </p>
            )}

            {wrapUpWarning && !hasError && (
              <p className="mt-2 text-sm text-saffron-600 dark:text-saffron-400">
                Wrapping up in a couple of minutes — that's a solid length for a session.
              </p>
            )}

            {hasError && (
              <div className="mt-4">
                <p className="text-sm text-terra-600 dark:text-terra-300">{error}</p>
                <button
                  onClick={startCall}
                  className="mt-3 h-11 px-6 rounded-full bg-brand-600 text-white font-bold shadow-card hover:brightness-105 transition-all"
                >
                  Try again
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mode switch — deliberately understated. Hands-free is the good
          experience and should stay the default; this is the escape hatch for
          a noisy room, offered rather than pushed. */}
      {!notConfigured && error !== 'unsupported' && !hasError && (
        <div className="shrink-0 text-center">
          <button
            onClick={togglePushToTalk}
            className="text-xs font-bold text-ink-soft dark:text-stone-400 underline underline-offset-4 hover:text-ink dark:hover:text-stone-200"
          >
            {pushToTalk ? 'Switch back to hands-free' : 'Somewhere noisy? Use hold-to-talk'}
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 px-6 pb-10 pt-4 flex items-center justify-center gap-6">
        {!notConfigured && error !== 'unsupported' && !hasError && !pushToTalk && (
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute your mic' : 'Mute your mic'}
            aria-label={muted ? 'Unmute your mic' : 'Mute your mic'}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-card transition-colors ${
              muted
                ? 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                : 'bg-white dark:bg-stone-800 text-ink dark:text-white'
            }`}
          >
            <Icon name="mic" size={20} className={muted ? 'opacity-40' : ''} />
          </button>
        )}
        {/* Hold-to-talk, when hands-free can't win against the room. */}
        {pushToTalk && !notConfigured && error !== 'unsupported' && !hasError && (
          <button
            onPointerDown={() => sessionRef.current?.beginUtterance()}
            onPointerUp={() => sessionRef.current?.endUtterance()}
            onPointerLeave={() => sessionRef.current?.endUtterance()}
            className="h-16 px-10 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-extrabold shadow-glow active:scale-95 transition-transform inline-flex items-center gap-2 select-none touch-none"
          >
            <Icon name="mic" size={20} /> Hold to talk
          </button>
        )}
        <button
          onClick={() => end.current()}
          className="h-14 px-8 rounded-full bg-terra-500 hover:bg-terra-600 text-white font-extrabold text-lg shadow-glow transition-colors inline-flex items-center gap-2"
        >
          <Icon name="close" size={20} />
          End call
        </button>
      </div>
    </div>
  );
}
