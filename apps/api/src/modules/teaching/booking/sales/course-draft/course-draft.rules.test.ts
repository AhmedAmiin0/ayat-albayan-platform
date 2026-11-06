import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { confirmRequest, draftCourse, draftRequestId, type CourseDraft } from './course-draft.rules';

const S1 = 'c0000000-0000-4000-8000-000000000001';
const T1 = 'd0000000-0000-4000-8000-000000000001';
const SUB = { id: 'sub1', package: '8' as const, duration: 45 as const, lessons_total: 8, starts_on: '2026-11-01' };
const REQ: BookingRequest = bookingRequestSchema.parse({
  kind: 'package', package: '8', studentIds: [S1], teacherId: T1, byday: [4, 0], startTimeLocal: '17:00',
  dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }], tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-11-08',
  startsAt: '2026-11-08T14:00:00.000Z',
});
const draft = (over: Partial<CourseDraft> = {}): CourseDraft =>
  ({ subscriptionId: 'sub1', request: REQ, savedBy: 'a1', savedAt: '2026-11-06T09:00:00.000Z', ...over });

describe('course draft rules (owner 2026-11-06)', () => {
  it('one idempotency key per saved version: a retry replays, an edit is new', () => {
    expect(draftRequestId(draft())).toBe(draftRequestId(draft()));
    expect(draftRequestId(draft({ savedAt: '2026-11-06T10:00:00.000Z' }))).not.toBe(draftRequestId(draft()));
    const keyed = { ...REQ, clientRequestId: draftRequestId(draft()) };
    expect(bookingRequestSchema.safeParse(keyed).success).toBe(true);
  });

  it('paid before the picked start: the picks as they are, the pinned first lesson kept', () => {
    const req = confirmRequest(draft(), new Date('2026-11-06T12:00:00.000Z'));
    expect(req).toMatchObject({ startsOn: '2026-11-08', startsAt: REQ.startsAt, clientRequestId: draftRequestId(draft()) });
  });

  it('paid after it: from today in the family’s zone, no pinned instant (passed times drop)', () => {
    const req = confirmRequest(draft(), new Date('2026-11-10T22:30:00.000Z'));
    expect(req.startsOn).toBe('2026-11-11'); // already the 11th in Riyadh
    expect(req.startsAt).toBeUndefined();
  });

  it('as `previous`: its teacher and each day with its own time, opening on its first day', () => {
    expect(draftCourse(REQ, SUB)).toMatchObject({
      subscriptionId: 'sub1', teacherId: T1, startsOn: '2026-11-08', endsOn: '2026-11-07', opensOn: '2026-11-08',
      days: [{ weekday: 0, startTimeLocal: '17:00' }, { weekday: 4, startTimeLocal: '18:00' }], lessonsTotal: 8, perWeek: 2,
    });
  });
});
