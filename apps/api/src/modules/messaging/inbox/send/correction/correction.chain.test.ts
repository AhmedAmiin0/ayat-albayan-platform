import { afterEach, describe, expect, it, vi } from 'vitest';
import { ar } from '@/common/infra/i18n/server-text';
import { correctionOf } from './correction';
import type { CorrectionRepo, CorrectionTarget } from './correction.repo';
import { target } from './correction.fakes';
import { PHONE } from '@/modules/messaging/inbox/inbox.fakes';

// Review of PR #694 (round 3): a correction is never corrected again (staff correct the original
// once more), the prefix goes once whatever the admins call it, and a bare prefix is refused.
const ORIGINAL = 'a0000000-0000-4000-8000-0000000000c1';
const FIRST_FIX = 'a0000000-0000-4000-8000-0000000000c2';
const DEFAULT_PREFIX = ar.inbox.correction.prefix;
const rows: Record<string, CorrectionTarget> = {
  [ORIGINAL]: target({ created_by: 'u1' }),
  [FIRST_FIX]: target({
    id: FIRST_FIX,
    created_by: 'u1',
    body: 'تصحيح: الحلقة الساعة الخامسة',
    corrects_id: ORIGINAL,
  }),
};
const repo = { target: vi.fn(async (id: string) => rows[id] ?? null) } as unknown as CorrectionRepo;
const send = (text: string, correctsId = ORIGINAL) => ({
  phone: PHONE,
  actorId: 'u1',
  role: 'admin',
  input: { text, correctsId },
});

afterEach(() => {
  ar.inbox.correction.prefix = DEFAULT_PREFIX;
});

describe('correctionOf: one level only', () => {
  it('a correction as the target: 400 not_correctable (even for an admin)', async () => {
    await expect(correctionOf(repo, send('السادسة', FIRST_FIX))).rejects.toMatchObject({
      response: { code: 'not_correctable' },
    });
  });

  it('a second correction of the original replies to it and links it', async () => {
    const out = await correctionOf(repo, send('الحلقة الساعة السادسة'));
    expect(out.send.input).toMatchObject({
      text: 'تصحيح: الحلقة الساعة السادسة',
      replyToMessageId: ORIGINAL,
    });
    expect(out.row).toEqual({ corrects_id: ORIGINAL });
  });
});

describe('correctionOf: the prefix', () => {
  it('a typed prefix is sent once', async () => {
    const out = await correctionOf(repo, send(' تصحيح: تصحيح: السادسة'));
    expect(out.send.input.text).toBe('تصحيح: السادسة');
  });

  it('an admin-reworded prefix: the new one once, the bundled one dropped', async () => {
    ar.inbox.correction.prefix = 'تعديل: ';
    const out = await correctionOf(repo, send('تصحيح: تعديل: السادسة'));
    expect(out.send.input.text).toBe('تعديل: السادسة');
  });

  it.each(['تصحيح:', '  تصحيح:  ', 'تصحيح: تصحيح:'])(
    'only the prefix (%j): 400 empty_correction',
    async (text) => {
      await expect(correctionOf(repo, send(text))).rejects.toMatchObject({
        response: { code: 'empty_correction' },
      });
    },
  );
});
