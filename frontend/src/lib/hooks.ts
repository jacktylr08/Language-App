import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './store';
import { isAuthenticated } from './auth';
import { getSyncStatus, startSyncLifecycle, syncOnLoad, SYNC_EVENT } from './sync';

/**
 * Auth gate + the account's server-side state.
 *
 * `isLoading` deliberately stays true until the state pull has finished (or
 * failed). Progress lives in the database; localStorage is only a cache of
 * it. Rendering straight from that cache meant a device that didn't have one
 * yet — a new phone, or the same browser after signing out — painted a full
 * "0 lessons, no streak" dashboard before the real data arrived, which reads
 * as deleted progress rather than as loading.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading, hydrate } = useAuth();
  const [stateLoaded, setStateLoaded] = useState(false);

  // Read auth from localStorage only after mount to avoid hydration mismatch.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Flush pending progress if the tab is closed or backgrounded.
  useEffect(() => startSyncLifecycle(), []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    // Resolves once the account's real state is in place. A failure still
    // resolves — we fall back to the local cache rather than blocking the
    // app when the network is down.
    void syncOnLoad().finally(() => {
      if (!cancelled) setStateLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoading, router]);

  return {
    user,
    isLoading: isLoading || (isAuthenticated() && !stateLoaded),
    /** 'error' means we're showing cached local data, not confirmed server state. */
    syncStatus: getSyncStatus(),
  };
}

/**
 * Re-renders whenever synced state lands, so a view reading progress picks up
 * the server's copy instead of whatever localStorage happened to hold at mount.
 */
export function useSyncedState(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onSync = () => setTick((t) => t + 1);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);
  return tick;
}

export function useRedirectIfAuthenticated(redirectTo = '/lessons') {
  const router = useRouter();
  const { user, isLoading, hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated() && user) {
      router.push(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  return { isLoading };
}
