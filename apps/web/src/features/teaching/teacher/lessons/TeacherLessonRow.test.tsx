import { PUBLIC_SETTING_DEFAULTS, type LessonView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery } from '@/lib/settings/public-config';
import { TeacherLessonRow } from './TeacherLessonRow';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// 4 Oct 14:00Z, 45 min, on her own Meet link (not platform): the lead is a link when it joins.
const L = lesson({ id: 'l-7', starts_at: '2026-10-04T14:00:00.000Z', platform_classroom: false });
const FILLED = 'bg-primary';

function row(at: string, over: LessonView = L, onOpen = vi.fn()) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(at));
  const client = new QueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {} });
  render(
    <QueryClientProvider client={client}>
      <ul>
        <TeacherLessonRow lesson={over} tz="Africa/Cairo" onOpen={onOpen} onDone={vi.fn()} />
      </ul>
    </QueryClientProvider>,
  );
  return within(screen.getByRole('listitem'));
}

// docs/48: exactly one lead per state, secondary on a row except a live join.
describe('TeacherLessonRow', () => {
  afterEach(() => vi.useRealTimers());

  it('before the window: «سأحضر», secondary', () => {
    const li = row('2026-10-04T10:00:00.000Z');
    expect(li.getByRole('button', { name: t.teacherBoard.confirm }).className).not.toContain(FILLED);
    expect(li.queryByRole('link')).toBeNull();
  });

  it('in the window before ends_at: «ادخل الحلقة», filled', () => {
    const li = row('2026-10-04T14:10:00.000Z');
    const join = li.getByRole('link', { name: t.teacherDash.join });
    expect(join.className).toContain(FILLED);
    expect(li.queryByRole('link', { name: t.reports.open })).toBeNull();
  });

  it('after ends_at, the window still open: «اكتب التقرير» leads; the join waits in the drawer', () => {
    const li = row('2026-10-04T15:00:00.000Z');
    expect(li.getByRole('link', { name: t.reports.open })).toBeTruthy();
    expect(li.queryByRole('link', { name: t.teacherDash.join })).toBeNull();
  });

  it('a sent report: no lead', () => {
    const report = { id: 'r', status: 'submitted' as const, sent_at: '2026-10-04T14:50:00.000Z' };
    const li = row('2026-10-04T15:00:00.000Z', { ...L, students: [{ ...SUHAILA, report }] });
    expect(li.getAllByRole('button')).toHaveLength(1);
    expect(li.queryByRole('link')).toBeNull();
  });

  it('the row opens the drawer, labelled by its names', () => {
    const onOpen = vi.fn();
    const li = row('2026-10-04T10:00:00.000Z', L, onOpen);
    const name = t.lessons.sheet.openRow.replace('{names}', SUHAILA.name);
    fireEvent.click(li.getByRole('button', { name }));
    expect(onOpen).toHaveBeenCalledWith('l-7');
  });
});
