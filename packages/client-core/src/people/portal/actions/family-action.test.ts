import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/http';
import { FAMILY_NOTICE, familyErrorOf, familyFailureText, runFamilyAction } from './family-action';
import type { PortalLessonSends } from './lesson-sends.types';

const ids = { studentId: 's1', lessonId: 'l1' };
const sends = (): PortalLessonSends => ({
  confirm: vi.fn(async () => ({ lesson_id: 'l1', status: 'confirmed' as const, counts: false })),
  cancel: vi.fn(async () => ({ lesson_id: 'l1', status: 'excused' as const, counts: true })),
  request: vi.fn(async () => ({ lesson_id: 'l1', status: 'scheduled' as const, counts: false })),
  withdraw: vi.fn(async () => ({ lesson_id: 'l1', status: 'scheduled' as const, counts: false })),
});

describe('a family lesson action (owner 2026-11-17)', () => {
  it('each kind goes to its own send, with its fields', async () => {
    const s = sends();
    const run = runFamilyAction(s);
    await run({ kind: 'confirm', ...ids });
    expect(s.confirm).toHaveBeenCalledWith({ kind: 'confirm', ...ids });
    expect((await run({ kind: 'cancel', ...ids, reason: 'سفر' })).counts).toBe(true);
    expect(s.cancel).toHaveBeenCalledWith(expect.objectContaining({ reason: 'سفر' }));
    await run({ kind: 'request', ...ids, startsAt: '2026-11-18T14:30:00.000Z' });
    expect(s.request).toHaveBeenCalledWith(expect.objectContaining({ startsAt: '2026-11-18T14:30:00.000Z' }));
    await run({ kind: 'withdraw', ...ids });
    expect(s.withdraw).toHaveBeenCalled();
  });

  it('the notice each says, and the refusals with their own words', () => {
    expect(FAMILY_NOTICE).toEqual({
      confirm: 'confirmedNotice',
      cancel: 'declinedNotice',
      request: 'sentNotice',
      withdraw: 'withdrawnNotice',
    });
    expect(familyErrorOf(new ApiError(409, { code: 'proposal_pending' }))).toBe('proposal_pending');
    expect(familyErrorOf(new ApiError(409, { code: 'boom' }))).toBeNull();
    expect(familyErrorOf(new Error('offline'))).toBeNull();
  });
});

describe('familyFailureText', () => {
  const words = {
    errors: {
      proposal_pending: 'p', lesson_started: 's', no_request: 'n', date_in_past: 'd', group_lesson: 'g',
    },
    failed: 'f',
  };
  it('a known refusal in its own words, anything else the general one', () => {
    expect(familyFailureText(new ApiError(409, { code: 'no_request' }), words)).toBe('n');
    expect(familyFailureText(new Error('x'), words)).toBe('f');
  });
});
