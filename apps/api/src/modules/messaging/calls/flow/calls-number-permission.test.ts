import { describe, expect, it, vi } from 'vitest';
import { ADMIN_ACTOR, FAMILY, fakeGate } from '../calls.fakes';
import { CALLS, REQ, TEMPLATE, setup, tap } from './calls-number-permission.fakes';

vi.mock('../kapso/calling-line', () => ({ callingLine: vi.fn() }));

describe('«اطلب إذن الاتصال» from the calls number: only on a tap, through the gates', () => {
  it('the interactive request goes FROM the calls number (one request), its row stamped line calls and sent', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    const sent = await tap(s);
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
    expect(s.api.requestPermission).toHaveBeenCalledWith(CALLS, {
      to: FAMILY,
      text: expect.stringContaining('واتساب'),
    });
    expect(s.threads.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        line: 'calls',
        number_id: 'n-calls',
        direction: 'outbound',
        status: 'failed',
        error_code: 'sending',
        created_by: ADMIN_ACTOR.user.id,
        dedup_key: `call_permission:admin:${FAMILY}:${REQ}`,
      }),
    );
    expect(s.store.sent).toHaveBeenCalledWith('m1', 'wamid.PERM');
    expect(sent).toMatchObject({ replayed: false, view: { status: 'sent' } });
    expect(s.outbox.send).not.toHaveBeenCalled();
  });

  it('outside the window: the approved template of the setting', async () => {
    const s = setup({ template: true });
    await tap(s);
    expect(s.api.requestPermission).toHaveBeenCalledWith(CALLS, { to: FAMILY, template: TEMPLATE });
  });

  it('a repeated tap (same request id) sends nothing more', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    await tap(s);
    await expect(tap(s)).resolves.toMatchObject({ replayed: true });
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('the send gate closed (messaging_enabled off): 409 messaging_off, nothing queued or sent', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z', messaging: false });
    await expect(tap(s)).rejects.toMatchObject({ response: { code: 'messaging_off' } });
    expect(s.threads.enqueue).not.toHaveBeenCalled();
    expect(s.api.requestPermission).not.toHaveBeenCalled();
  });

  it('a phone off the allow-list (WA_ALLOWED_RECIPIENTS) is refused before anything', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    Object.assign(s.gate, { assertRecipient: fakeGate({ refuse: FAMILY }).assertRecipient });
    await expect(tap(s)).rejects.toMatchObject({ status: 403 });
    expect(s.api.permission).not.toHaveBeenCalled();
    expect(s.api.requestPermission).not.toHaveBeenCalled();
  });

  it('no template set outside the window: 409 permission_needs_template; granted: 409 permission_granted', async () => {
    await expect(tap(setup())).rejects.toMatchObject({
      response: { code: 'permission_needs_template' },
    });
    await expect(tap(setup({ canCall: true }))).rejects.toMatchObject({
      response: { code: 'permission_granted' },
    });
  });

  it('WhatsApp took it but the write failed: no 502 (a second tap would ask twice), the row as it is', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    s.store.sent.mockRejectedValueOnce(new Error('db down'));
    await expect(tap(s)).resolves.toMatchObject({ replayed: false });
    expect(s.store.failed).not.toHaveBeenCalled();
  });

  it('WhatsApp refuses: the row ends failed with the code, 502, never retried', async () => {
    const s = setup({ lastInbound: '2026-10-27T08:00:00Z' });
    s.api.requestPermission.mockRejectedValueOnce(new Error('boom'));
    await expect(tap(s)).rejects.toMatchObject({
      status: 502,
      response: { code: 'request_failed' },
    });
    expect(s.store.failed).toHaveBeenCalledWith('m1', 'error');
    expect(s.api.requestPermission).toHaveBeenCalledTimes(1);
  });
});
