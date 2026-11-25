import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { fakeStore, LESSON_ID, lessonRow, STUDENT_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { declineEvent, RequestDeclinePush } from '@/modules/teaching/lessons/proposals/request-decline.push';

const senderOf = (push: object) =>
  new RequestDeclinePush(push as unknown as PushService, fakeStore(lessonRow()).store);
const ASKED = {
  id: 'p1',
  lesson_id: LESSON_ID,
  requested_by: 'family',
  created_by: 'g-1',
  decision_note: 'لا يتوفر وقت آخر هذا الأسبوع',
};

describe('RequestDeclinePush: «ارفض» reaches the family that asked (owner 2026-11-17)', () => {
  it("the lesson stays: its time on the student's clock, the note, the login that asked", () => {
    const event = declineEvent(ASKED, lessonRow(), 'g-1');
    expect(event).toMatchObject({
      kind: 'lesson_request_declined',
      subject: 'request:p1',
      profileIds: ['g-1'],
      data: { lessonId: LESSON_ID, studentId: STUDENT_ID },
      vars: { student: 'سهيلة' },
    });
    expect(event.vars.when).toBe('الأحد 4 أكتوبر 17:00');
    expect(event.vars.note).toContain('لا يتوفر وقت آخر هذا الأسبوع');
    expect(declineEvent({ ...ASKED, decision_note: null }, lessonRow(), 'g-1').vars.note).toBe('');
  });

  it("a teacher's proposal (or no requester) pushes nothing; a family's one push", async () => {
    const push = { notifyProfiles: vi.fn() };
    const sender = senderOf(push);
    await sender.notify({ ...ASKED, requested_by: 'teacher' });
    await sender.notify({ ...ASKED, created_by: null });
    expect(push.notifyProfiles).not.toHaveBeenCalled();
    await sender.notify(ASKED);
    expect(push.notifyProfiles).toHaveBeenCalledTimes(1);
  });

  it('never throws: the answer is saved already', async () => {
    const push = { notifyProfiles: vi.fn().mockRejectedValue(new Error('down')) };
    const sender = senderOf(push);
    await expect(sender.notify(ASKED)).resolves.toBeUndefined();
  });
});
