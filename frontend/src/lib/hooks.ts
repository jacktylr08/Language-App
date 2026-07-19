import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './store';
import { isAuthenticated } from './auth';

export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated()) {
      router.push('/login');
    }
  }, [isLoading, router]);

  return { user, isLoading };
}

export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated() && user) {
      router.push(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  return { isLoading };
}
