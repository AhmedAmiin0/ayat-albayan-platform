import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { allDayRows } from '../../../people/teachers/availability/free-slots';
import { fakeDb } from '../../../people/guardians/fake-db';
import { LessonsSettings } from '../lessons.settings';
import { teacherSpans } from './free-windows';
import { OverviewQueries } from './overview.queries';

const WINDOW = { from: new Date('2026-10-03T21:00:00Z'), to: new Date('2026-10-10T21:00:00Z') };
const SAVED = { teacher_id: 'A', weekday: 0, start_time: '16:00:00', end_time: '18:00:00', tz: 'Asia/Riyadh' };
const setup = (on: boolean) => {
  const f = fakeDb({ teachers: [{ data: [{ id: 'A' }, { id: 'B' }] }], teacher_availability: [{ data: [SAVED] }] });
  return { ...f, q: new OverviewQueries(f.db, readerOf(LessonsSettings, { teachers_always_available: on })) };
};

describe('OverviewQueries.slots — the calendar matches what booking accepts', () => {
  it('24/7 on: every teacher gets the all-day rows; the saved grid is not read', async () => {
    const { q, calls } = setup(true);
    const rows = await q.slots(WINDOW);
    expect(rows).toEqual(['A', 'B'].flatMap((id) => allDayRows('Asia/Riyadh').map((r) => ({ ...r, teacher_id: id }))));
    expect(calls.filter((c) => c.table === 'teacher_availability')).toEqual([]);
  });

  it('24/7 on with one teacher asked for: only that teacher', async () => {
    const { q, argsOf } = setup(true);
    await q.slots({ ...WINDOW, teacherId: 'A' });
    expect(argsOf('teachers', 'eq')).toEqual(['id', 'A']);
  });

  it('24/7 off: the saved weekly rows', async () => {
    const { q } = setup(false);
    expect(await q.slots(WINDOW)).toEqual([SAVED]);
  });

  it('all-day rows give a window over the whole week, free = window minus the lessons', () => {
    const lesson = { start: new Date('2026-10-04T13:00:00Z'), end: new Date('2026-10-04T13:45:00Z') };
    const spans = teacherSpans({ ...WINDOW, weekly: allDayRows('Asia/Riyadh'), timeOff: [], busy: [lesson] });
    const [from, to] = [WINDOW.from.getTime(), WINDOW.to.getTime()];
    expect(spans.windows).toEqual([{ start: from, end: to }]);
    expect(spans.free).toEqual([
      { start: from, end: lesson.start.getTime() },
      { start: lesson.end.getTime(), end: to },
    ]);
  });
});
