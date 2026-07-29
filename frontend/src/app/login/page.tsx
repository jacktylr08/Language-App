'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { useRedirectIfAuthenticated } from '@/lib/hooks';
import { PageSkeleton } from '@/components/Skeleton';
import { AuthScreen, Field, AuthError } from '@/components/AuthScreen';
import { endGuest } from '@/lib/guest';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, isLoading, clearError } = useAuth();
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  if (redirectLoading) return <PageSkeleton />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password) {
      setFormError('Enter your email and password.');
      return;
    }

    try {
      await login(email, password);
      // Returning users go straight to their lessons. Onboarding is only for
      // brand-new accounts (see the register flow) — logging in should never
      // re-ask the introductory questions.
      endGuest();
      router.push('/lessons');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(message || 'Could not sign you in. Please try again.');
    }
  };

  const message = formError || error || '';

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Pick up exactly where you left off."
      footer={
        <p className="text-center text-sm text-ink-soft dark:text-stone-400 py-2">
          New here?{' '}
          <Link href="/register" className="font-bold text-brand-600 dark:text-brand-400">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          error={!!message}
          // The attributes that make a saved password actually get offered,
          // and the keyboard's action key say something useful.
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          error={!!message}
          autoComplete="current-password"
          enterKeyHint="go"
          required
        />

        <AuthError message={message} />

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-4 text-lg">
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="w-full text-center text-sm font-semibold text-ink-soft dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 py-1"
        >
          Forgotten your password?
        </button>
        {showHelp && (
          <p className="rounded-2xl bg-saffron-400/10 border border-saffron-400/25 px-4 py-3 text-sm text-ink-soft dark:text-stone-300 leading-relaxed">
            If you&apos;re still signed in on any other device or tab, open{' '}
            <span className="font-semibold text-ink dark:text-white">Account &amp; settings</span>{' '}
            there and set a new password — you won&apos;t need the old one, and it applies here
            straight away.
          </p>
        )}
      </form>
    </AuthScreen>
  );
}
