import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SendGate } from '../whatsapp/send-gate';
import type { WhatsappLines } from '../whatsapp/whatsapp.types';
import type { ReadMark } from './read-marks';
import { ReadReceipts } from './read-receipts';
import type { ThreadsQueries } from './threads.queries';

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
    queries as unknown as ThreadsQueries,
    gate as unknown as SendGate,
    { notifications, chat } as unknown as WhatsappLines,
  );
  return { receipts, queries, gate, notifications, chat };
}

describe('ReadReceipts.open (docs/12 §13.7, R-MSG-05)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('stamps read, then one receipt per line on that line’s client', async () => {
    const t = setup(BOTH);
    await t.receipts.open(PHONE, NOW);
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, NOW);
    expect(t.notifications.markRead.mock.calls).toEqual([['wamid.n']]);
    expect(t.chat.markRead.mock.calls).toEqual([['wamid.c']]);
  });

  it('gate closed: read_at is stamped, Meta is never called', async () => {
    const t = setup(BOTH, false);
    await t.receipts.open(PHONE, NOW);
    expect(t.queries.markInboundRead).toHaveBeenCalled();
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });

  it('a phone off the allow-list: read_at is stamped, no receipt on either line', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    const t = setup(BOTH);
    await t.receipts.open(PHONE, NOW);
    expect(t.queries.markInboundRead).toHaveBeenCalledWith(PHONE, NOW);
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });

  it('a phone on the allow-list gets its receipts', async () => {
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', `+201001234567, ${PHONE}`);
    const t = setup(BOTH);
    await t.receipts.open(PHONE, NOW);
    expect(t.notifications.markRead).toHaveBeenCalledWith('wamid.n');
    expect(t.chat.markRead).toHaveBeenCalledWith('wamid.c');
  });

  it('an unconfigured line client is skipped silently; the other line still gets its receipt', async () => {
    const t = setup(BOTH);
    t.chat.configured.mockReturnValue(false);
    await expect(t.receipts.open(PHONE, NOW)).resolves.toBeUndefined();
    expect(t.chat.markRead).not.toHaveBeenCalled();
    expect(t.notifications.markRead).toHaveBeenCalledWith('wamid.n');
  });

  it('one failing line never stops the other (warn only)', async () => {
    const t = setup(BOTH);
    t.notifications.markRead.mockRejectedValue(new Error('190 token expired'));
    await expect(t.receipts.open(PHONE, NOW)).resolves.toBeUndefined();
    expect(t.chat.markRead).toHaveBeenCalledWith('wamid.c');
  });

  it('nothing unread: no gate read and no receipt', async () => {
    const t = setup([]);
    await t.receipts.open(PHONE, NOW);
    expect(t.gate.open).not.toHaveBeenCalled();
    expect(t.notifications.markRead).not.toHaveBeenCalled();
    expect(t.chat.markRead).not.toHaveBeenCalled();
  });
});
