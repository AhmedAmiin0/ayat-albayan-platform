import { describe, expect, it } from 'vitest';
import { reopenOf, windowFakes } from './window.fakes';

// The family's reply releases every held text of THAT phone, oldest first (owner 2026-11-03).

const A = '+966500000001';
const B = '+966500000002';
const row = (id: string, phone: string, at: string) => ({
  id,
  phone_e164: phone,
  created_at: at,
  scheduled_for: at,
  expires_at: '2026-11-10T00:00:00Z',
});

describe('WindowHold.release', () => {
  it("a reply on the chat line: that phone's held texts in order; another family's stay held", async () => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([
      row('a1', A, '2026-11-01T09:00:00Z'),
      row('b1', B, '2026-11-01T09:01:00Z'),
      row('a2', A, '2026-11-01T09:02:00Z'),
    ] as never);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[A, '2026-11-02T10:00:00Z']]));
    f.repo.reopens.mockResolvedValue([B].map((p) => reopenOf({ phone_e164: p, created_at: '2026-11-01T08:00:00Z' })));
    await expect(f.hold.release()).resolves.toBe(2);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
    expect(f.repo.lastChatInbound).toHaveBeenCalledWith([A, B]);
    expect(f.repo.release).toHaveBeenCalledExactlyOnceWith(['a1', 'a2']);
    expect(f.repo.waiting).toHaveBeenCalledExactlyOnceWith(null, expect.any(Date));
  });

  it('a full page reads the next one after its last row: no family starves behind 200 others', async () => {
    const f = windowFakes();
    const page = Array.from({ length: 200 }, (_, i) =>
      row(`p${i}`, B, new Date(Date.parse('2026-11-01T00:00:00Z') + i * 1000).toISOString()),
    );
    f.repo.waiting
      .mockResolvedValueOnce(page as never)
      .mockResolvedValueOnce([row('late', A, '2026-11-01T09:00:00Z')] as never);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[A, '2026-11-02T10:00:00Z']]));
    await f.hold.release();
    expect(f.repo.waiting).toHaveBeenNthCalledWith(2, page.at(-1)?.created_at, expect.any(Date));
    expect(f.repo.release).toHaveBeenLastCalledWith(['late']);
  });

  it('nothing held: no release write that matches a row', async () => {
    const f = windowFakes();
    await expect(f.hold.release()).resolves.toBe(0);
    expect(f.repo.release).toHaveBeenCalledWith([]);
  });

  it('never throws (a failed read is logged, the pass goes on)', async () => {
    const f = windowFakes();
    f.repo.waiting.mockRejectedValue(new Error('db down'));
    await expect(f.hold.release()).resolves.toBe(0);
  });
});

describe('WindowRelease — a held text never waits behind a dead reopen (review 2026-11-05)', () => {
  const NOW = new Date('2026-11-03T08:00:00Z');
  const held = row('h1', A, '2026-11-03T07:59:00Z');

  it('its reopen failed or expired unsent: failed reopen_failed now, not left for 7 days', async () => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.reopens.mockResolvedValue([reopenOf({ phone_e164: A, status: 'failed' })]);
    await expect(f.release.run(NOW)).resolves.toBe(0);
    expect(f.repo.reopens).toHaveBeenCalledWith([A], new Date('2026-11-02T07:59:00Z'), true);
    expect(f.repo.release).toHaveBeenCalledWith([]);
    expect(f.repo.fail).toHaveBeenCalledWith(
      ['h1'],
      expect.objectContaining({ code: 'reopen_failed', from: 'awaiting_reply' }),
    );
  });

  it('its reopen still pending or sent: stays held, nothing failed', async () => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.reopens.mockResolvedValue([reopenOf({ phone_e164: A, status: 'queued' })]);
    await f.release.run(NOW);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
  });

  it('answered: released, never failed, even though its reopen failed', async () => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[A, '2026-11-03T08:05:00Z']]));
    f.repo.reopens.mockResolvedValue([reopenOf({ phone_e164: A, status: 'failed' })]);
    await expect(f.release.run(NOW)).resolves.toBe(1);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
  });

  it('a row not held yet (just queued by the inbox): no reopen read, nothing failed', async () => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([{ ...held, scheduled_for: null, expires_at: null }] as never);
    await f.release.run(NOW);
    expect(f.repo.reopens).toHaveBeenCalledWith([], expect.anything(), true);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
  });
});

describe('WindowRelease — a reply racing the hold write (review finding 4)', () => {
  // The hold starts at the inbox's enqueue (07:59), when it saw the window closed; written 08:00.
  const held = row('h1', A, '2026-11-03T07:59:00Z');
  const run = async (inbound: string) => {
    const f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.reopens.mockResolvedValue([reopenOf({ phone_e164: A })]);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[A, inbound]]));
    await f.release.run(new Date('2026-11-03T08:01:00Z'));
    return f.repo.release.mock.calls.at(0)?.at(0);
  };

  it('the reply lands between the window read and the hold write: released', async () => {
    await expect(run('2026-11-03T07:59:30Z')).resolves.toEqual(['h1']);
  });

  it('the reply lands after the hold write: released', async () => {
    await expect(run('2026-11-03T08:00:30Z')).resolves.toEqual(['h1']);
  });

  it('the last reply is older than the hold start: stays held', async () => {
    await expect(run('2026-11-02T07:00:00Z')).resolves.toEqual([]);
  });
});
