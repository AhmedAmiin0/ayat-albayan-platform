import { describe, expect, it } from 'vitest';
import { DbTimeoutError, isDbTimeout } from './db-timeout';

describe('DbTimeoutError', () => {
  it('the typed error reads as an abort (postgrest never retries it) and names the timeout', () => {
    const e = new DbTimeoutError(15_000);
    expect(e.name).toBe('DbTimeoutError');
    expect(e.code).toBe('ABORT_ERR');
    expect(e.message).toContain('15000 ms');
  });

});

describe('isDbTimeout (the error as the repos see it)', () => {
  it('the error itself, or a repo error built from postgrest’s «DbTimeoutError: …» message', () => {
    expect(isDbTimeout(new DbTimeoutError(1))).toBe(true);
    expect(isDbTimeout(new Error('DbTimeoutError: database call timed out after 1 ms'))).toBe(true);
    expect(isDbTimeout({ message: 'DbTimeoutError: database call timed out after 1 ms' })).toBe(true);
    expect(isDbTimeout(new Error('duplicate key'))).toBe(false);
    expect(isDbTimeout('DbTimeoutError')).toBe(false);
    expect(isDbTimeout(null)).toBe(false);
  });
});
