'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import { useRedirectIfAuthenticated } from '@/lib/hooks';
import { CourseChip } from '@/components/CourseChip';
import { endGuest } from '@/lib/guest';

export default function RegisterPage() {
  const router = useRouter();
  const { register, error, isLoading, clearError } = useAuth();
  const { isLoading: redirectLoading } = useRedirectIfAuthenticated();
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (redirectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto"></div>
          <p className="mt-4 text-stone-600 dark:text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email || !password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await register(email, password);
      endGuest();
      router.push('/onboarding');
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md p-8 surface !rounded-[28px]">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-black text-brand-600 dark:text-brand-400 mb-2">
            Start Learning Spanish
          </h1>
          <div className="flex justify-center mb-2">
            <CourseChip />
          </div>
          <p className="text-stone-600 dark:text-stone-400">Create your account</p>
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
            <p className="text-xs text-stone-500 mt-1">At least 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-stone-600 dark:text-stone-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 hover:text-brand-500 dark:text-brand-400 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
