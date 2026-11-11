import { lessonWhenAt, type TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { TeacherBoard } from './TeacherBoard';

vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(() => Promise.resolve([])),
  apiSend: vi.fn(),
}));

const TZ = 'Africa/Cairo';
const kid = (id: string, name: string, status: TeacherMe['students'][number]['status']) => ({
  id, code: `AB-${id}`, name, tz: TZ, status,
});
const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: TZ,
  meeting_link: null, meeting_mode: null, platform_classroom: false,
  students: [kid('s-1', 'سهيلة', 'active'), kid('s-2', 'جود', 'trial'), kid('s-3', 'ريم', 'paused')],
};
const NOW = new Date('2026-10-05T12:00:00.000Z');
const REPORT = { id: 'r-a', status: 'submitted' as const };
const PAST = lesson({ id: 'a', starts_at: '2026-10-01T13:00:00.000Z', status: 'completed', students: [{ ...SUHAILA, attendance: 'on_time', report: REPORT }] });
const MISSED = lesson({ id: 'b', starts_at: '2026-10-03T13:00:00.000Z', status: 'no_show' });
const NEXT = lesson({ id: 'c', starts_at: '2026-10-07T13:00:00.000Z' });
const when = (iso: string) => lessonWhenAt(new Date(iso), { tz: TZ, locale: 'ar', cycle: '24' });

function renderBoard(me: TeacherMe = ME) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherBoard me={me} lessons={[PAST, MISSED, NEXT]} now={NOW} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

const rowOf = (name: string) => {
  const row = screen.getByRole('button', { name }).closest('tr');
  if (!row) throw new Error(`no row for ${name}`);
  return row;
};

describe('TeacherBoard «طلابي» (docs/46 C1)', () => {
  it('one row per current student with her lessons grouped from the one window', () => {
    renderBoard();
    const row = rowOf('سهيلة');
    expect(within(row).getByText('AB-s-1')).toBeTruthy();
    expect(within(row).getByText(t.enums.studentStatus.active)).toBeTruthy();
    expect(within(row).getByText(when(MISSED.starts_at))).toBeTruthy();
    expect(within(row).getByText(t.sales.student.kind.absent)).toBeTruthy();
    expect(within(row).getByText(when(NEXT.starts_at))).toBeTruthy();
    expect(within(row).getByText(t.enums.reportStatus.submitted)).toBeTruthy();
    expect(within(row).getByText('حضر 1 · غاب 1')).toBeTruthy();
    expect(within(row).getByText(t.teacherBoard.rate.replace('{rate}', '50'))).toBeTruthy();
    // Paused students are not current (D4).
    expect(screen.queryByRole('button', { name: 'ريم' })).toBeNull();
  });

  it('a student without lessons reads «لا يوجد» and «لا تقرير بعد»', () => {
    renderBoard();
    const row = rowOf('جود');
    expect(within(row).getAllByText(t.teacherBoard.none)).toHaveLength(2);
    expect(within(row).getByText(t.teacherBoard.noReport)).toBeTruthy();
  });

  it('«مشترك · تجريبي · الكل» with counts filters the rows', () => {
    renderBoard();
    const kinds = screen.getByRole('group', { name: t.teacherBoard.kinds });
    expect(within(kinds).getByRole('button', { name: new RegExp(`${t.studentLists.all}\\s*2`) })).toBeTruthy();
    fireEvent.click(within(kinds).getByRole('button', { name: new RegExp(`${t.studentLists.trial}\\s*1`) }));
    expect(screen.queryByRole('button', { name: 'سهيلة' })).toBeNull();
    expect(screen.getByRole('button', { name: 'جود' })).toBeTruthy();
  });

  it('no current students: says so', () => {
    renderBoard({ ...ME, students: [kid('s-3', 'ريم', 'churned')] });
    expect(screen.getByText(t.teacherBoard.noStudents)).toBeTruthy();
  });
});
