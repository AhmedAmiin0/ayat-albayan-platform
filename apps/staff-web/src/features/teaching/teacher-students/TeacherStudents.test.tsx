import type { TeacherMe } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { TeacherStudents } from './TeacherStudents';

vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const ME: TeacherMe = {
  id: 't-abrar', display_name_ar: 'أبرار', gender: 'female', programs: ['quran'],
  tz: 'Africa/Cairo', meeting_link: null, meeting_mode: null, platform_classroom: false,
  students: [{ id: 's1', code: 'AB-0183', name: 'سهيلة', tz: 'Asia/Riyadh', status: 'active' }],
};
const answer = (path: string): unknown => (path === '/teachers/me' ? ME : []);

function open() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TeacherStudents />
    </QueryClientProvider>,
  );
}

const calls = (prefix: string) =>
  apiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

describe('TeacherStudents «الطلاب» (docs/48 thin page)', () => {
  afterEach(() => apiFetch.mockReset());

  it('the cartouche, then the board «طلابي» with each name opening the student file', async () => {
    apiFetch.mockImplementation(async (p: string) => answer(p));
    open();
    expect(screen.getByText(t.teacherStudents.title)).toBeTruthy();
    const table = await screen.findByRole('table', { name: t.teacherBoard.tab });
    const link = table.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/teacher/students/s1');
    expect(calls('/teachers/me/lessons?')).toBe(1);
    expect(apiFetch.mock.calls.filter(([p]) => p === '/teachers/me')).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/\+\d{8}/);
  });

  it('a login with no teachers row is told so, with no retry', async () => {
    const notLinked = new ApiError(404, { code: 'teacher_not_linked', message: 'x' });
    apiFetch.mockRejectedValue(notLinked);
    open();
    expect((await screen.findByRole('alert')).textContent).toContain(t.teacherDash.notLinked);
    expect(screen.queryByRole('button', { name: t.teacherStudents.retry })).toBeNull();
  });

  it('any other error offers a retry that refetches', async () => {
    apiFetch.mockRejectedValueOnce(new Error('boom')).mockImplementation(async (p: string) => answer(p));
    open();
    expect((await screen.findByRole('alert')).textContent).toContain(t.teacherDash.loadError);
    fireEvent.click(screen.getByRole('button', { name: t.teacherStudents.retry }));
    await waitFor(() => expect(screen.getByRole('table', { name: t.teacherBoard.tab })).toBeTruthy());
  });

  it('a lessons error with nothing cached offers a retry too', async () => {
    apiFetch.mockImplementation(async (p: string) => {
      if (p.startsWith('/teachers/me/lessons')) throw new Error('down');
      return answer(p);
    });
    open();
    expect((await screen.findByRole('alert')).textContent).toContain(t.teacherDash.loadError);
    expect(screen.getByRole('button', { name: t.teacherStudents.retry })).toBeTruthy();
  });
});
