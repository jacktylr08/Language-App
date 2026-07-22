'use client';

import { useEffect } from 'react';

/**
 * Next only uses this when the error happens in the root layout itself
 * (so error.tsx's own shell isn't available) — it has to render its own
 * <html>/<body> since the layout that would normally provide them is what
 * broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled root-layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>
              Your progress is saved — please try reloading.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                border: 'none',
                background: '#059669',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
