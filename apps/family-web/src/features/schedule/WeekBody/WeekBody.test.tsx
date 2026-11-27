import { setViewerPersonTz } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { kid, lesson, portalApi } from '@ab/web-kit/testing';
import { useWeek } from '@/features/schedule/use-week';
import { renderAt } from '@/test/render-at';
import { WeekBody } from './WeekBody';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const S = t.portal.app.schedule;
const NOW = new Date('2026-11-11T09:00:00.000Z');
const TODAY = lesson({
  id: 'l1',
  starts_at: '2026-11-11T09:05:00.000Z',
  ends_at: '2026-11-11T09:35:00.000Z',
  window: {
    state: 'open',
    opens_at: '2026-11-11T08:55:00.000Z',
    closes_at: '2026-11-11T09:50:00.000Z',
  },
});

function Harness({ guardian }: { guardian: boolean }) {
  const week = useWeek(kid());
  return <WeekBody week={week} days={week.days} guardian={guardian} />;
}

const answer = (lessons: PortalLesson[]) =>
  apiFetch.mockImplementation(portalApi({ lessons: { lessons } }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  setViewerPersonTz('Asia/Riyadh');
  apiFetch.mockReset();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  setViewerPersonTz(null);
  vi.useRealTimers();
});

describe('WeekBody', () => {
  it('the strip of seven days above an empty week', async () => {
    answer([]);
    renderAt(<Harness guardian />);
    expect(await screen.findByText(S.empty)).toBeTruthy();
    const days = within(screen.getByRole('group', { name: S.days })).getAllByRole('button');
    expect(days).toHaveLength(7);
  });

  it('a week with lessons: the day with its lesson and the summary', async () => {
    answer([TODAY]);
    renderAt(<Harness guardian={false} />);
    expect(await screen.findAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(S.empty)).toBeNull();
    expect(document.querySelectorAll('section[id^="schedule-day-"]')).toHaveLength(1);
  });
});
