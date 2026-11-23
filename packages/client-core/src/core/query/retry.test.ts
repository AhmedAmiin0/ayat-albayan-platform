import { describe, expect, it } from 'vitest';
import { ApiError } from '../http/index.js';
import { shouldRetry, shouldRetryUnanswered } from './retry.js';

describe('shouldRetry', () => {
  it.each([401, 403, 404, 409, 422])('a %i is final', (status) => {
    expect(shouldRetry(0, new ApiError(status))).toBe(false);
  });

  it('a 5xx retries up to three times', () => {
    expect(shouldRetry(0, new ApiError(500))).toBe(true);
    expect(shouldRetry(2, new ApiError(503))).toBe(true);
    expect(shouldRetry(3, new ApiError(503))).toBe(false);
  });

  it('a request with no answer is left to the reconnect', () => {
    expect(shouldRetry(0, new TypeError('Network request failed'))).toBe(false);
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(false);
  });

  it('any other error gets the three tries', () => {
    expect(shouldRetry(0, new Error('boom'))).toBe(true);
    expect(shouldRetry(3, new Error('boom'))).toBe(false);
  });
});

describe('shouldRetryUnanswered', () => {
  it('a request with no answer gets the three tries', () => {
    expect(shouldRetryUnanswered(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(shouldRetryUnanswered(3, new TypeError('Failed to fetch'))).toBe(false);
  });

  it('a 4xx is still final and a 5xx still retries', () => {
    expect(shouldRetryUnanswered(0, new ApiError(404))).toBe(false);
    expect(shouldRetryUnanswered(2, new ApiError(503))).toBe(true);
  });
});
