import { describe, expect, it, vi } from 'vitest';
import { ADMIN_ACTOR, FAMILY } from '../calls.fakes';
import { NOW, setup } from './calls-number-permission.fakes';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn() }));

describe('call permission on the calls number: the state (docs/28 §10)', () => {
  it("granted shows the stored grant's expiry when Kapso gives none, and the family's last answer", async () => {
    const s = setup({ canCall: true });
    s.store.replies.set(`calls-pn|${FAMILY}`, {
      response: 'accepted',
      at: '2026-10-27T09:00:00.000Z',
      expires_at: '2026-11-03T09:00:00.000Z',
    });
    await expect(s.perms.state(ADMIN_ACTOR, FAMILY, NOW)).resolves.toEqual({
      state: 'granted',
      expires_at: '2026-11-03T09:00:00.000Z',
      reply: {
        response: 'accepted',
        at: '2026-10-27T09:00:00.000Z',
        expires_at: '2026-11-03T09:00:00.000Z',
      },
    });
  });

  it("inside the calls number's own window: the interactive request; outside: the template, else needs_template", async () => {
    await expect(
      setup({ lastInbound: '2026-10-27T08:00:00Z' }).perms.state(ADMIN_ACTOR, FAMILY, NOW),
    ).resolves.toMatchObject({ state: 'request', via: 'interactive' });
    await expect(
      setup({ lastInbound: '2026-10-25T08:00:00Z', template: true }).perms.state(
        ADMIN_ACTOR,
        FAMILY,
        NOW,
      ),
    ).resolves.toMatchObject({ state: 'request', via: 'template' });
    await expect(
      setup({ template: false }).perms.state(ADMIN_ACTOR, FAMILY, NOW),
    ).resolves.toMatchObject({ state: 'needs_template', via: 'template', reply: null });
  });

  it('reading the state never sends anything', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z', template: true });
    await s.perms.state(ADMIN_ACTOR, FAMILY, NOW);
    expect(s.api.requestPermission).not.toHaveBeenCalled();
    expect(s.threads.enqueue).not.toHaveBeenCalled();
  });
});
