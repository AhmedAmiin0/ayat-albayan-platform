import type { TeacherStudentView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TeacherStudents } from './TeacherStudents';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const s = (over: Partial<TeacherStudentView>): TeacherStudentView => ({
  ...{ id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'active', program: 'quran', level: 'جزء عمّ', age: 9 },
  ...{ next_lesson_at: '2026-10-05T14:00:00.000Z' },
  ...over,
});
const SUBSCRIBED = [s({}), s({ id: 's2', name: 'يوسف', code: 'AB-0190', level: null, age: null, next_lesson_at: null })];
const TRIAL = [s({ id: 's3', name: 'بلال', code: 'AB-0201', status: 'trial' })];

function open() {
  apiFetch.mockImplementation(async (path: string) => (path.endsWith('kind=trial') ? TRIAL : SUBSCRIBED));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TeacherStudents />
    </QueryClientProvider>,
  );
}

describe('TeacherStudents «الطلاب» (teacher)', () => {
  afterEach(() => apiFetch.mockReset());

  it('opens on «مشتركون» with only subscribed students, each name linking to the report history', async () => {
    open();
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=subscribed');
    expect(screen.queryByText('بلال')).toBeNull();
    expect(screen.getByRole('link', { name: 'سهيلة' }).getAttribute('href')).toBe('/teacher/reports/s1');
    expect(screen.getByText(/AB-0183/)).toBeTruthy();
    expect(screen.getByText(/جزء عمّ/)).toBeTruthy();
    expect(screen.getByText(t.teacherStudents.noNextLesson)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\+\d{8}/);
  });

  it('is an accessible tablist; «تجريبي» swaps the list, never mixing the two', async () => {
    open();
    await screen.findByText('سهيلة');
    const tabs = screen.getAllByRole('tab');
    expect(screen.getByRole('tablist', { name: t.teacherStudents.kinds })).toBeTruthy();
    expect(tabs.map((x) => [x.textContent, x.getAttribute('aria-selected')])).toEqual([
      [t.teacherStudents.subscribed, 'true'],
      [t.teacherStudents.trial, 'false'],
    ]);
    fireEvent.click(tabs[1] as HTMLElement);
    expect(await screen.findByText('بلال')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/students?kind=trial');
    expect(screen.queryByText('سهيلة')).toBeNull();
    expect(screen.getByRole('tabpanel', { name: t.teacherStudents.trial })).toBeTruthy();
  });

  it('a package-ended student stays in «مشتركون» with its «بانتظار التجديد» / «انتهى الاشتراك» chip; active ones carry none', async () => {
    apiFetch.mockResolvedValue([s({}), s({ id: 's4', name: 'مريم', status: 'pending_renewal' }), s({ id: 's5', name: 'هند', status: 'expired' })]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherStudents />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('مريم')).toBeTruthy();
    expect(screen.getAllByText(t.enums.studentStatus.pending_renewal)).toHaveLength(1);
    expect(screen.getAllByText(t.enums.studentStatus.expired)).toHaveLength(1);
    expect(screen.queryByText(t.enums.studentStatus.active)).toBeNull();
  });

  it('says so when a kind is empty', async () => {
    apiFetch.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeacherStudents />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(t.teacherStudents.emptySubscribed)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('tab')[1] as HTMLElement);
    expect(await screen.findByText(t.teacherStudents.emptyTrial)).toBeTruthy();
  });

  it('shows an error with a retry that refetches', async () => {
    apiFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(SUBSCRIBED);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TeacherStudents />
      </QueryClientProvider>,
    );
    expect((await screen.findByRole('alert')).textContent).toContain(t.teacherStudents.loadFailed);
    fireEvent.click(screen.getByRole('button', { name: t.teacherStudents.retry }));
    await waitFor(() => expect(screen.getByText('سهيلة')).toBeTruthy());
  });
});
