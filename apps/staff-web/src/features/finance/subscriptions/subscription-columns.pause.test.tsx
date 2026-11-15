import { riyadhToday } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { WEEKLY } from './money-fixture';
import { SubscriptionsPage } from './SubscriptionsPage';

// The packages list's «إيقاف مؤقت» (owner 2026-10-28) is the student's course pause, not a package flag.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({ list: ['courses.pause'] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const PAUSED = { ...WEEKLY, id: 'sub-p', status: 'paused' as const, student: { ...WEEKLY.student, id: 'stu-2', name: 'ياسمين' } };

async function rowOf(name: string) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path.includes('/course-pause/preview')) return { from_date: riyadhToday(), until_date: null, lessons: 0 };
    return path.startsWith('/admin-tasks') ? page([]) : page([WEEKLY, PAUSED]);
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SubscriptionsPage search={{}} onSearch={vi.fn()} onOpenStudent={vi.fn()} />
    </QueryClientProvider>,
  );
  return within((await screen.findByText(name)).closest('tr') as HTMLElement);
}

describe('subscription rows: the course pause', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    perms.list = ['courses.pause'];
  });

  it('«إيقاف مؤقت» opens the course pause sheet for the row’s student', async () => {
    const row = await rowOf(WEEKLY.student.name);
    fireEvent.click(row.getByRole('button', { name: t.coursePause.action }));
    expect(await screen.findByRole('dialog', { name: t.coursePause.title })).toBeTruthy();
    expect(await screen.findByText(t.coursePause.preview.zero)).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^/students/${WEEKLY.student.id}/course-pause/preview`)));
  });

  it('a paused package reads «استئناف» and resumes that package (its pause, or its old package-only pause)', async () => {
    const row = await rowOf('ياسمين');
    fireEvent.click(row.getByRole('button', { name: t.coursePause.resume }));
    const dialog = within(await screen.findByRole('dialog', { name: t.coursePause.resumeTitle }));
    apiSend.mockResolvedValue({ pause: {}, cancelled: 0, left: 0, reopened: 2, conflicts: 0 });
    fireEvent.click(dialog.getByRole('button', { name: t.coursePause.resumeConfirm }));
    expect(await screen.findByText(t.coursePause.resumed)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/stu-2/course-pause/resume', { subscriptionId: 'sub-p' });
    expect(apiSend).not.toHaveBeenCalledWith('PATCH', expect.anything(), expect.anything());
  });

  it('without courses.pause no row offers it', async () => {
    perms.list = [];
    const row = await rowOf('ياسمين');
    expect(row.queryByRole('button', { name: t.coursePause.resume })).toBeNull();
    expect(screen.queryByRole('button', { name: t.coursePause.action })).toBeNull();
  });
});
