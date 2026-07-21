'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  speak,
  stopSpeaking,
  ttsSupported,
  listenOnce,
  speechRecognitionSupported,
} from '@/lib/speech';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TutorChatProps {
  /** Optional focus (e.g. a lesson title) to steer the conversation. */
  focus?: string;
  /** Optional vocabulary the learner is working on right now. */
  vocab?: string[];
  level?: 'beginner' | 'intermediate' | 'advanced';
}

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

export function TutorChat({ focus, vocab, level = 'beginner' }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), role: 'assistant', content: GREETING },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  const canSpeak = ttsSupported();
  const canListen = speechRecognitionSupported();

  const say = useCallback((text: string) => {
    if (!voiceOnRef.current) return;
    const spoken = spanishOnly(text);
    if (spoken) speak(spoken);
  }, []);

  // Greet out loud once, after voices are ready.
  useEffect(() => {
    const t = setTimeout(() => say(GREETING), 400);
    return () => clearTimeout(t);
  }, [say]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;

      stopSpeaking();
      setError('');
      setInputValue('');

      const history = [...messages, { id: uid(), role: 'user' as const, content: text }];
      setMessages(history);
      setSending(true);

      try {
        const res = await api.post('/tutor/chat', {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          focus,
          vocab,
          level,
        });
        const reply: string = res.data.reply;
        setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply }]);
        say(reply);
      } catch (err: any) {
        if (err.response?.status === 503 || err.response?.data?.code === 'tutor_not_configured') {
          setNotConfigured(true);
        } else {
          setError(err.response?.data?.error || 'The tutor didn’t answer. Try again in a moment.');
        }
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [messages, sending, focus, vocab, level, say]
  );

  const handleMic = useCallback(async () => {
    if (listening || sending) return;
    stopSpeaking();
    setError('');
    setListening(true);
    const result = await listenOnce(9000);
    setListening(false);
    const transcript = result.transcript.split('|')[0].trim();
    if (transcript) {
      send(transcript);
    } else if (result.error === 'not-allowed') {
      setError('I couldn’t access your microphone. Check the browser’s mic permission.');
    } else if (result.error && result.error !== 'no-speech') {
      setError('I didn’t catch that — try again, or type your answer.');
    }
  }, [listening, sending, send]);

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v) stopSpeaking();
      return !v;
    });
  };

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
                {focus ? `Practising: ${focus}` : 'Your Spanish tutor'}
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
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
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
                      speak(spanishOnly(m.content));
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

      {/* Composer */}
      <div className="shrink-0 border-t border-stone-200/70 dark:border-stone-800 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            {canListen && (
              <button
                onClick={handleMic}
                disabled={sending}
                title="Speak your answer in Spanish"
                aria-label="Speak your answer"
                className={`shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition-all disabled:opacity-40 ${
                  listening
                    ? 'bg-terra-500 text-white scale-110 shadow-glow animate-pulse'
                    : 'bg-stone-100 dark:bg-stone-800 text-ink-soft dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                🎤
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
                  send(inputValue);
                }
              }}
              disabled={sending}
              placeholder={listening ? 'Escuchando… (Listening…)' : 'Type in Spanish or English…'}
              className="flex-1 px-4 py-2.5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all disabled:opacity-50"
            />
            <button
              onClick={() => send(inputValue)}
              disabled={!inputValue.trim() || sending}
              className="btn-primary shrink-0 h-11 px-5 rounded-2xl"
            >
              Send
            </button>
          </div>
          <p className="text-[11px] text-ink-soft dark:text-stone-500 mt-2 text-center">
            {canListen
              ? '🎤 Tap the mic to speak, or just type. Profe replies out loud.'
              : 'Tip: reply in Spanish when you can — Profe will help you along.'}
          </p>
        </div>
      </div>
    </div>
  );
}
