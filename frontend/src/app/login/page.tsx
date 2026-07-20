'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { useRedirectIfAuthenticated } from '@/lib/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { login, error, isLoading, clearError } = useAuth();
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (redirectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      router.push('/onboarding');
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 surface !rounded-[28px]">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-black text-brand-600 dark:text-brand-400 mb-2">
            Aprende Español
          </h1>
          <p className="text-stone-600 dark:text-stone-400">Learn Spanish the right way</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(formError || error) && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded text-sm">
              {formError || error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <details className="mt-5 text-sm">
          <summary className="text-center text-ink-soft dark:text-stone-400 cursor-pointer hover:text-ink dark:hover:text-stone-200 select-none">
            Forgotten your password?
          </summary>
          <p className="mt-3 rounded-xl bg-saffron-400/10 border border-saffron-400/25 px-4 py-3 text-ink-soft dark:text-stone-300 leading-relaxed">
            If you’re still signed in on any device or browser tab, open{' '}
            <span className="font-semibold text-ink dark:text-white">Account &amp; settings</span> and
            set a new password there — you won’t need the old one. It’ll apply here straight away.
          </p>
        </details>

        <div className="mt-6 text-center">
          <p className="text-stone-600 dark:text-stone-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-600 hover:text-brand-500 dark:text-brand-400 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
