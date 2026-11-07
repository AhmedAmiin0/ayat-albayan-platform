import { describe, expect, it, vi } from 'vitest';
import { correctionOf } from './correction';
import type { CorrectionRepo, CorrectionTarget } from './correction.repo';
import { target } from './correction.fakes';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';

// Review of PR #694 (1): a correction of a correction reaches the family with ONE prefix and is
// linked to the original, so the chain stays one level.
const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const FIRST_FIX = 'a0000000-0000-4000-8000-0000000000c2';
const rows: Record<string, CorrectionTarget> = {
  [ORIGINAL]: target({ created_by: 'u1' }),
  [FIRST_FIX]: target({
    id: FIRST_FIX,
    created_by: 'u1',
    body: 'تصحيح: الحلقة الساعة الخامسة',
    corrects_id: ORIGINAL,
  }),
};
const repo = (over: Record<string, CorrectionTarget> = {}) => {
  const all = { ...rows, ...over };
  return { target: vi.fn(async (id: string) => all[id] ?? null) } as unknown as CorrectionRepo;
};
const send = (text: string, correctsId = FIRST_FIX) => ({
  phone: PHONE,
  actorId: 'u1',
  role: 'sales',
  input: { text, correctsId },
});

describe('correctionOf: a correction of a correction', () => {
  it('targets the original: one prefix, replying to it and linked to it', async () => {
    const out = await correctionOf(repo(), send('تصحيح: الحلقة الساعة السادسة'));
    expect(out.send.input).toMatchObject({
      text: 'تصحيح: الحلقة الساعة السادسة',
      replyToMessageId: ORIGINAL,
    });
    expect(out.row).toEqual({ corrects_id: ORIGINAL });
  });

  it('a prefix typed on a first correction is sent once', async () => {
    const out = await correctionOf(repo(), send(' تصحيح: تصحيح: السادسة', ORIGINAL));
    expect(out.send.input.text).toBe('تصحيح: السادسة');
  });

  it('an original in another chat (or gone): 400 correction_not_in_thread', async () => {
    const elsewhere = { [ORIGINAL]: target({ phone_e164: '+201000000099' }) };
    await expect(correctionOf(repo(elsewhere), send('نص'))).rejects.toMatchObject({
      response: { code: 'correction_not_in_thread' },
    });
  });
});
