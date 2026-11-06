import { describe, expect, it } from 'vitest';
import { attachOf, CHAT, echo, PHONE, row } from './manual-echo.fixtures.test-util';

// ManualEcho over rows in memory (docs/19): match, no match, idempotent replay, never overwrite.

const input = (over = {}) => ({ msg: echo(over), phone: PHONE, from: CHAT });

describe('ManualEcho.attach', () => {
  it('the same text inside the window: attached as sent, the reopen cancel runs', async () => {
    const rows = [row()];
    const { svc, reopens } = attachOf(rows);
    await expect(svc.attach(input())).resolves.toBe(true);
    expect(rows[0]).toMatchObject({ wa_message_id: 'wamid.APP1', status: 'sent', app_send_until: null });
    expect(reopens.afterAttach).toHaveBeenCalledWith({ id: 'm1', phone_e164: PHONE });
  });

  it('a window that just ended (no echo in time): still attached within the grace', async () => {
    const rows = [row({ app_send_until: '2026-11-06T10:00:00.000Z' })];
    await expect(attachOf(rows).svc.attach(input())).resolves.toBe(true);
  });

  it('a failed row the tap was on: attached too', async () => {
    const rows = [row({ status: 'failed', error_code: 'hold_expired' })];
    await expect(attachOf(rows).svc.attach(input())).resolves.toBe(true);
  });

  it('no match: another text, phone or number, an old window, no tap, not staff', async () => {
    const rows = [
      row({ id: 'text', body: 'نص آخر' }),
      row({ id: 'phone', phone: '+966500000002' }),
      row({ id: 'number', number_id: 'num-2' }),
      row({ id: 'old', app_send_until: '2026-11-06T09:59:59.000Z' }),
      row({ id: 'untapped', app_send_until: null }),
      row({ id: 'job', staff: false }),
    ];
    const { svc, reopens } = attachOf(rows);
    await expect(svc.attach(input())).resolves.toBe(false);
    expect(rows.every((r) => r.wa_message_id === null)).toBe(true);
    expect(reopens.afterAttach).not.toHaveBeenCalled();
  });

  it('a file, a template or a marker never attaches', async () => {
    const rows = [row()];
    const { svc } = attachOf(rows);
    for (const over of [{ mediaId: 'media-1' }, { templateName: 'welcome' }, { payload: { kind: 'edit' } }]) {
      await expect(svc.attach(input(over))).resolves.toBe(false);
    }
    expect(rows[0]?.wa_message_id).toBeNull();
  });

  it('replayed: the row has its wamid, nothing else is attached', async () => {
    const rows = [row(), row({ id: 'm2' })];
    const { svc } = attachOf(rows);
    await svc.attach(input());
    await expect(svc.attach(input())).resolves.toBe(false);
    expect(rows.map((r) => r.wa_message_id)).toEqual(['wamid.APP1', null]);
  });

  it('never overwrites a wamid: a row the platform sent (or WhatsApp took) is not a candidate', async () => {
    const rows = [row({ wa_message_id: 'wamid.OLD', status: 'failed', error_code: '131047' })];
    await expect(attachOf(rows).svc.attach(input())).resolves.toBe(false);
    expect(rows[0]?.wa_message_id).toBe('wamid.OLD');
  });

  it('the sender claimed it after the window ended: never attached (it may be sending it)', async () => {
    const rows = [row({ app_send_until: '2026-11-06T10:01:00.000Z', error_code: 'sending' })];
    await expect(attachOf(rows).svc.attach(input())).resolves.toBe(false);
  });

  it('two identical texts: each message takes the next row', async () => {
    const rows = [row(), row({ id: 'm2', app_send_until: '2026-11-06T10:11:00.000Z' })];
    const { svc } = attachOf(rows);
    await svc.attach(input());
    await svc.attach(input({ waMessageId: 'wamid.APP2' }));
    expect(rows.map((r) => r.wa_message_id)).toEqual(['wamid.APP1', 'wamid.APP2']);
  });
});
