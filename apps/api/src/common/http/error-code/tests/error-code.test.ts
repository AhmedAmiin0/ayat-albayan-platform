import { describe, expect, it } from 'vitest';
import { withCode } from '@/common/http/error-code';

describe('withCode: every error body carries a code beside its message', () => {
  it('keeps a body that already has a code', () => {
    const body = { code: 'phone_taken', message: 'phone_taken', field: 'phone' };
    expect(withCode(body, 409)).toEqual(body);
  });

  it('names a body by its message when the message is a code', () => {
    expect(withCode({ message: 'validation_failed', issues: [] }, 400)).toEqual({
      message: 'validation_failed',
      issues: [],
      code: 'validation_failed',
    });
  });

  it('names a Nest default body by its status', () => {
    expect(withCode({ statusCode: 404, message: 'Not Found' }, 404)).toEqual({
      statusCode: 404,
      message: 'Not Found',
      code: 'not_found',
    });
    expect(withCode({ statusCode: 400, message: ['a', 'b'] }, 400)).toMatchObject({
      code: 'bad_request',
    });
  });

  it('wraps a text body the way Nest does', () => {
    expect(withCode('Too large', 413)).toEqual({
      statusCode: 413,
      message: 'Too large',
      code: 'payload_too_large',
    });
    expect(withCode('no_line', 409)).toEqual({
      statusCode: 409,
      message: 'no_line',
      code: 'no_line',
    });
  });

  it('a status Nest does not name answers http_error', () => {
    expect(withCode({ message: 'Odd' }, 599)).toEqual({ message: 'Odd', code: 'http_error' });
  });
});
