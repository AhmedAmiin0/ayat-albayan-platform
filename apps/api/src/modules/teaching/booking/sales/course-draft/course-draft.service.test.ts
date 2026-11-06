import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { BOOKING, REQ, setup, SUB, USER } from './course-draft.fakes';
import { draftRequestId } from './course-draft.rules';

// «اختر أيام الحلقات» before the payment (owner 2026-11-06).
describe('CourseDrafts', () => {
  it('first save on a held package: a draft, nothing booked, nobody told (no 409)', async () => {
    const t = setup({ held: [true, true] });
    expect(await t.drafts.save(REQ, USER)).toMatchObject({ state: 'draft' });
    expect(t.rows.get(SUB)).toMatchObject({ request: REQ, savedBy: USER.id });
    expect(t.env.sales.allowed).toHaveBeenCalledWith(REQ, USER);
    expect(t.env.sales.book).not.toHaveBeenCalled();
    expect(t.env.booking.book).not.toHaveBeenCalled();
    expect(t.env.due.clash).not.toHaveBeenCalled();
  });

  it('saved again: the draft is edited (replaced), still nothing booked', async () => {
    const t = setup({ held: [true, true, true, true] });
    await t.drafts.save(REQ, USER);
    await t.drafts.save({ ...REQ, startTimeLocal: '19:00' }, USER);
    expect(t.rows.size).toBe(1);
    expect(t.rows.get(SUB)?.request.startTimeLocal).toBe('19:00');
    expect(t.env.booking.book).not.toHaveBeenCalled();
  });

  it('payment: the draft is booked once as the assistant, then gone; a webhook retry books nothing more', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    const draft = t.rows.get(SUB);
    await t.events.paid(SUB);
    expect(t.env.course.options).toHaveBeenCalledWith(expect.objectContaining({ clientRequestId: draftRequestId(draft ?? { subscriptionId: SUB, savedAt: '' }) }), SUB);
    expect(t.env.booking.book).toHaveBeenCalledTimes(1);
    expect(t.env.booking.book).toHaveBeenCalledWith(expect.anything(), USER.id, expect.anything());
    expect(t.rows.size).toBe(0);
    await t.events.paid(SUB);
    expect(t.env.booking.book).toHaveBeenCalledTimes(1);
  });

  it('a retry after a booking whose draft removal failed: already booked → only the draft goes', async () => {
    const t = setup({ held: [true, true], booked: true });
    await t.drafts.save(REQ, USER);
    expect(await t.drafts.confirm(SUB)).toBe('booked');
    expect(t.env.booking.book).not.toHaveBeenCalled();
    expect(t.rows.size).toBe(0);
  });

  it('a clash at payment: nothing booked, the draft kept as the prefill, the staff told to pick again', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    t.env.booking.book.mockRejectedValueOnce(domainError(HttpStatus.CONFLICT, 'conflict'));
    expect(await t.drafts.confirm(SUB)).toBe('clash');
    expect(t.rows.size).toBe(1);
    const who = expect.objectContaining({ savedBy: USER.id });
    expect(t.env.due.clash).toHaveBeenCalledWith(SUB, who);
  });

  it('a server failure is not a clash: it throws (the event logs it), the draft stays', async () => {
    const t = setup({ held: [true, true] });
    await t.drafts.save(REQ, USER);
    t.env.booking.book.mockRejectedValueOnce(new Error('db down'));
    await expect(t.drafts.confirm(SUB)).rejects.toThrow('db down');
    expect(t.rows.size).toBe(1);
    expect(t.env.due.clash).not.toHaveBeenCalled();
  });

  it('still unpaid (a part payment): held, nothing booked', async () => {
    const t = setup({ held: [true, true], status: 'unpaid' });
    await t.drafts.save(REQ, USER);
    expect(await t.drafts.confirm(SUB)).toBe('held');
    expect(t.env.booking.book).not.toHaveBeenCalled();
  });

  it('saved after the payment landed (race): booked at once, no draft left', async () => {
    const t = setup({ held: [true, false] });
    expect(await t.drafts.save(REQ, USER)).toEqual({ state: 'booked', booking: BOOKING });
    expect(t.rows.size).toBe(0);
    expect(t.env.sales.book).toHaveBeenCalledWith(REQ, USER);
  });

  it('not held (paid, a bank transfer on a link package, or no open link): booked normally', async () => {
    const t = setup({ held: [false] });
    expect(await t.drafts.save(REQ, USER)).toEqual({ state: 'booked', booking: BOOKING });
    expect(t.repo.save).not.toHaveBeenCalled();
  });

  it('a payment on a package with no draft: nothing', async () => {
    const t = setup({ held: [] });
    expect(await t.drafts.confirm(SUB)).toBe('none');
  });
});
