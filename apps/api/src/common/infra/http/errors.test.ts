import { describe, expect, it } from 'vitest';
import { errorFor } from './errors';
import type { HttpFailure } from './failure';
import { defaultOnly, fullTable } from './http.fakes';

const where = 'test GET /x';
const status = (code: number): HttpFailure => ({
  kind: 'status',
  status: code,
  body: null,
  text: '',
  retryAfter: null,
  where,
});

describe('errorFor lookup order', () => {
  it('takes the exact status first', () => {
    expect(errorFor(fullTable, status(404)).key).toBe('404');
  });

  it('falls back to the band', () => {
    expect(errorFor(fullTable, status(401)).key).toBe('4xx');
    expect(errorFor(fullTable, status(503)).key).toBe('5xx');
  });

  it('a status with no band and no entry takes default', () => {
    expect(errorFor(fullTable, status(302)).key).toBe('default');
  });

  it('other failures by their kind', () => {
    expect(errorFor(fullTable, { kind: 'timeout', where }).key).toBe('timeout');
    expect(errorFor(fullTable, { kind: 'network', reached: true, where }).key).toBe('network');
    expect(errorFor(fullTable, { kind: 'shape', status: 200, issues: [], where }).key).toBe(
      'shape',
    );
  });

  it('default when the table has nothing else', () => {
    const keys = [status(404), status(500), { kind: 'timeout', where } as const].map(
      (f) => errorFor(defaultOnly, f).key,
    );
    expect(keys).toEqual(['default', 'default', 'default']);
  });

  it('hands the failure to the entry', () => {
    const failure = status(404);
    expect(errorFor(fullTable, failure).failure).toBe(failure);
  });
});
