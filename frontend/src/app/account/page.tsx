'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth, useSyncedState } from '@/lib/hooks';
import { api } from '@/lib/api';
import { getAuth, clearAuth } from '@/lib/auth';
import { clearLocalLearnerState, flushSync } from '@/lib/sync';
import { TutorProfilePanel } from '@/components/TutorProfilePanel';
import { CourseChip } from '@/components/CourseChip';
import {
  loadProgress,
  currentStreak,
  knownWordCount,
  masteredWordCount,
  ProgressState,
} from '@/lib/progress';
import { getCurriculum } from '@/lib/curriculum';
import { pushSupported, getExistingSubscription, enablePushReminders, disablePushReminders } from '@/lib/push';
import { TUTOR_VOICES, loadTutorVoice, saveTutorVoice } from '@/lib/tutor-voice';
import { FeedbackToggles } from '@/components/FeedbackToggles';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsSkeleton } from '@/components/Skeleton';
import { ShareProgressButton } from '@/components/ShareProgressButton';

interface Profile {
  email: string;
  created_at?: string;
  current_level?: number;
}

export default function AccountPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // Practice reminders (push notifications)
  const [remindersOn, setRemindersOn] = useState(false);
  const [remindersBusy, setRemindersBusy] = useState(false);
  const [remindersError, setRemindersError] = useState('');
  const [remindersChecked, setRemindersChecked] = useState(false);

  // Profe's voice
  const [tutorVoice, setTutorVoice] = useState('cedar');

  // Sign out (async — flushes pending progress first)
  const [signingOut, setSigningOut] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const syncTick = useSyncedState();
  useEffect(() => {
    setProgress(loadProgress());
    setTutorVoice(loadTutorVoice());
    if (pushSupported()) {
      getExistingSubscription()
        .then((sub) => setRemindersOn(!!sub))
        .finally(() => setRemindersChecked(true));
    } else {
      setRemindersChecked(true);
    }
    // Seed from the locally stored session immediately…
    const stored = getAuth();
    if (stored?.user?.email) {
      setProfile({ email: stored.user.email, current_level: stored.user.currentLevel });
    }
    // …then enrich from the API (member-since date, etc.)
    api
      .get('/auth/me')
      .then((res) => setProfile(res.data))
      .catch(() => {
        /* keep the locally-seeded profile if the call fails */
      });
    // syncTick: re-read once the account's server-side state has landed.
  }, [syncTick]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('The two new passwords don’t match.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/auth/change-password', {
        // current password is optional — sent only if provided
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.error || 'Could not change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    // Push anything still sitting in the sync debounce BEFORE wiping local
    // state — otherwise finishing a lesson and immediately signing out
    // destroys it. Progress lives on the server, so signing out is safe:
    // signing back in anywhere pulls it all down again.
    setSigningOut(true);
    try {
      await flushSync();
    } catch {
      /* best effort — never trap someone in the app because the network is down */
    }
    // Not just the auth token — every bit of this account's local learner
    // state, so a different account signing in on this same device next
    // never gets its progress silently merged with what's left behind here.
    clearAuth();
    clearLocalLearnerState();
    router.push('/login');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.');
      return;
    }
    try {
      setDeleting(true);
      await api.delete('/auth/account', { data: { password: deletePassword } });
      // The account (and every bit of local learner state for it) is gone —
      // same cleanup as signing out, then off the app entirely rather than
      // back to a login screen for an account that no longer exists.
      clearAuth();
      clearLocalLearnerState();
      router.push('/');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Could not delete your account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectVoice = (id: string) => {
    setTutorVoice(id);
    saveTutorVoice(id);
  };

  const handleToggleReminders = async () => {
    setRemindersError('');
    setRemindersBusy(true);
    try {
      if (remindersOn) {
        await disablePushReminders();
        setRemindersOn(false);
      } else {
        await enablePushReminders();
        setRemindersOn(true);
      }
    } catch (err: any) {
      setRemindersError(
        err?.response?.data?.code === 'push_not_configured'
          ? "Reminders aren't switched on for this app yet."
          : err?.message || 'Could not update your reminder setting.'
      );
    } finally {
      setRemindersBusy(false);
    }
  };

  if (authLoading) {
    return (
      <SettingsSkeleton />
    );
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const lessonsDone = progress
    ? getCurriculum().filter((l) => progress.lessons[l.slug]?.completed).length
    : 0;
  const streak = progress ? currentStreak(progress) : 0;
  const known = progress ? knownWordCount(progress) : 0;
  const mastered = progress ? masteredWordCount(progress) : 0;
  const initial = (profile?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <nav className="sticky top-0 z-20 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link
            href="/lessons"
            className="text-ink-soft dark:text-stone-300 hover:text-ink dark:hover:text-white font-semibold text-sm inline-flex items-center gap-1.5"
          >
            <span aria-hidden>←</span> Back to lessons
          </Link>
          <div className="flex items-center gap-2.5">
            <Link href="/" className="font-display text-xl font-black text-brand-600 dark:text-brand-400">
              Fluenta
            </Link>
            <CourseChip />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 lg:px-6 pt-8">
        <header className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-2">
            Your account
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-black text-ink dark:text-white leading-[1.05]">
            Account & settings
          </h1>
        </header>

        {/* Profile card */}
        <section className="surface p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center font-display text-3xl font-black text-white shadow-inner ring-1 ring-black/5">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-ink dark:text-white text-lg truncate">
                {profile?.email || '…'}
              </p>
              {memberSince && (
                <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
                  Learning Spanish since {memberSince}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-6 border-t border-stone-100 dark:border-stone-800 text-center">
            <div>
              <p className="font-display text-2xl font-black text-terra-500">{streak}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
                🔥 streak
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-brand-600 dark:text-brand-400">
                {lessonsDone}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
                lessons
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-sky-500">{known}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
                words
              </p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-saffron-500">{mastered}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft dark:text-stone-400 mt-0.5">
                ✨ mastered
              </p>
            </div>
          </div>
        </section>

        {/* What Profe knows about this learner — the personalisation, made visible */}
        <TutorProfilePanel />

        {/* Profe's voice */}
        <section className="surface p-6 mb-6">
          <h2 className="font-extrabold text-ink dark:text-white">🧑‍🏫 Profe's voice</h2>
          <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5 mb-4">
            Pick the voice Profe uses on your next live call.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TUTOR_VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVoice(v.id)}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  tutorVoice === v.id
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-stone-200 dark:border-stone-700 hover:border-brand-300'
                }`}
              >
                <p className="font-bold text-sm text-ink dark:text-white">{v.label}</p>
                <p className="text-xs text-ink-soft dark:text-stone-400 mt-0.5">{v.vibe}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Practice reminders */}
        {remindersChecked && pushSupported() && (
          <section className="surface p-6 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-extrabold text-ink dark:text-white">🔔 Practice reminders</h2>
                <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
                  A gentle nudge if you're about to lose your streak.
                </p>
              </div>
              <button
                onClick={handleToggleReminders}
                disabled={remindersBusy}
                role="switch"
                aria-checked={remindersOn}
                className={`shrink-0 w-14 h-8 rounded-full relative transition-colors ${
                  remindersOn ? 'bg-brand-600' : 'bg-stone-300 dark:bg-stone-700'
                } ${remindersBusy ? 'opacity-60' : ''}`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                    remindersOn ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {remindersError && (
              <p className="text-sm text-terra-600 dark:text-terra-300 mt-3">{remindersError}</p>
            )}
          </section>
        )}

        {/* Theme */}
        <section className="surface p-6 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="font-extrabold text-ink dark:text-white">Appearance</h2>
              <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
                Auto follows your device's setting.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Something worth showing someone. */}
        <section className="surface p-6 mb-6">
          <h2 className="font-display text-2xl font-black text-ink dark:text-white">
            Show off a bit
          </h2>
          <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 mb-4">
            A card with your streak and word count, to send to whoever needs to know.
          </p>
          <ShareProgressButton
            stats={{
              streak: currentStreak(loadProgress()),
              wordsKnown: knownWordCount(loadProgress()),
              lessonsDone: Object.values(loadProgress().lessons).filter((l) => l.completed).length,
              totalLessons: getCurriculum().length,
            }}
            className="btn-primary px-5 py-2.5 text-sm"
          />
        </section>

        {/* Sound & haptics — the first thing anyone reaches for on a train */}
        <section className="surface p-6 mb-6">
          <h2 className="font-display text-2xl font-black text-ink dark:text-white mb-4">
            Sound &amp; feel
          </h2>
          <FeedbackToggles />
        </section>

        {/* Change password */}
        <section className="surface p-6 mb-6">
          <h2 className="font-display text-2xl font-black text-ink dark:text-white">
            Change your password
          </h2>
          <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 mb-5">
            Forgotten your password? Since you’re signed in, just set a new one below — you don’t
            need the old one.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwError && (
              <div className="rounded-xl bg-terra-500/10 border border-terra-400/30 px-4 py-3 text-sm font-medium text-terra-600 dark:text-terra-300">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-xl bg-brand-500/10 border border-brand-400/30 px-4 py-3 text-sm font-medium text-brand-700 dark:text-brand-300">
                ✓ Password updated. Use your new password next time you sign in.
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-ink dark:text-stone-200 mb-1.5">
                Current password{' '}
                <span className="font-normal text-ink-soft dark:text-stone-500">
                  (optional — leave blank if you’ve forgotten it)
                </span>
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink dark:text-stone-200 mb-1.5">
                New password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink dark:text-stone-200 mb-1.5">
                Confirm new password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Type it again"
                className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 transition-all"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-stone-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="w-4 h-4 accent-brand-600 rounded"
              />
              Show passwords
            </label>

            <button
              type="submit"
              disabled={saving || !newPassword || !confirmPassword}
              className="btn-primary w-full py-3.5"
            >
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </section>

        {/* Sign out */}
        <section className="surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-ink dark:text-white">Sign out</h2>
              <p className="text-sm text-ink-soft dark:text-stone-400 mt-0.5">
                You’ll need your email and password to sign back in.
              </p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="btn-3d shrink-0 px-5 py-2.5 rounded-2xl border-2 border-stone-200 dark:border-stone-700 font-extrabold text-ink-soft dark:text-stone-300 hover:border-terra-400 hover:text-terra-500 transition-colors disabled:opacity-60"
            >
              {signingOut ? 'Saving…' : 'Sign out'}
            </button>
          </div>
        </section>

        {/* Delete account */}
        <section className="surface !border-terra-300/60 dark:!border-terra-700/50 p-6 mt-6">
          <h2 className="font-display text-2xl font-black text-terra-600 dark:text-terra-400">
            Delete account
          </h2>
          <p className="text-sm text-ink-soft dark:text-stone-400 mt-1 mb-5">
            Permanently deletes your account and everything tied to it — progress, streak, and
            what Profe knows about you. This can&apos;t be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-3d px-5 py-2.5 rounded-2xl border-2 border-terra-300 dark:border-terra-700 font-extrabold text-terra-600 dark:text-terra-400 hover:bg-terra-500/10 transition-colors"
            >
              Delete my account
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {deleteError && (
                <div className="rounded-xl bg-terra-500/10 border border-terra-400/30 px-4 py-3 text-sm font-medium text-terra-600 dark:text-terra-300">
                  {deleteError}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-ink dark:text-stone-200 mb-1.5">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-700 bg-white dark:bg-paper-dark text-ink dark:text-white focus:border-terra-500 focus:outline-none focus:ring-4 focus:ring-terra-500/15 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                  className="btn-3d flex-1 py-3 rounded-2xl border-2 border-stone-200 dark:border-stone-700 font-extrabold text-ink-soft dark:text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !deletePassword}
                  className="btn-danger flex-1 py-3"
                >
                  {deleting ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
