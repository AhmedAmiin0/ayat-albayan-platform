import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import type { WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { ReadMark } from './read-marks';
import { ReadReceipts } from './read-receipts';
import type { ThreadReadsRepo } from '@/modules/messaging/inbox/threads/store';

const PHONE = '+966501234567';
const NOW = new Date('2026-10-10T08:00:00Z');
const BOTH: ReadMark[] = [{ waMessageId: 'wamid.n', line: 'notifications' }, { waMessageId: 'wamid.c', line: 'chat' }];
const client = () => ({ configured: vi.fn(() => true), markRead: vi.fn().mockResolvedValue(undefined) });

function setup(marks: ReadMark[], open = true) {
  const queries = { markInboundRead: vi.fn().mockResolvedValue(marks) };
  const gate = { open: vi.fn().mockResolvedValue(open) };
  const notifications = client();
  const chat = client();
  const receipts = new ReadReceipts(
    queries as unknown as ThreadReadsRepo,
    gate as unknown as SendGate,
    { notifications, chat } as unknown as WhatsappLines,
  );
  return { receipts, queries, gate, notifications, chat };
}

describe('ReadReceipts.open (docs/12 §13.7, R-MSG-05)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('stamps read, then one receipt per line on that line’s client', async () => {
    const t = setup(BOTH);
    await (await t.receipts.open(PHONE, { now: NOW })).receipts;
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, NOW, undefined);
    expect(t.notifications.markRead.mock.calls).toEqual([['wamid.n']]);
    expect(t.chat.markRead.mock.calls).toEqual([['wamid.c']]);
  });

  it('gate closed: read_at is stamped, Meta is never called', async () => {
    const t = setup(BOTH, false);
    await (await t.receipts.open(PHONE, { now: NOW })).receipts;
    expect(t.queries.markInboundRead).toHaveBeenCalled();
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });

  it('a phone off the allow-list: read_at is stamped, no receipt on either line', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    const t = setup(BOTH);
    await (await t.receipts.open(PHONE, { now: NOW })).receipts;
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, NOW, undefined);
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });

  it('a phone on the allow-list gets its receipts', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', `+201001234567, ${PHONE}`);
    const t = setup(BOTH);
    await (await t.receipts.open(PHONE, { now: NOW })).receipts;
    expect(t.notifications.markRead).toHaveBeenCalledWith('wamid.n');
    expect(t.chat.markRead).toHaveBeenCalledWith('wamid.c');
  });

  it('an unconfigured line client is skipped silently; the other line still gets its receipt', async () => {
    const t = setup(BOTH);
    t.chat.configured.mockReturnValue(false);
    await expect((await t.receipts.open(PHONE, { now: NOW })).receipts).resolves.toBeUndefined();
    expect(t.chat.markRead).not.toHaveBeenCalled();
    expect(t.notifications.markRead).toHaveBeenCalledWith('wamid.n');
  });

  it('one failing line never stops the other (warn only)', async () => {
    const t = setup(BOTH);
    t.notifications.markRead.mockRejectedValue(new Error('190 token expired'));
    await expect((await t.receipts.open(PHONE, { now: NOW })).receipts).resolves.toBeUndefined();
    expect(t.chat.markRead).toHaveBeenCalledWith('wamid.c');
  });

  it('the stamp answers without waiting for Meta (fire and forget): a receipt that never returns blocks nothing', async () => {
    const t = setup(BOTH);
    t.notifications.markRead.mockReturnValue(new Promise(() => undefined));
    const out = await t.receipts.open(PHONE, { now: NOW, upTo: '2026-10-10T07:59:00Z' });
    expect(out.stamped).toBe(true);
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, NOW, '2026-10-10T07:59:00Z');
  });

  it('a failing gate read is logged with the phone’s last 4 digits only, never thrown', async () => {
    const t = setup(BOTH);
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    t.gate.open.mockRejectedValue(new Error('settings read failed'));
    await expect((await t.receipts.open(PHONE, { now: NOW })).receipts).resolves.toBeUndefined();
    expect(warn.mock.calls.flat().join(' ')).toContain('…4567');
    expect(warn.mock.calls.flat().join(' ')).not.toContain(PHONE);
    warn.mockRestore();
  });

  it('nothing unread: no gate read and no receipt', async () => {
    const t = setup([]);
    await (await t.receipts.open(PHONE, { now: NOW })).receipts;
    expect(t.gate.open).not.toHaveBeenCalled();
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });
});
