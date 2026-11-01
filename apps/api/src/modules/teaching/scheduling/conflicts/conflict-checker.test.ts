import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilityRepo } from '@/modules/people/teachers/availability/availability.repo';
import type { BusyRepo } from './busy.repo';
import { ConflictChecker } from './conflict-checker';
import type { RuleProjectionRepo } from '@/modules/teaching/scheduling/rules/rule-projection.repo';

const busy = { teacherLessons: vi.fn(), studentLessons: vi.fn() };
const availability = { bookableSlots: vi.fn(), listTimeOff: vi.fn() };
const projection = { busy: vi.fn() };
const checker = new ConflictChecker(
  busy as unknown as BusyRepo,
  availability as unknown as AvailabilityRepo,
  projection as unknown as RuleProjectionRepo,
);
// Sunday 2026-10-04 17:00–17:45 Riyadh.
const SLOT = { starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') };
const SAME = { starts_at: SLOT.starts_at, ends_at: SLOT.ends_at };
const ALL_SUNDAY = [{ weekday: 0, start_time: '00:00', end_time: '24:00', tz: 'Asia/Riyadh' }];

describe('ConflictChecker (R-SCH-04, issue B3)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    busy.teacherLessons.mockResolvedValue([]);
    busy.studentLessons.mockResolvedValue([]);
    availability.bookableSlots.mockResolvedValue(ALL_SUNDAY);
    availability.listTimeOff.mockResolvedValue([]);
    projection.busy.mockResolvedValue({ teacher: [], students: [] });
  });

  it('nothing proposed → no queries, no conflicts', async () => {
    expect(await checker.check({ teacherId: 't', studentIds: [], proposed: [], excludeIds: [] })).toEqual([]);
    expect(busy.teacherLessons).not.toHaveBeenCalled();
  });

  it('loads busy lessons over the proposed span and reports teacher / student clashes', async () => {
    busy.teacherLessons.mockResolvedValue([{ id: 'a', ...SAME }]);
    busy.studentLessons.mockResolvedValue([{ id: 'b', student_id: 's1', ...SAME }]);
    const res = await checker.check({ teacherId: 't', studentIds: ['s1'], proposed: [SLOT], excludeIds: [] });
    expect(busy.teacherLessons).toHaveBeenCalledWith('t', { from: SLOT.starts_at, to: SLOT.ends_at });
    expect(busy.studentLessons).toHaveBeenCalledWith(['s1'], { from: SLOT.starts_at, to: SLOT.ends_at });
    expect(res.map((c) => [c.kind, c.lessonId])).toEqual([
      ['teacher_busy', 'a'],
      ['student_busy', 'b'],
    ]);
  });

  it('ignores the excluded lessons (the moved one / the rows just generated)', async () => {
    busy.teacherLessons.mockResolvedValue([{ id: 'self', ...SAME }]);
    busy.studentLessons.mockResolvedValue([{ id: 'self', student_id: 's1', ...SAME }]);
    const res = await checker.check({ teacherId: 't', studentIds: ['s1'], proposed: [SLOT], excludeIds: ['self'] });
    expect(res).toEqual([]);
  });

  it('maps time off rows and the weekly grid', async () => {
    availability.bookableSlots.mockResolvedValue([]);
    availability.listTimeOff.mockResolvedValue([
      { starts_at: '2026-10-04T00:00:00Z', ends_at: '2026-10-05T00:00:00Z' },
    ]);
    const res = await checker.check({ teacherId: 't', studentIds: [], proposed: [SLOT], excludeIds: [] });
    expect(res.map((c) => c.kind)).toEqual(['outside_availability', 'time_off']);
  });

  it('counts the occurrences active rules will still generate, minus the excluded rules', async () => {
    projection.busy.mockResolvedValue({ teacher: [{ id: 'rule-2', ...SAME }], students: [] });
    const res = await checker.check({
      teacherId: 't',
      studentIds: ['s1'],
      proposed: [SLOT],
      excludeIds: [],
      excludeRuleIds: ['rule-1'],
    });
    expect(projection.busy).toHaveBeenCalledWith({
      teacherId: 't',
      studentIds: ['s1'],
      span: { from: SLOT.starts_at, to: SLOT.ends_at },
      excludeRuleIds: ['rule-1'],
    });
    expect(res.map((c) => [c.kind, c.lessonId])).toEqual([['teacher_busy', 'rule-2']]);
  });
});
