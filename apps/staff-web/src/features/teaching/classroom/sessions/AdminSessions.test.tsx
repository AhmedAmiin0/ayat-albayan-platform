import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { intlLocale } from '@ab/core';
import type { LessonStatus } from '@ab/catalog';
import { allowedLessonEvents, type LessonView } from '@ab/schedule';
import { t, locale } from '@ab/web-kit';
import { AdminSessions } from './AdminSessions';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const iso = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const ID = {
  open: '00000000-0000-4000-8000-000000000001',
  later: '00000000-0000-4000-8000-000000000002',
  x: '00000000-0000-4000-8000-000000000003',
};
const lesson = (id: string, start: number, status: LessonStatus = 'confirmed'): LessonView => ({
  id, rule_id: null, status, starts_at: iso(start), ends_at: iso(start + 45), meeting_link: null,
  cancel_reason: null, override_reason: null, confirmed_at: null, rescheduled_from_id: null,
  teacher: { id: '00000000-0000-4000-8000-0000000000a1', display_name_ar: 'أبرار', tz: 'Asia/Riyadh' },
  students: [{
    id: '00000000-0000-4000-8000-0000000000b1', code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh',
    attendance: null, chargeable: true, seq: null,
  }],
  allowed_events: allowedLessonEvents(status), conflicts: [], pending_proposal: null,
});

const noRetry = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function open(rows: unknown[]) {
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/lessons?') ? rows : []));
  render(
    <QueryClientProvider client={noRetry()}>
      <AdminSessions />
    </QueryClientProvider>,
  );
}

describe('AdminSessions (/admin/classrooms)', () => {
  afterEach(() => apiFetch.mockReset());

  it("lists every teacher's lessons of the day with teacher, students and «ادخل الحلقة»", async () => {
    open([lesson(ID.open, 5), lesson(ID.later, 400)]);
    expect(await screen.findAllByText(/أبرار/)).not.toHaveLength(0);
    expect(screen.getAllByText(/سهيلة/).length).toBeGreaterThan(0);
    const url = apiFetch.mock.calls.find(([p]) => String(p).startsWith('/lessons?'))?.[0] as string;
    expect(url).toMatch(/^\/lessons\?from=.+&to=.+/);
    expect(screen.getByRole('link', { name: t.classroom.enter }).getAttribute('href')).toBe(`/classroom/${ID.open}`);
  });

  it('an answer that is not a lesson list shows the error', async () => {
    open([{ id: 'l-open' }]);
    expect(await screen.findByText(t.common.error)).toBeTruthy();
  });

  it('names the day as before: «الخميس، 29 أكتوبر» in the browser zone', async () => {
    open([]);
    await screen.findByText(t.classroom.admin.empty);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const old = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' });
    expect(screen.getByText(old.format(start))).toBeTruthy();
  });

  it('hides cancelled lessons and says when the day is empty', async () => {
    open([lesson(ID.x, 5, 'cancelled_by_admin')]);
    expect(await screen.findByText(t.classroom.admin.empty)).toBeTruthy();
  });

  it('moves a day with the arrows and comes back with «اليوم»', async () => {
    open([]);
    await screen.findByText(t.classroom.admin.empty);
    const today = screen.getByRole('button', { name: t.schedule.today });
    expect(today).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: t.schedule.nextDay }));
    expect(today).toHaveProperty('disabled', false);
    fireEvent.click(today);
    expect(today).toHaveProperty('disabled', true);
  });
});

describe('AdminSessions groups and cards', () => {
  afterEach(() => apiFetch.mockReset());

  it('groups the day into «الآن», «قادمة» and «انتهت», each saying when it is empty', async () => {
    open([lesson(ID.open, 5), lesson(ID.later, 400)]);
    const now = await screen.findByRole('region', { name: new RegExp(`^${t.classroom.admin.groups.now}`) });
    expect(now.textContent).toContain('سهيلة');
    expect(now.textContent).toContain(t.classroom.admin.live);
    const ended = screen.getByRole('region', { name: new RegExp(`^${t.classroom.admin.groups.ended}`) });
    expect(ended.textContent).toContain(t.classroom.admin.groupEmpty.ended);
    const upcoming = screen.getByRole('region', { name: new RegExp(`^${t.classroom.admin.groups.upcoming}`) });
    expect(upcoming.textContent).toContain(t.enums.lessonStatus.confirmed);
  });

  it('folds the link actions behind «خيارات أخرى» on phones; the header keeps a slot for more actions', async () => {
    apiFetch.mockImplementation(async (path: string) => (path.startsWith('/lessons?') ? [lesson(ID.open, 5)] : []));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminSessions actions={<button type="button">إجراء إضافي</button>} />
      </QueryClientProvider>,
    );
    const more = await screen.findByRole('button', { name: t.classroom.admin.more });
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: t.classroom.copyLink }).closest('.max-sm\\:hidden')).toBeTruthy();
    fireEvent.click(more);
    expect(screen.getByRole('button', { name: t.classroom.copyLink }).closest('.max-sm\\:hidden')).toBeNull();
    expect(screen.getByRole('button', { name: 'إجراء إضافي' }).closest('[data-slot=header-actions]')).toBeTruthy();
  });
});
