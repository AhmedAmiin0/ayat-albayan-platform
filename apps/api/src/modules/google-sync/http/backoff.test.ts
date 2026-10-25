import { describe, expect, it } from 'vitest';
import { classify, errorText, MAX_ATTEMPTS, retryDelayMs } from './backoff';
import { GoogleApiError } from '../google-client.port';

describe('retry policy', () => {
  it('backs off exponentially with jitter, capped', () => {
    expect(retryDelayMs(1, () => 0.5)).toBe(30_000);
    expect(retryDelayMs(2, () => 0.5)).toBe(60_000);
    expect(retryDelayMs(3, () => 0)).toBe(60_000);
    expect(retryDelayMs(20, () => 0.5)).toBe(30 * 60_000);
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it('retries 429 / 5xx / rate limits / network errors; invalid_grant is auth; other 401s are config; other 4xx are fatal', () => {
    expect(classify(new GoogleApiError(429, 'rateLimitExceeded'))).toBe('retry');
    expect(classify(new GoogleApiError(503, 'backendError'))).toBe('retry');
    expect(classify(new GoogleApiError(403, 'userRateLimitExceeded'))).toBe('retry');
    expect(classify(new Error('fetch failed'))).toBe('retry');
    expect(classify(new GoogleApiError(400, 'invalid_grant'))).toBe('auth');
    expect(classify(new GoogleApiError(401, 'authError'))).toBe('config');
    // A wrong client secret must never wipe a good refresh token.
    expect(classify(new GoogleApiError(401, 'invalid_client'))).toBe('config');
    expect(classify(new GoogleApiError(400, 'unauthorized_client'))).toBe('config');
    expect(classify(new GoogleApiError(403, 'forbidden'))).toBe('fatal');
    expect(classify(new GoogleApiError(400, 'badRequest'))).toBe('fatal');
  });

  it('never logs a token', () => {
    expect(errorText(new Error('bad ya29.a0AfH6SMBxyz token'))).toBe('bad [redacted] token');
    expect(errorText(new Error('refresh 1//0gAbc-def failed'))).toBe('refresh [redacted] failed');
    expect(errorText(new GoogleApiError(404, 'notFound'))).toBe('404 notFound');
    expect(errorText('x'.repeat(900))).toHaveLength(500);
  });
});
