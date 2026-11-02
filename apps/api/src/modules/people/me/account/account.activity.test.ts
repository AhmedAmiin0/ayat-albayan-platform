import { describe, expect, it } from 'vitest';
import { toEntry } from '@/common/telemetry/activity/activity.entry';
import { actionKey } from '@/common/telemetry/activity/activity.route';

// Every /me change is logged by the global ActivityInterceptor: field NAMES only, never a value.

const user = { id: 'user-1', email: 'old@example.test', role: 'teacher' as const };
const entry = (route: string, body: unknown, status = 200) =>
  toEntry({ req: { method: 'PUT', headers: {}, body, user }, route, action: actionKey('AccountController', 'changePassword'), status, durationMs: 5 });

describe('account activity rows', () => {
  it('a password change logs the field names, never the passwords', () => {
    const row = entry('/me/password', { current_password: 'Current-pass-1', new_password: 'Brand-new-9' });
    expect(row).toMatchObject({ actor_id: 'user-1', action: 'account.changePassword', entity: 'me', meta: { fields: ['current_password', 'new_password'] } });
    expect(JSON.stringify(row)).not.toMatch(/Current-pass-1|Brand-new-9/);
  });

  it('a wrong password (400) is a row too, without the values', () => {
    const row = entry('/me/email', { email: 'new@example.test', current_password: 'guess' }, 400);
    expect(row?.status).toBe(400);
    expect(JSON.stringify(row)).not.toMatch(/guess|new@example\.test/);
  });
});
