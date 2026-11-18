import type { PortalLessons } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { kid, lesson, soonLesson } from '@ab/web-kit/portal/portal.fixtures';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { LessonsPanel } from '@ab/web-kit/portal/lessons/LessonsPanel';
import { UpcomingLookContext } from './upcoming-look';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const later = lesson({
  id: 'l2', starts_at: '2099-10-27T16:00:00.000Z', ends_at: '2099-10-27T16:45:00.000Z',
  window: { state: 'early', opens_at: '2099-10-27T15:50:00.000Z', closes_at: '2099-10-27T17:00:00.000Z' },
});
const prepare = {
  homework: 'Surah An-Naba 1-16', next_plan: null, report_id: 'r9',
  lesson_starts_at: '2026-10-20T16:00:00.000Z',
};
const openReport = vi.fn();

function show(answer: PortalLessons, look: { own: boolean } | null = { own: false }) {
  apiFetch.mockResolvedValue(answer);
  const panel = <LessonsPanel student={kid()} />;
  renderPortal(look ? (
    <UpcomingLookContext value={{ ...look, openReport }}>{panel}</UpcomingLookContext>
  ) : panel);
}

afterEach(() => {
  apiFetch.mockReset();
  openReport.mockReset();
});

describe('«القادمة» in the family look', () => {
  it('the next lesson on its own card with the join, the others under «الحلقات القادمة»', async () => {
    show({ lessons: [soonLesson(), later], prepare });
    const next = await screen.findByRole('region', { name: t.portal.nextLesson });
    expect(within(next).getByRole('button', { name: t.portal.join })).toBeTruthy();
    expect(within(next).getByRole('timer')).toBeTruthy();
    expect(within(next).getByText(t.portal.app.lesson.openNow)).toBeTruthy();
    const list = screen.getByRole('region', { name: t.portal.app.lesson.upcoming });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText(t.familyLook.child.upcomingLabel)).toBeTruthy();
  });

  it('«ما المطلوب» says the homework and opens the report it came from', async () => {
    show({ lessons: [later], prepare });
    const card = await screen.findByRole('region', { name: t.portal.prepareTitle });
    expect(within(card).getByText('Surah An-Naba 1-16')).toBeTruthy();
    expect(within(card).queryByText(t.portal.nextPlan)).toBeNull();
    fireEvent.click(within(card).getByRole('button'));
    expect(openReport).toHaveBeenCalledWith('r9');
  });

  it('a student’s own page reads «حلقتك القادمة» and «استعد لحلقتك»', async () => {
    show({ lessons: [soonLesson()], prepare }, { own: true });
    expect(await screen.findByRole('region', { name: t.portal.app.lesson.nextLessonSelf }))
      .toBeTruthy();
    expect(screen.getByRole('region', { name: t.portal.app.lesson.prepareSelf })).toBeTruthy();
  });

  it('no lessons: the empty state, no list', async () => {
    show({ lessons: [] });
    expect(await screen.findByText(t.portal.lessonsEmpty)).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('without the family look (staff pages) every lesson stays in one plain list', async () => {
    show({ lessons: [soonLesson(), later], prepare }, null);
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('region', { name: t.portal.nextLesson })).toBeNull();
  });
});
