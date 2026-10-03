import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { AdminSessions } from './AdminSessions';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const iso = (min: number) => new Date(Date.now() + min * 60_000).toISOString();
const lesson = (id: string, start: number, status = 'confirmed') => ({
  id, status, starts_at: iso(start), ends_at: iso(start + 45), meeting_link: null,
  teacher: { id: 't1', display_name_ar: 'أبرار', tz: 'Asia/Riyadh' },
  students: [{ id: 's1', code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh' }],
});

function open(rows: unknown[]) {
  apiFetch.mockImplementation(async (path: string) => (path.startsWith('/lessons?') ? rows : []));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminSessions />
    </QueryClientProvider>,
  );
}

describe('AdminSessions (/admin/classrooms)', () => {
  afterEach(() => apiFetch.mockReset());

  it("lists every teacher's lessons of the day with teacher, students and «ادخل الحلقة»", async () => {
    open([lesson('l-open', 5), lesson('l-later', 400)]);
    expect(await screen.findAllByText(/أبرار/)).not.toHaveLength(0);
    expect(screen.getAllByText(/سهيلة/).length).toBeGreaterThan(0);
    const url = apiFetch.mock.calls.find(([p]) => String(p).startsWith('/lessons?'))?.[0] as string;
    expect(url).toMatch(/^\/lessons\?from=.+&to=.+/);
    expect(screen.getByRole('link', { name: t.classroom.enter }).getAttribute('href')).toBe('/classroom/l-open');
  });

  it('hides cancelled lessons and says when the day is empty', async () => {
    open([lesson('l-x', 5, 'cancelled_by_admin')]);
    expect(await screen.findByText(t.classroom.admin.empty)).toBeTruthy();
  });

  it('moves a day with the arrows and comes back with «النهارده»', async () => {
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
