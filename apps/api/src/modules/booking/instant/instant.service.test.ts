import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import type { BookingQueries } from '../core/booking.queries';
import type { InstantQueries } from './instant.queries';
import { InstantLessonService } from './instant.service';

const T = '00000000-0000-4000-8000-0000000000b1';
const S1 = '00000000-0000-4000-8000-0000000000c1';
const S2 = '00000000-0000-4000-8000-0000000000c2';
const REQ_ID = '00000000-0000-4000-8000-0000000000e1';
const NOW = new Date('2026-10-05T13:07:42Z');
const RESULT = {
  rule_id: 'R1',
  student_ids: [S1],
  guardian_ids: ['G1'],
  lessons: [{ id: 'L1', starts_at: '2026-10-05T13:07:00.000Z', ends_at: '2026-10-05T13:37:00.000Z' }],
  message_ids: [],
  invoice_id: null,
};
const student = (id: string, link: string | null = null) => ({ id, name: 'س', meeting_link_override: link });
const CLASH = { kind: 'teacher_busy' as const, startsAt: '2026-10-05T13:07:00.000Z', endsAt: '2026-10-05T13:37:00.000Z' };

let booking: { teacher: ReturnType<typeof vi.fn>; students: ReturnType<typeof vi.fn>; replay: ReturnType<typeof vi.fn> };
let writes: { create: ReturnType<typeof vi.fn> };
let checker: { check: ReturnType<typeof vi.fn> };
const service = () =>
  new InstantLessonService(booking as unknown as BookingQueries, writes as unknown as InstantQueries, checker as unknown as ConflictChecker);
const req = (over: object = {}) => ({ studentIds: [S1], teacherId: T, durationMin: 30 as const, ...over });
const create = (over: object = {}) => service().create({ req: req(over), actorId: 'A1' }, NOW);
const body = async (p: Promise<unknown>) => ((await p.catch((e: HttpException) => e)) as HttpException).getResponse();

beforeEach(() => {
  booking = {
    teacher: vi.fn().mockResolvedValue({ id: T, tz: 'Asia/Riyadh', meeting_link: 'https://t.example.test' }),
    students: vi.fn(async (ids: string[]) => ids.map((id) => student(id))),
    replay: vi.fn().mockResolvedValue(null),
  };
  writes = { create: vi.fn().mockResolvedValue(RESULT) };
  checker = { check: vi.fn().mockResolvedValue([]) };
});

describe('POST /lessons/instant', () => {
  it('writes one lesson from this minute through the booking transaction, as the admin', async () => {
    expect(await create()).toEqual({ lessonId: 'L1' });
    const [payload, actor] = writes.create.mock.calls[0] ?? [];
    expect(actor).toBe('A1');
    expect(payload.lessons).toEqual([
      { starts_at: '2026-10-05T13:07:00.000Z', ends_at: '2026-10-05T13:37:00.000Z', meeting_link: 'https://t.example.test', override_reason: null },
    ]);
    expect(payload).toMatchObject({ messages: [], invoice: null, rule: { package: null, tz: 'Asia/Riyadh' } });
  });

  it('checks the slot for the teacher and every student', async () => {
    await create({ studentIds: [S1, S2] });
    expect(checker.check).toHaveBeenCalledWith(expect.objectContaining({ teacherId: T, studentIds: [S1, S2], excludeIds: [] }));
  });

  it('409 conflict (with the clashes) unless an override reason is given', async () => {
    checker.check.mockResolvedValue([CLASH]);
    expect(await body(create())).toMatchObject({ code: 'conflict', conflicts: [CLASH] });
    expect(writes.create).not.toHaveBeenCalled();
    expect(await create({ override: { reason: 'طارئ' } })).toEqual({ lessonId: 'L1' });
    expect(writes.create.mock.calls[0]?.[0].lessons[0].override_reason).toBe('طارئ');
  });

  it('404 teacher_not_found / student_not_found', async () => {
    booking.teacher.mockResolvedValue(null);
    expect(await body(create())).toMatchObject({ code: 'teacher_not_found' });
    booking.teacher.mockResolvedValue({ id: T, tz: 'Asia/Riyadh', meeting_link: null });
    booking.students.mockResolvedValue([]);
    expect(await body(create())).toMatchObject({ code: 'student_not_found' });
  });

  it('uses the one student own link over the teacher link', async () => {
    booking.students.mockResolvedValue([student(S1, 'https://own.example.test')]);
    await create();
    expect(writes.create.mock.calls[0]?.[0].lessons[0].meeting_link).toBe('https://own.example.test');
  });

  it('a replay with the same clientRequestId returns the first lesson and writes nothing', async () => {
    booking.replay.mockResolvedValue(RESULT);
    expect(await create({ clientRequestId: REQ_ID })).toEqual({ lessonId: 'L1' });
    expect(writes.create).not.toHaveBeenCalled();
    expect(checker.check).not.toHaveBeenCalled();
  });
});
