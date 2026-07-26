/**
 * Reading things off a caught error without `any`.
 *
 * Every route in this app ended up with `catch (err: any)` so it could reach
 * `err.code`, `err.message` and axios's `err.response.status` — which is why
 * the backend's lint run was full of no-explicit-any and nobody read it. The
 * helpers here narrow properly, so the same information is available and the
 * compiler still checks the shape.
 *
 * `unknown` is the correct type for a catch binding: a thrown value can be
 * anything, including a string or undefined, and these all cope with that.
 */

/** An error carrying a machine-readable `code` the routes switch on. */
export interface CodedError extends Error {
  code?: string;
}

/** Creates an Error tagged with a code, e.g. 'tutor_not_configured'. */
export function codedError(message: string, code: string): CodedError {
  const err = new Error(message) as CodedError;
  err.code = code;
  return err;
}

/** The `code` a service attached, if any. */
export function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** A safe message for logging. Never assumes the thrown value was an Error. */
export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

/**
 * The HTTP status from an axios-style error, when there is one. Used to log
 * "OpenAI said 429" without dragging axios's types through every route.
 */
export function httpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: unknown }).response;
    if (response && typeof response === 'object' && 'status' in response) {
      const status = (response as { status?: unknown }).status;
      if (typeof status === 'number') return status;
    }
  }
  return undefined;
}

/**
 * A top-level `statusCode`, as web-push attaches (404/410 mean the browser
 * has thrown the subscription away). Distinct from httpStatus above, which
 * reads axios's nested `response.status`.
 */
export function statusCode(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = (err as { statusCode?: unknown }).statusCode;
    if (typeof code === 'number') return code;
  }
  return undefined;
}

/** An upstream error body, for logs only — never returned to a client. */
export function responseBody(err: unknown): unknown {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: unknown }).response;
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: unknown }).data;
    }
  }
  return undefined;
}

/**
 * True when a failure is "this integration isn't switched on" rather than a
 * crash — the routes turn these into a 503 the UI can explain, instead of a
 * generic 500. Matches both the tagged code and the older message-sniffing
 * fallback the services have always used.
 */
export function isNotConfigured(err: unknown, code: string): boolean {
  return errorCode(err) === code || errorMessage(err, '').includes('not configured');
}
