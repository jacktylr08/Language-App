'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { LiveMic, speechRecognitionSupported } from '@/lib/speech';
import { speakText, stopSpeaking, voiceSupported } from '@/lib/tts';
import { buildTutorContext, type TutorContext } from '@/lib/tutor-context';
import { loadProfile, reflectAndSave } from '@/lib/tutor-memory';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatProps {
  /** Optional lesson slug to focus the session on. */
  focusSlug?: string;
}

type Phase = 'listening' | 'thinking' | 'speaking';

const uid = () => Math.random().toString(36).slice(2);

/** Spoken aloud, we want only the Spanish — drop the "(English)" glosses. */
function spanishOnly(text: string): string {
  return text
    .replace(/\([^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const GREETING =
  '¡Hola! Soy tu profe de español. (Hi! I\'m your Spanish teacher.) ¿Cómo te llamas? (What\'s your name?)';

export function TutorChat({ focusSlug }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), role: 'assistant', content: GREETING },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [phase, setPhase] = useState<Phase>('listening');
  const [interim, setInterim] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);
  const [ctx, setCtx] = useState<TutorContext | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refs mirror state for use inside async callbacks and the mic controller.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const ctxRef = useRef<TutorContext | null>(null);
  const liveRef = useRef(false);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;
  const micRef = useRef<LiveMic | null>(null);
  // Increments each turn; a stale speak/onEnd callback checks this to avoid
  // reopening the mic after the turn was superseded or interrupted.
  const genRef = useRef(0);

  const canListen = speechRecognitionSupported();
  const canSpeak = voiceSupported();

  // Build the level/known-vocab context from the learner's progress on mount.
  useEffect(() => {
    const c = buildTutorContext(focusSlug);
    setCtx(c);
    ctxRef.current = c;
  }, [focusSlug]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, interim]);

  const pushAssistant = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content }]);
  }, []);

  /** Ask the tutor, passing level scope + remembered strengths/weaknesses. */
  const askTutor = useCallback(async (userText: string): Promise<string> => {
    const history = [
      ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userText },
    ];
    const c = ctxRef.current;
    const profile = loadProfile();
    const res = await api.post('/tutor/chat', {
      messages: history,
      level: c?.level,
      focus: c?.focus,
      vocab: c?.vocab,
      weekReached: c?.weekReached,
      knownVocab: c?.knownVocab,
      strengths: profile?.strengths,
      weaknesses: profile?.weaknesses,
      profileSummary: profile?.summary,
    });
    return res.data.reply as string;
  }, []);

  const speakReply = useCallback(
    (text: string, gen: number) => {
      if (!voiceOnRef.current) {
        // Voice muted: in live mode, jump straight back to listening.
        if (gen === genRef.current && liveRef.current) {
          setPhase('listening');
          micRef.current?.resume();
        }
        return;
      }
      setPhase('speaking');
      speakText(spanishOnly(text), {
        onEnd: () => {
          if (gen === genRef.current && liveRef.current) {
            setPhase('listening');
            micRef.current?.resume();
          }
        },
      });
    },
    []
  );

  /** One conversational turn: learner said `text`, Profe replies (and speaks). */
  const takeTurn = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      const gen = ++genRef.current;
      micRef.current?.pause();
      stopSpeaking();
      setInterim('');
      setError('');
      setInputValue('');
      setMessages((prev) => [...prev, { id: uid(), role: 'user', content: text }]);
      setSending(true);
      if (liveRef.current) setPhase('thinking');

      try {
        const reply = await askTutor(text);
        setSending(false);
        if (gen !== genRef.current) return; // superseded (interrupted / ended)
        pushAssistant(reply);
        if (liveRef.current) {
          speakReply(reply, gen);
        } else if (voiceOnRef.current) {
          speakText(spanishOnly(reply));
        }
      } catch (err: any) {
        setSending(false);
        if (err.response?.status === 503 || err.response?.data?.code === 'tutor_not_configured') {
          setNotConfigured(true);
        } else {
          setError(err.response?.data?.error || 'The tutor didn’t answer. Try again in a moment.');
        }
        // In live mode, keep the conversation going despite the hiccup.
        if (gen === genRef.current && liveRef.current) {
          setPhase('listening');
          micRef.current?.resume();
        }
      } finally {
        if (!liveRef.current) inputRef.current?.focus();
      }
    },
    [askTutor, pushAssistant, speakReply]
  );

  const takeTurnRef = useRef(takeTurn);
  takeTurnRef.current = takeTurn;

  // ---- Live session controls ----

  const startLive = useCallback(() => {
    if (!canListen) return;
    setError('');
    liveRef.current = true;
    setLive(true);

    const mic = new LiveMic(
      {
        onFinal: (t) => takeTurnRef.current(t),
        onInterim: (t) => setInterim(t),
        onError: (e) => {
          if (e === 'not-allowed' || e === 'service-not-allowed') {
            setError('I couldn’t access your microphone. Check the browser’s mic permission.');
            liveRef.current = false;
            setLive(false);
          }
        },
      },
      1300
    );
    micRef.current = mic;

    const hasUserTurn = messagesRef.current.some((m) => m.role === 'user');
    if (!hasUserTurn && voiceOnRef.current) {
      // Greet out loud, then start listening.
      const gen = ++genRef.current;
      setPhase('speaking');
      speakText(spanishOnly(GREETING), {
        onEnd: () => {
          if (gen === genRef.current && liveRef.current) {
            setPhase('listening');
            mic.start();
          }
        },
      });
    } else {
      setPhase('listening');
      mic.start();
    }
  }, [canListen]);

  const endLive = useCallback(() => {
    genRef.current++;
    liveRef.current = false;
    micRef.current?.stop();
    micRef.current = null;
    stopSpeaking();
    setLive(false);
    setInterim('');
    // Distil what happened into the learner's memory for next time.
    void reflectAndSave(messagesRef.current.map((m) => ({ role: m.role, content: m.content })));
  }, []);

  /** Stop the tutor mid-sentence and hand the turn back to the learner. */
  const interrupt = useCallback(() => {
    genRef.current++;
    stopSpeaking();
    if (liveRef.current) {
      setPhase('listening');
      micRef.current?.resume();
    }
  }, []);

  // Clean up the mic on unmount, and reflect if we were mid-session.
  useEffect(() => {
    return () => {
      if (liveRef.current) {
        liveRef.current = false;
        micRef.current?.stop();
        micRef.current = null;
        stopSpeaking();
        void reflectAndSave(
          messagesRef.current.map((m) => ({ role: m.role, content: m.content }))
        );
      }
    };
  }, []);

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  };

  const levelLabel = ctx
    ? `Week ${ctx.weekReached} · ${ctx.level}`
    : 'Your Spanish tutor';

  return (
    <div className="flex flex-col h-[100dvh] bg-paper dark:bg-paper-dark">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <a
            href="/lessons"
            className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Lessons
          </a>
          <div className="flex items-center gap-2.5 mx-auto">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg shadow-inner ring-1 ring-black/5">
              🧑‍🏫
            </div>
            <div className="leading-tight">
              <p className="font-extrabold text-ink dark:text-white text-sm">Profe</p>
              <p className="text-[11px] text-ink-soft dark:text-stone-400">
                {ctx?.focus ? `${ctx.focus}` : levelLabel}
              </p>
            </div>
          </div>
          {canSpeak && (
            <button
              onClick={toggleVoice}
              title={voiceOn ? 'Voice on — tap to mute' : 'Voice off — tap to unmute'}
              aria-label={voiceOn ? 'Mute tutor voice' : 'Unmute tutor voice'}
              className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                voiceOn
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-400'
              }`}
            >
              {voiceOn ? '🔊' : '🔇'}
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {notConfigured && (
            <div className="surface p-5 text-center">
              <p className="text-3xl mb-2">🔌</p>
              <p className="font-extrabold text-ink dark:text-white">Tutor isn’t switched on yet</p>
              <p className="text-sm text-ink-soft dark:text-stone-400 mt-1">
                The live AI tutor needs an API key added to the server. Once it’s in, this page
                comes alive — no code changes needed.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-white dark:bg-paper-dark-soft text-ink dark:text-stone-100 border border-stone-200/70 dark:border-stone-700/70 rounded-bl-md shadow-card'
                }`}
              >
                {m.role === 'assistant' && canSpeak ? (
                  <button
                    onClick={() => {
                      stopSpeaking();
                      speakText(spanishOnly(m.content));
                    }}
                    title="Play again"
                    className="float-right ml-2 -mr-1 -mt-0.5 text-ink-soft/70 hover:text-brand-500 text-sm"
                    aria-label="Play this message again"
                  >
                    🔊
                  </button>
                ) : null}
                {m.content}
              </div>
            </div>
          ))}

          {/* Live interim transcript */}
          {live && interim && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md text-[15px] leading-relaxed bg-brand-600/40 text-white italic">
                {interim}…
              </div>
            </div>
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-paper-dark-soft border border-stone-200/70 dark:border-stone-700/70 px-4 py-3 rounded-2xl rounded-bl-md shadow-card">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-terra-500/10 border border-terra-400/30 px-4 py-2.5 text-sm font-medium text-terra-600 dark:text-terra-300">
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Composer / live controls */}
      <div className="shrink-0 border-t border-stone-200/70 dark:border-stone-800 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {live ? (
            <LiveBar phase={phase} onInterrupt={interrupt} onEnd={endLive} />
          ) : (
            <>
              <div className="flex items-end gap-2">
                {canListen && (
                  <button
                    onClick={startLive}
                    title="Start a hands-free voice conversation"
                    aria-label="Start talking"
                    className="shrink-0 flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-gradient-to-br from-terra-500 to-saffron-500 text-white font-bold shadow-glow hover:brightness-105 transition-all"
                  >
                    🎙️ <span className="hidden sm:inline">Talk</span>
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      takeTurn(inputValue);
                    }
                  }}
                  disabled={sending}
                  placeholder="Type in Spanish or English…"
                  className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all disabled:opacity-50"
                />
                <button
                  onClick={() => takeTurn(inputValue)}
                  disabled={!inputValue.trim() || sending}
                  className="btn-primary shrink-0 h-11 px-5 rounded-2xl"
                >
                  Send
                </button>
              </div>
              <p className="text-[11px] text-ink-soft dark:text-stone-500 mt-2 text-center">
                {canListen
                  ? '🎙️ Tap Talk for a hands-free, flowing conversation — or just type.'
                  : 'Tip: reply in Spanish when you can — Profe will help you along.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The bottom bar shown during a live voice conversation. */
function LiveBar({
  phase,
  onInterrupt,
  onEnd,
}: {
  phase: Phase;
  onInterrupt: () => void;
  onEnd: () => void;
}) {
  const label =
    phase === 'listening' ? 'Listening…' : phase === 'thinking' ? 'Thinking…' : 'Profe is speaking';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onEnd}
        className="shrink-0 h-11 px-4 rounded-full border-2 border-stone-200 dark:border-stone-700 text-ink-soft dark:text-stone-300 font-bold hover:border-terra-400 hover:text-terra-500 transition-colors"
      >
        End
      </button>

      <div className="flex-1 flex items-center justify-center gap-3">
        <Orb phase={phase} />
        <span className="text-sm font-semibold text-ink-soft dark:text-stone-300">{label}</span>
      </div>

      <button
        onClick={onInterrupt}
        disabled={phase !== 'speaking'}
        title="Interrupt and take your turn"
        className="shrink-0 h-11 px-4 rounded-full bg-brand-600 text-white font-bold disabled:opacity-30 hover:brightness-105 transition-all"
      >
        My turn
      </button>
    </div>
  );
}

/** A small animated status orb reflecting the live phase. */
function Orb({ phase }: { phase: Phase }) {
  if (phase === 'thinking') {
    return (
      <span className="flex gap-1" aria-hidden>
        <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" />
        <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.3s]" />
      </span>
    );
  }
  const color =
    phase === 'listening'
      ? 'from-terra-400 to-saffron-500'
      : 'from-brand-400 to-brand-600';
  return (
    <span
      aria-hidden
      className={`relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br ${color}`}
    >
      <span
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${color} opacity-60 animate-ping`}
      />
    </span>
  );
}
