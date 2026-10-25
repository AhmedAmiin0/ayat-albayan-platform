import { PUSH_KINDS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakePolicy, fakeRulesReader, type FakePolicyInput } from '../../modules/notification-rules/policy/policy.fakes';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import { pushRoute } from './push.rules';
import type { PushTransport } from './push.service';

// docs/23 §2c: every staff push kind asks its notification rule (on/off, channels) before the bell row.

const snap = (input: FakePolicyInput = {}) => fakeRulesReader(input).snapshot();

describe('pushRoute', () => {
  it('legacy, no rows: every kind as before (bell + push; google_sync_alert has no push channel)', async () => {
    const s = await snap();
    for (const kind of PUSH_KINDS) expect(pushRoute(s, kind)).toEqual({ bell: true, push: kind !== 'google_sync_alert' });
  });

  it('a row off: nothing; push left out of its channels: the bell only', async () => {
    const s = await snap({ mode: 'module', rows: [{ key: 'new_lead', enabled: false }, { key: 'new_message', channels: ['bell'] }] });
    expect(pushRoute(s, 'new_lead')).toEqual({ bell: false, push: false });
    expect(pushRoute(s, 'new_message')).toEqual({ bell: true, push: false });
  });

  it('reminder_failed is locked: always on, whatever its row says', async () => {
    const s = await snap({ mode: 'module', rows: [{ key: 'reminder_failed', enabled: false }] });
    expect(pushRoute(s, 'reminder_failed')).toEqual({ bell: true, push: true });
  });

  it('rules unreadable: the bell row still, no device push (a locked row keeps both)', () => {
    expect(pushRoute(null, 'new_lead')).toEqual({ bell: true, push: false });
    expect(pushRoute(null, 'reminder_failed')).toEqual({ bell: true, push: true });
  });
});

describe('PushService and the rules', () => {
  const admin = [{ id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[x]'] }];
  const event = { subject: 'lead-1', vars: { name: 'x', preview: 'y' } };

  async function run(policyInput: FakePolicyInput) {
    const { db, writes } = fakePushDb(admin);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web, policy: fakePolicy(policyInput) }).notifyAdmins('new_lead', event);
    await flushPushes();
    return { rows: writes.filter((w) => w.op === 'upsert'), transport, send };
  }

  it('legacy, no rows: the bell row and both pushes, as before', async () => {
    const { rows, transport, send } = await run({});
    expect(rows).toHaveLength(1);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('the row off: no bell row, no push', async () => {
    const { rows, transport, send } = await run({ mode: 'module', rows: [{ key: 'new_lead', enabled: false }] });
    expect(rows).toEqual([]);
    expect(transport).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('push channel off: the bell row only', async () => {
    const { rows, transport, send } = await run({ mode: 'module', rows: [{ key: 'new_lead', channels: ['bell'] }] });
    expect(rows).toHaveLength(1);
    expect(transport).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('rules unreadable: the bell row, no push', async () => {
    const { rows, transport, send } = await run({ fail: true });
    expect(rows).toHaveLength(1);
    expect(transport).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
