import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../../common/audit/audit.service';
import { bookingRequest, fakePlanner, IDS, NOW } from './booking.fakes';
import type { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const RESULT = {
  rule_id: 'R1',
  student_ids: [IDS.s1, IDS.s2],
  guardian_ids: [IDS.g1],
  lessons: [{ id: 'L1', starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' }],
  message_ids: ['M1'],
};
function setup() {
  const deps = fakePlanner();
  deps.queries.createBooking.mockResolvedValue(RESULT);
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new BookingService(
    deps.planner,
    deps.queries as unknown as BookingQueries,
    audit as unknown as AuditService,
  );
  return { ...deps, audit, service };
}

describe('BookingService (R-SCH-06, R-SCH-04)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('writes everything through one create_booking call as the acting admin', async () => {
    const { service, queries } = setup();
    expect(await service.book(bookingRequest(), ACTOR)).toEqual(RESULT);
    expect(queries.createBooking).toHaveBeenCalledTimes(1);
    const [payload, actor] = queries.createBooking.mock.calls[0] ?? [];
    expect(actor).toBe(ACTOR);
    expect(payload).toMatchObject({ student_ids: [IDS.s1, IDS.s2], rule: { package: '8' } });
  });

  it('audits the booking (entity schedule_rules, action book)', async () => {
    const { service, audit } = setup();
    await service.book(bookingRequest(), ACTOR);
    expect(audit.record).toHaveBeenCalledWith({
      actorId: ACTOR,
      entity: 'schedule_rules',
      entityId: 'R1',
      action: 'book',
      after: {
        package: '8',
        lead_id: null,
        student_ids: [IDS.s1, IDS.s2],
        lessons: 1,
        override_reason: null,
        conflicts: [],
      },
    });
  });

  it('an override is audited with its reason and the conflicts it overrode', async () => {
    const { service, audit, availability } = setup();
    availability.listBusyLessons.mockResolvedValue([
      { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') },
    ]);
    await service.book(bookingRequest({ override: { reason: 'بطلب ولي الأمر' } }), ACTOR);
    const after = audit.record.mock.calls[0]?.[0]?.after;
    expect(after).toMatchObject({
      override_reason: 'بطلب ولي الأمر',
      conflicts: [{ kind: 'teacher_busy', lessonId: 'T1', startsAt: '2026-10-04T14:00:00.000Z' }],
    });
  });

  it('nothing is written when the plan is rejected', async () => {
    const { service, queries, audit, availability } = setup();
    availability.listBusyLessons.mockResolvedValue([
      { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') },
    ]);
    await expect(service.book(bookingRequest(), ACTOR)).rejects.toThrow();
    expect(queries.createBooking).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
