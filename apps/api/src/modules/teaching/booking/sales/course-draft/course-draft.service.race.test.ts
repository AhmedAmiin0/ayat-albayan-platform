import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { BOOKING, REQ, setup, SUB, USER } from './course-draft.fakes';
import { draftRequestId } from './course-draft.rules';

// PR #648 review: a draft saved while the payment lands, and «احجز» racing the payment, never
// book two courses; a draft is removed only as the version that was booked.
const keyed = (savedAt: string) =>
  expect.objectContaining({ clientRequestId: draftRequestId({ subscriptionId: SUB, savedAt }) });

describe('CourseDrafts — races with the payment', () => {
  it('saved while the payment lands: the SAVED row is booked with the payment’s draft key', async () => {
    const t = setup({ held: [true, false] });
    const read: string[] = [];
    t.repo.get.mockImplementationOnce(async (id: string) => {
      const row = t.rows.get(id) ?? null;
      read.push(row?.savedAt ?? '');
      return row;
    });
    expect(await t.drafts.save(REQ, USER)).toEqual({ state: 'booked', booking: BOOKING });
    expect(t.env.booking.book).toHaveBeenCalledWith(keyed(read[0] ?? ''), USER.id, expect.anything());
    expect(t.env.sales.book).not.toHaveBeenCalled();
    expect(t.rows.size).toBe(0);
  });

  it('the payment’s confirm took the row first: the same key replays its booking (no 409)', async () => {
    const t = setup({ held: [true, false] });
    t.repo.get.mockResolvedValueOnce(null);
    t.env.course.isReplay.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await t.drafts.save(REQ, USER)).toEqual({ state: 'booked', booking: BOOKING });
    expect(t.env.course.options).not.toHaveBeenCalled();
    expect(t.env.booking.book).toHaveBeenCalledWith(expect.anything(), USER.id);
  });

  it('create_booking refuses course_exists («احجز» won): booked, the draft goes, no alert', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    t.env.booking.book.mockRejectedValueOnce(domainError(HttpStatus.CONFLICT, 'course_exists'));
    t.env.course.isBooked.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await t.drafts.confirm(SUB)).toBe('booked');
    expect(t.env.due.clash).not.toHaveBeenCalled();
    expect(t.rows.size).toBe(0);
  });

  it('an overlap with another course (course_exists, package unbooked): a clash, the draft kept', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    t.env.course.options.mockRejectedValueOnce(domainError(HttpStatus.CONFLICT, 'course_exists'));
    expect(await t.drafts.confirm(SUB)).toBe('clash');
    expect(t.env.due.clash).toHaveBeenCalledWith(SUB, expect.objectContaining({ reason: 'clash' }));
    expect(t.rows.size).toBe(1);
  });

  it('saved while paid, another version booked first: the 409 comes back and the stale row goes', async () => {
    const t = setup({ held: [true, false] });
    t.env.course.options.mockRejectedValueOnce(domainError(HttpStatus.CONFLICT, 'course_exists'));
    t.env.course.isBooked.mockResolvedValueOnce(true);
    await expect(t.drafts.save(REQ, USER)).rejects.toThrow();
    expect(t.rows.size).toBe(0);
  });

  it('an edit saved while the old version was booking stays (version-checked remove)', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    const old = t.rows.get(SUB);
    t.env.booking.book.mockImplementationOnce(async () => {
      t.rows.set(SUB, { subscriptionId: SUB, request: REQ, savedBy: USER.id, savedAt: 'edited' });
      return BOOKING;
    });
    expect(await t.drafts.confirm(SUB)).toBe('booked');
    expect(t.repo.remove).toHaveBeenCalledWith(old);
    expect(t.rows.get(SUB)?.savedAt).toBe('edited');
  });
});
