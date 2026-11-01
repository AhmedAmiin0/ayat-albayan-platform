import { describe, expect, it } from 'vitest';
import { signInWorld } from '@/modules/people/sign-in/sign-in.world';

describe('SignInKit', () => {
  it('record writes one auth audit row with the channel only', async () => {
    const w = signInWorld();
    await w.kit.record({ userId: 'u1', action: 'password_reset', via: 'staff' });
    expect(w.audit.entries).toEqual([
      {
        actorId: 'u1',
        entity: 'auth',
        entityId: 'u1',
        action: 'password_reset',
        after: { via: 'staff' },
      },
    ]);
  });

  it('later runs after the answer; idle waits for it; a failure is logged only', async () => {
    const w = signInWorld();
    const done: string[] = [];
    w.kit.later(async () => {
      done.push('ran');
    });
    w.kit.later(() => Promise.reject(new Error('boom')));
    await w.kit.idle();
    expect(done).toEqual(['ran']);
  });

  it('guard passes under the limit and available follows the settings', async () => {
    const w = signInWorld({ settings: { family_login_enabled: false } });
    await w.kit.guard('request', { ip: '1.2.3.4', identifier: 'x' });
    expect(await w.kit.available()).toBe(false);
  });
});
