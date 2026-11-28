import { riyadhToday } from '@ab/time';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { coursePauseResultFixture } from '@ab/shared/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { WEEKLY } from './money-fixture';
import { SubscriptionsPage } from './SubscriptionsPage';
import { mockCall } from '@ab/testing/mock-call';

// The pause is the student's course pause, not a package flag.

const mockApi = mockCall();
const perms = vi.hoisted(() => ({ list: ['courses.pause'] }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@/features/people/auth', async (orig) => ({
  ...(await orig<object>()),
  usePermissions: () => ({ permissions: perms.list, can: (p: string) => perms.list.includes(p) }),
}));

const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });
const PAUSED = {
  ...WEEKLY,
  id: 'sub-p',
  status: 'paused' as const,
  student: { ...WEEKLY.student, id: 'stu-2', name: 'ياسمين' },
};

async function rowOf(name: string) {
  mockApi.onRead(async ({ path }) => {
    if (path.includes('/course-pause/preview'))
      return { from_date: riyadhToday(), until_date: null, lessons: 0 };
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
    mockApi.reset('read');
    mockApi.reset('write');
    perms.list = ['courses.pause'];
  });

  it('«إيقاف مؤقت» opens the course pause sheet for the row’s student', async () => {
    const row = await rowOf(WEEKLY.student.name);
    fireEvent.click(row.getByRole('button', { name: t.coursePause.action }));
    expect(await screen.findByRole('dialog', { name: t.coursePause.title })).toBeTruthy();
    expect(await screen.findByText(t.coursePause.preview.zero)).toBeTruthy();
    expect(mockApi.reads()).toContainEqual({
      method: 'GET',
      path: expect.stringMatching(
        new RegExp(`^/students/${WEEKLY.student.id}/course-pause/preview`),
      ),
    });
  });

  it('a paused package reads «استئناف» and resumes that package (its pause, or its old package-only pause)', async () => {
    const row = await rowOf('ياسمين');
    fireEvent.click(row.getByRole('button', { name: t.coursePause.resume }));
    const dialog = within(await screen.findByRole('dialog', { name: t.coursePause.resumeTitle }));
    mockApi.onWrite(() => coursePauseResultFixture({ reopened: 2 }));
    fireEvent.click(dialog.getByRole('button', { name: t.coursePause.resumeConfirm }));
    expect(await screen.findByText(t.coursePause.resumed)).toBeTruthy();
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/students/stu-2/course-pause/resume',
      body: {
        subscriptionId: 'sub-p',
      },
    });
    expect(mockApi.writes()).not.toContainEqual({
      method: 'PATCH',
      path: expect.anything(),
      body: expect.anything(),
    });
  });

  it('without courses.pause no row offers it', async () => {
    perms.list = [];
    const row = await rowOf('ياسمين');
    expect(row.queryByRole('button', { name: t.coursePause.resume })).toBeNull();
    expect(screen.queryByRole('button', { name: t.coursePause.action })).toBeNull();
  });
});
