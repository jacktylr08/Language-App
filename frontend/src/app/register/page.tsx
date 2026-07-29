'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { useRedirectIfAuthenticated } from '@/lib/hooks';
import { PageSkeleton } from '@/components/Skeleton';
import { AuthScreen, Field, AuthError } from '@/components/AuthScreen';
import { endGuest, isGuest } from '@/lib/guest';
import { getActiveLanguage } from '@/lib/languages';
import { loadProgress, knownWordCount } from '@/lib/progress';

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, isLoading, clearError } = useAuth();
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (redirectLoading) return <PageSkeleton />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password) {
      setFormError('Enter an email and a password.');
      return;
    }
    if (password.length < 8) {
      setFormError('Passwords need to be at least 8 characters.');
      return;
    }

    try {
      await register(email, password);
      endGuest();
      router.push('/onboarding');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(message || 'Could not create your account. Please try again.');
    }
  };

  const message = formError || error || '';
  // Someone arriving here mid-guest-session already has something at stake;
  // the heading should acknowledge that rather than greeting them as new.
  const guest = isGuest();
  const words = guest ? knownWordCount(loadProgress()) : 0;
  const language = getActiveLanguage();

  return (
    <AuthScreen
      title={guest ? 'Save your progress' : 'Create your account'}
      subtitle={
        guest && words > 0
          ? `Keep the ${words} word${words === 1 ? '' : 's'} you've learned and carry on from any device.`
          : `Free, and it takes a moment. Then ${language.name} is yours.`
      }
      footer={
        <p className="text-center text-sm text-ink-soft dark:text-stone-400 py-2">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-brand-600 dark:text-brand-400">
            Sign in
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
          autoComplete="email"
          inputMode="email"
          enterKeyHint="next"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
        <div>
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={isLoading}
            error={!!message}
            // new-password lets the OS offer to generate and save one. A single
            // field with this hint is better practice than a confirm field,
            // which mostly just catches typing the same typo twice.
            autoComplete="new-password"
            enterKeyHint="go"
            minLength={8}
            required
          />
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-ink-soft dark:text-stone-500 mt-1.5">
              {8 - password.length} more character{8 - password.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <AuthError message={message} />

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-4 text-lg">
          {isLoading ? 'Creating your account…' : guest ? 'Save my progress' : 'Create account'}
        </button>
      </form>
    </AuthScreen>
  );
}
