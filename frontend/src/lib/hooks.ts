import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './store';
import { isAuthenticated } from './auth';
import { syncOnLoad } from './sync';

export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading, hydrate } = useAuth();

  // Read auth from localStorage only after mount to avoid hydration mismatch.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated()) {
      // Pull the account's progress + tutor memory and merge it in (once).
      void syncOnLoad();
    }
  }, [isLoading, router]);

  return { user, isLoading };
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
