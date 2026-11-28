import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from '../api-error';

describe('apiErrorSchema: the error body every api answer carries', () => {
  it('reads the code, the message and the validation issues', () => {
    const body = {
      code: 'validation_failed',
      message: 'validation_failed',
      issues: [{ path: 'pageSize', message: 'Too big' }],
    };
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });

  it('keeps the details a domain error adds beside its code', () => {
    const body = { code: 'meta_error', message: 'meta_error', meta_code: 131_047 };
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });

  it('needs only the code', () => {
    expect(apiErrorSchema.parse({ code: 'not_found' })).toEqual({ code: 'not_found' });
  });

  it.each([{}, { message: 'Not Found' }, { code: 1 }, 'not_found', null])('refuses %j', (body) => {
    expect(apiErrorSchema.safeParse(body).success).toBe(false);
  });
});
