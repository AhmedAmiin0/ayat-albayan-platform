import { describe, expect, it } from 'vitest';
import { windowFakes } from './window.fakes';

// The family's reply releases every held text of THAT phone, oldest first (owner 2026-11-03).

const A = '+966500000001';
const B = '+966500000002';
const row = (id: string, phone: string, at: string) => ({
  id,
  phone_e164: phone,
  created_at: at,
  scheduled_for: at,
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
    await expect(f.hold.release()).resolves.toBe(2);
    expect(f.repo.lastChatInbound).toHaveBeenCalledWith([A, B]);
    expect(f.repo.release).toHaveBeenCalledExactlyOnceWith(['a1', 'a2']);
    expect(f.repo.waiting).toHaveBeenCalledExactlyOnceWith(null);
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
    expect(f.repo.waiting).toHaveBeenNthCalledWith(2, page.at(-1)?.created_at);
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
