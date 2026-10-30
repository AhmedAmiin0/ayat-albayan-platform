import { describe, expect, it, vi } from 'vitest';
import { fakeNumberStore } from '../calls-number.fakes';
import { fakeGate, fakeKit } from '../calls.fakes';
import { CallEvents } from './call-events.service';
import { CallsSweeper } from './calls.sweeper';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn(() => null) }));

const AT = new Date('2026-10-27T09:00:00Z');

describe('CallEvents.permissionReply (docs/28 §10)', () => {
  it('stores the family\'s answer by phone, even while calls are off, and never calls Kapso', async () => {
    const t = fakeKit();
    const store = fakeNumberStore();
    const events = new CallEvents(t.kit, fakeGate({ on: false }), new CallsSweeper(t.kit), store);
    await events.permissionReply({ phoneNumberId: 'calls-pn', from: '201001234567', response: 'accepted', expiresAt: null, at: AT });
    expect(store.saveReply).toHaveBeenCalledWith({ phoneNumberId: 'calls-pn', phone: '+201001234567', response: 'accepted', expiresAt: null, at: AT });
    expect(t.api.requestPermission).not.toHaveBeenCalled();
    expect(t.api.permission).not.toHaveBeenCalled();
  });

  it('a wa_id that is no phone is skipped', async () => {
    const store = fakeNumberStore();
    const kit = fakeKit().kit;
    await new CallEvents(kit, fakeGate(), new CallsSweeper(kit), store).permissionReply({ phoneNumberId: 'p', from: 'abc', response: 'rejected', expiresAt: null, at: AT });
    expect(store.saveReply).not.toHaveBeenCalled();
  });
});
