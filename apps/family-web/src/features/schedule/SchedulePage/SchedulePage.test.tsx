import { setViewerPersonTz } from '@ab/client-core';
import type { PortalLesson } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { portalApi, kid, lesson } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { SchedulePage } from './SchedulePage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const S = t.portal.app.schedule;
// Wednesday 2026-11-11, 12:00 in Riyadh: the academy week runs Sat 7 → Fri 13.
const NOW = new Date('2026-11-11T09:00:00.000Z');

const LESSONS: PortalLesson[] = [
  lesson({
    id: 'l1', starts_at: '2026-11-11T09:05:00.000Z', ends_at: '2026-11-11T09:35:00.000Z',
    window: {
      state: 'open', opens_at: '2026-11-11T08:55:00.000Z', closes_at: '2026-11-11T09:50:00.000Z',
    },
  }),
  lesson({
    id: 'l2', starts_at: '2026-11-13T10:00:00.000Z', ends_at: '2026-11-13T10:45:00.000Z',
    status: 'scheduled', teacher: { display_name_ar: 'مريم', display_name_en: null },
    family: { counts: false, group: false, request: null },
    window: {
      state: 'early', opens_at: '2026-11-13T09:50:00.000Z', closes_at: '2026-11-13T11:00:00.000Z',
    },
  }),
];

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  setViewerPersonTz('Asia/Riyadh');
  apiFetch.mockReset();
  apiFetch.mockImplementation(portalApi({ lessons: { lessons: LESSONS } }));
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  setViewerPersonTz(null);
  vi.useRealTimers();
});

const strip = () => within(screen.getByRole('group', { name: S.days })).getAllByRole('button');
const agendaDays = () => document.querySelectorAll('section[id^="schedule-day-"]');

describe('«الجدول» as an agenda (owner 2026-11-19)', () => {
  it('a strip of the seven days, today marked, the days without lessons off', async () => {
    renderAt(<SchedulePage student={kid()} kind="guardian" />);
    expect(await screen.findAllByRole('listitem')).toHaveLength(2);
    const days = strip();
    expect(days).toHaveLength(7);
    expect(days[4]?.getAttribute('aria-current')).toBe('date');
    expect(days.filter((d) => d.getAttribute('aria-current'))).toHaveLength(1);
    expect(days.map((d) => (d as HTMLButtonElement).disabled)).toEqual([
      true, true, true, true, false, true, false,
    ]);
    expect(screen.getByRole('heading', { name: S.title })).toBeTruthy();
  });

  it('only the days with lessons in the agenda, today named', async () => {
    renderAt(<SchedulePage student={kid()} kind="guardian" />);
    await screen.findAllByRole('listitem');
    expect(agendaDays()).toHaveLength(2);
    expect(agendaDays()[0]?.textContent).toContain(S.today.replace('{day}', ''));
    expect(screen.getByText(t.portal.app.lesson.openNow)).toBeTruthy();
  });

  it('a guardian answers for a lesson and sees what awaits him', async () => {
    renderAt(<SchedulePage student={kid()} kind="guardian" />);
    expect(await screen.findByRole('button', { name: t.portal.actions.confirm })).toBeTruthy();
    const summary = screen.getByRole('region', { name: S.summary });
    expect(summary.textContent).toContain(S.awaiting);
    expect(within(summary).getByText(S.lessons).nextElementSibling?.textContent).toBe('2');
    expect(within(summary).getByText(S.awaiting).nextElementSibling?.textContent).toBe('1');
    expect(summary.textContent).toContain('مريم');
  });

  it('a student reads the week: «جدولي», no options, nothing awaiting', async () => {
    renderAt(<SchedulePage student={kid()} kind="student" />);
    await screen.findAllByRole('listitem');
    expect(screen.getByRole('heading', { name: S.mine })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.portal.actions.confirm })).toBeNull();
    expect(screen.getByRole('region', { name: S.summary }).textContent).not.toContain(S.awaiting);
  });

  it('a tap on a day jumps to it in the agenda and marks it chosen', async () => {
    renderAt(<SchedulePage student={kid()} kind="guardian" />);
    await screen.findAllByRole('listitem');
    const friday = strip()[6];
    if (!friday) throw new Error('no Friday');
    fireEvent.click(friday);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(scrollIntoView.mock.contexts[0]).toBe(agendaDays()[1]);
    expect(friday.getAttribute('aria-pressed')).toBe('true');
  });

  it('the empty week', async () => {
    apiFetch.mockImplementation(portalApi({ lessons: { lessons: [] } }));
    renderAt(<SchedulePage student={kid()} kind="student" />);
    expect(await screen.findByText(S.empty)).toBeTruthy();
    expect(strip().every((d) => (d as HTMLButtonElement).disabled)).toBe(true);
  });
});
