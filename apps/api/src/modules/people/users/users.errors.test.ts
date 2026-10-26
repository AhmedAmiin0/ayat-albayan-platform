import { describe, expect, it } from 'vitest';
import { guardedError, phoneAware } from './users.errors';

const fail = (code: string, message: string) => ({ code, message }) as unknown as Parameters<typeof phoneAware>[0];

describe('users.errors', () => {
  it('turns a unique violation into 409 phone_taken, anything else into a plain error', () => {
    expect(phoneAware(fail('23505', 'dup'))).toMatchObject({ response: { code: 'phone_taken' } });
    expect(phoneAware(fail('XX000', 'boom')).message).toContain('boom');
  });

  it('turns the last-admin guard of migration 287 into 409 last_admin, and nothing else', () => {
    expect(guardedError(fail('P0001', 'last_admin'))).toMatchObject({ response: { code: 'last_admin' } });
    expect(guardedError(fail('P0001', 'other')).message).toContain('other');
    expect(guardedError(fail('23505', 'dup'))).toMatchObject({ response: { code: 'phone_taken' } });
  });
});
