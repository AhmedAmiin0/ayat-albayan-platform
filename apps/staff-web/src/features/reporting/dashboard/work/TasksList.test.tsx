import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { WORK } from '@/features/reporting/dashboard/dashboard-fixture';
import { TasksList } from './TasksList';
import { taskText } from './work-text';
import { dashboardKeys } from '@/features/reporting/keys';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

function renderList(items = WORK.tasks.items) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <TasksList items={items} />
    </QueryClientProvider>,
  );
  return { invalidate };
}

describe('TasksList (R-SUB-02 admin tasks)', () => {
  afterEach(() => mockApi.reset('write'));

  it('words each task from ar.json and links the student file', () => {
    renderList();
    const task = WORK.tasks.items[0];
    if (!task) throw new Error('fixture');
    expect(screen.getByText(taskText(task))).toBeTruthy();
    const link = screen.getByRole('link', {
      name: t.students.openProfile.replace('{name}', 'سهيلة محمد'),
    });
    expect(link.getAttribute('href')).toBe('/admin/students/s1');
  });

  it('«خلصت» closes the task, says so and refreshes the dashboard', async () => {
    const { balance: _balance, ...done } = WORK.tasks.items[0] ?? {};
    mockApi.onWrite(() => ({ ...done, done_at: '2026-10-03T09:00:00Z' }));
    const { invalidate } = renderList();
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.taskDone }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(t.dashboard.taskClosed),
    );
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/admin-tasks/k1/done',
      body: undefined,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
  });

  it('a failure shows the error toast; no tasks shows the empty line', async () => {
    mockApi.onWrite(() => Promise.reject(new Error('404')));
    renderList();
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.taskDone }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.common.error));
  });

  it('empty', () => {
    renderList([]);
    expect(screen.getByText(t.dashboard.noTasks)).toBeTruthy();
  });
});
