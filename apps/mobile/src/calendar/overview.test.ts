import { t } from '@/lib/i18n';
import { formatTimeOff } from '@/more/schedule';
import { ltr } from '@/ui/Ltr';
import { dayCounts, teacherAgendas, type AgendaItem, type TeacherFilter } from './overview';
import { abrar, omar, OVERVIEW, sara } from './overview-fixtures';
import { freeLabel, spanClock, teacherMeta, timeOffLine, windowsLine } from './overview-text';

const ALL: TeacherFilter = { program: 'all', gender: 'all' };
const THU = '2026-10-01';
const SAT = '2026-09-26';
const show = (items: AgendaItem[]) =>
  items.map((i) =>
    i.kind === 'lesson' ? i.lesson.id : i.kind === 'day' ? i.date : `free ${i.span.starts_at}`,
  );

test('a day: every teacher by name, even with nothing booked; lessons and free gaps by time', () => {
  const day = teacherAgendas(OVERVIEW, { start: THU, view: 'day', filter: ALL });
  expect(day.map((a) => a.teacher.display_name_ar)).toEqual(['أبرار', 'سارة', 'عمر']);
  const [a, s, o] = day;
  // The cancelled 16:00 stays hidden; the free gap sits between the held 10:00 and the 16:00.
  expect(show(a?.items ?? [])).toEqual([
    'l-done',
    'free 2026-10-01T07:45:00.000Z',
    'l-pending',
    'l-muscat',
  ]);
  expect(s?.items).toEqual([]);
  expect(s?.timeOff.map((off) => off.id)).toEqual(['off1']);
  // عمر's window and gap run past midnight: clipped to the Riyadh day.
  expect(o?.items).toEqual([
    {
      kind: 'free',
      span: { starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T21:00:00.000Z' },
    },
  ]);
  expect(o?.windows).toEqual([
    { starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T21:00:00.000Z' },
  ]);
});

test('another day keeps the teachers but not Thursday’s lessons, gaps or time off', () => {
  const day = teacherAgendas(OVERVIEW, { start: SAT, view: 'day', filter: ALL });
  expect(day.map((a) => show(a.items))).toEqual([['sat'], [], []]);
  expect(day.every((a) => a.windows.length === 0 && a.timeOff.length === 0)).toBe(true);
});

test('a week: each teacher’s lessons under their Riyadh day, no free gaps', () => {
  const week = teacherAgendas(OVERVIEW, { start: SAT, view: 'week', filter: ALL });
  expect(show(week[0]?.items ?? [])).toEqual([SAT, 'sat', THU, 'l-done', 'l-pending', 'l-muscat']);
  expect(week[2]?.items).toEqual([]);
  expect(week[1]?.timeOff).toHaveLength(1);
});

test('program and gender narrow the teachers; the day pills count only theirs', () => {
  const names = (filter: TeacherFilter) =>
    teacherAgendas(OVERVIEW, { start: THU, view: 'day', filter }).map((a) => a.teacher.id);
  expect(names({ program: 'arabic', gender: 'all' })).toEqual([sara.id]);
  expect(names({ program: 'quran', gender: 'male' })).toEqual([omar.id]);
  expect(names({ program: 'islamic_studies', gender: 'female' })).toEqual([]);
  expect(dayCounts(OVERVIEW, SAT, ALL).map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 3, 0]);
  expect(
    dayCounts(OVERVIEW, SAT, { program: 'arabic', gender: 'all' }).every((d) => d.count === 0),
  ).toBe(true);
});

test('the section words: who, load, the city when not Riyadh; windows, gaps, time off', () => {
  expect(teacherMeta(abrar)).toBe(
    `${t.teachers.genderLabel.female} · ${t.enums.program.quran} · ${t.booking.teacherLoad
      .replace('{n}', '3')
      .replace('{max}', '10')} · ${t.runningHead.cairo}`,
  );
  expect(teacherMeta(omar)).toBe(
    `${t.teachers.genderLabel.male} · ${t.enums.program.quran}${t.teachers.listSeparator}${t.enums.program.islamic_studies} · ${t.booking.teacherStudents.replace('{n}', '0')}`,
  );
  const evening = { starts_at: '2026-10-01T17:00:00.000Z', ends_at: '2026-10-01T21:00:00.000Z' };
  expect(spanClock(evening)).toEqual({ from: '20:00', to: '24:00' });
  expect(windowsLine([evening])).toBe(`متاح ${ltr('20:00 – 24:00')} بتوقيت الرياض`);
  expect(windowsLine([])).toBeNull();
  expect(freeLabel(abrar.free[0] ?? evening)).toBe(`متاح ${ltr('10:45')} – ${ltr('16:00')}`);
  const [off] = sara.time_off;
  if (!off) throw new Error('fixture');
  expect(timeOffLine(off)).toBe(`إجازة · ${formatTimeOff(off)} · سفر`);
  expect(timeOffLine({ ...off, reason: ' ' })).toBe(`إجازة · ${formatTimeOff(off)}`);
});
