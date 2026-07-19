import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './store';
import { isAuthenticated } from './auth';

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
