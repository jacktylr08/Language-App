'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  RealtimeSession,
  realtimeSupported,
  type RealtimeState,
} from '@/lib/realtime';
import type { TutorContext } from '@/lib/tutor-context';
import { loadProfile, dueWeaknessesFirst } from '@/lib/tutor-memory';

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

export function RealtimeCall({ context, onClose }: RealtimeCallProps) {
  const [state, setState] = useState<RealtimeState>('connecting');
  const [assistantLine, setAssistantLine] = useState('');
  const [userLine, setUserLine] = useState('');
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [muted, setMuted] = useState(false);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const endedRef = useRef(false);

  // End the call and hand the transcript back for memory + display.
  const end = useRef((forceEmpty = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const transcript = forceEmpty ? [] : sessionRef.current?.getTranscript() ?? [];
    sessionRef.current?.close();
    sessionRef.current = null;
    onClose(transcript);
  });

  useEffect(() => {
    if (!realtimeSupported()) {
      setError('unsupported');
      return;
    }

    const session = new RealtimeSession({
      onStateChange: (s) => setState(s),
      onUserTranscript: (t) => setUserLine(t),
      onAssistantDelta: (t) => setAssistantLine(t),
      onAssistantDone: (t) => setAssistantLine(t),
      onError: (m) => setError(m),
    });
    sessionRef.current = session;

    const fetchToken = async () => {
      const c = context;
      const profile = loadProfile();
      try {
        const res = await api.post('/tutor/realtime', {
          level: c?.level,
          focus: c?.focus,
          weekReached: c?.weekReached,
          knownVocab: c?.knownVocab,
          plan: c?.plan,
          pace: c?.pace,
          evaluation: c?.evaluation,
          weaknesses: dueWeaknessesFirst(profile),
          strengths: profile?.strengths,
          profileSummary: profile?.summary,
        });
        return { token: res.data.token as string, model: res.data.model as string };
      } catch (err: any) {
        if (err.response?.status === 503) {
          setNotConfigured(true);
        }
        throw err;
      }
    };

    session.start(fetchToken).catch((err) => {
      if (err?.response?.status === 503) setNotConfigured(true);
      else if (!endedRef.current) setError(err?.message || 'Could not start the call.');
    });

    // Clean up if the component unmounts without an explicit End.
    return () => {
      if (!endedRef.current) {
        endedRef.current = true;
        const transcript = session.getTranscript();
        session.close();
        onClose(transcript);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      sessionRef.current?.setMuted(!m);
      return !m;
    });
  };

  const active = state === 'user_speaking' || state === 'listening';
  const speaking = state === 'assistant_speaking';

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
              <div
                className={`relative w-32 h-32 rounded-full bg-gradient-to-br shadow-glow flex items-center justify-center text-5xl transition-all duration-300 ${
                  speaking
                    ? 'from-brand-400 to-brand-600 scale-110'
                    : active
                    ? 'from-terra-400 to-saffron-500 scale-105'
                    : 'from-stone-300 to-stone-400 dark:from-stone-600 dark:to-stone-700'
                }`}
              >
                🧑‍🏫
              </div>
            </div>

            <p className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400 mb-3">
              {STATE_LABEL[state]}
            </p>

            {/* Live captions */}
            <div className="min-h-[4.5rem] max-w-lg">
              {assistantLine && (
                <p className="text-lg leading-relaxed text-ink dark:text-white font-medium">
                  {assistantLine}
                </p>
              )}
              {userLine && (
                <p className="text-sm text-ink-soft dark:text-stone-400 mt-3 italic">“{userLine}”</p>
              )}
            </div>

            {error && error !== 'unsupported' && (
              <p className="mt-4 text-sm text-terra-600 dark:text-terra-300">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-6 pb-10 pt-4 flex items-center justify-center gap-6">
        {!notConfigured && error !== 'unsupported' && (
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute your mic' : 'Mute your mic'}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-card transition-colors ${
              muted
                ? 'bg-stone-200 dark:bg-stone-700 text-stone-500'
                : 'bg-white dark:bg-stone-800 text-ink dark:text-white'
            }`}
          >
            {muted ? '🔇' : '🎤'}
          </button>
        )}
        <button
          onClick={() => end.current()}
          className="h-14 px-8 rounded-full bg-terra-500 hover:bg-terra-600 text-white font-extrabold text-lg shadow-glow transition-colors inline-flex items-center gap-2"
        >
          <span className="text-xl" aria-hidden>✕</span>
          End call
        </button>
      </div>
    </div>
  );
}
