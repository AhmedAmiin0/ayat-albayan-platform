import { describe, expect, it } from 'vitest';
import { errorFor } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import { GoogleApiError } from '@/modules/platform/google-sync/google-client.port';
import { Gone, GOOGLE_ERRORS, LOOKUP_ERRORS, reasonOf, toGoogleError } from '@/modules/platform/google-sync/http/google-error';

const where = 'google GET /x';
const status = (code: number, body: unknown): HttpFailure =>
  ({ kind: 'status', status: code, body, text: '', retryAfter: null, where });

describe('reasonOf', () => {
  it('reads the API reason, then the status, then the OAuth string', () => {
    expect(reasonOf({ error: { errors: [{ reason: 'notFound' }], status: 'NOT_FOUND' } })).toBe(
      'notFound',
    );
    expect(reasonOf({ error: { errors: [], status: 'PERMISSION_DENIED' } })).toBe(
      'PERMISSION_DENIED',
    );
    expect(reasonOf({ error: 'invalid_grant', error_description: 'x' })).toBe('invalid_grant');
  });

  it('anything else is «error»', () => {
    expect(reasonOf({ error: {} })).toBe('error');
    expect(reasonOf({ error: 7 })).toBe('error');
    expect(reasonOf('<html>')).toBe('error');
    expect(reasonOf(null)).toBe('error');
  });
});

describe('toGoogleError', () => {
  it('keeps a GoogleApiError as is', () => {
    const e = new GoogleApiError(429, 'rateLimitExceeded');
    expect(toGoogleError(e)).toBe(e);
  });

  it('reads a gaxios answer: its status and body', () => {
    const thrown = Object.assign(new Error('400'), {
      response: { status: 400, data: { error: 'invalid_grant' } },
    });
    expect(toGoogleError(thrown)).toEqual(new GoogleApiError(400, 'invalid_grant'));
    expect(toGoogleError({ status: 403, response: { data: null } })).toEqual(
      new GoogleApiError(403, 'error'),
    );
  });

  it('no answer: invalid_grant from the message, else 0 network', () => {
    expect(toGoogleError(new Error('invalid_grant: revoked'))).toEqual(
      new GoogleApiError(0, 'invalid_grant'),
    );
    expect(toGoogleError(new TypeError('fetch failed'))).toEqual(new GoogleApiError(0, 'network'));
    expect(toGoogleError('boom')).toEqual(new GoogleApiError(0, 'network'));
  });
});

describe('GOOGLE_ERRORS (one test per key)', () => {
  it('a status: GoogleApiError(status, Google reason)', () => {
    const body = { error: { errors: [{ reason: 'backendError' }] } };
    expect(errorFor(GOOGLE_ERRORS, status(503, body))).toEqual(
      new GoogleApiError(503, 'backendError'),
    );
    expect(errorFor(GOOGLE_ERRORS, status(401, null))).toEqual(new GoogleApiError(401, 'error'));
  });

  it('network and timeout: GoogleApiError(0, network)', () => {
    const network: HttpFailure = { kind: 'network', reached: true, where };
    expect(errorFor(GOOGLE_ERRORS, network)).toEqual(new GoogleApiError(0, 'network'));
    expect(errorFor(GOOGLE_ERRORS, { kind: 'timeout', where })).toEqual(
      new GoogleApiError(0, 'network'),
    );
  });

  it('a 2xx the schema rejects keeps its status', () => {
    const shape: HttpFailure = { kind: 'shape', status: 200, issues: [], where };
    expect(errorFor(GOOGLE_ERRORS, shape)).toEqual(new GoogleApiError(200, 'error'));
  });

  it('LOOKUP_ERRORS: 404 and 410 are Gone, the rest as GOOGLE_ERRORS', () => {
    expect(errorFor(LOOKUP_ERRORS, status(404, null))).toBeInstanceOf(Gone);
    expect(errorFor(LOOKUP_ERRORS, status(410, null))).toBeInstanceOf(Gone);
    expect(errorFor(LOOKUP_ERRORS, status(403, null))).toEqual(new GoogleApiError(403, 'error'));
  });
});
