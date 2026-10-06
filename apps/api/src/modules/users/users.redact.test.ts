import { describe, expect, it } from 'vitest';
import { redact } from './users.redact';

describe('redact', () => {
  it('drops secrets at any depth, whatever the key style', () => {
    const out = redact({ email: 'a@b.co', password: 'x', new_password: 'x', access_token: 'x', accessToken: 'x', action_link: 'x', recoveryLink: 'x', credential: 'x', nested: { jwt: 'x', secret_key: 'x', ok: 1 }, list: [{ token: 'x', id: 'u1' }] });
    expect(out).toEqual({ email: 'a@b.co', nested: { ok: 1 }, list: [{ id: 'u1' }] });
  });

  it('keeps the audit keys that only look like secrets', () => {
    const out = redact({ linked: { kind: 'student', id: 's1' }, credential_mode: 'link', disabled_reason: 'x' });
    expect(out).toEqual({ linked: { kind: 'student', id: 's1' }, credential_mode: 'link', disabled_reason: 'x' });
  });
});
