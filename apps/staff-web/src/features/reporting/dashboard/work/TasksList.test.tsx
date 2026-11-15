import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { WORK } from '@/features/reporting/dashboard/dashboard-fixture';
import { TasksList } from './TasksList';
import { taskText } from './work-text';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

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
  afterEach(() => apiSend.mockReset());

  it('words each task from ar.json and links the student file', () => {
    renderList();
    const task = WORK.tasks.items[0];
    if (!task) throw new Error('fixture');
    expect(screen.getByText(taskText(task))).toBeTruthy();
    const link = screen.getByRole('link', { name: t.students.openProfile.replace('{name}', 'سهيلة محمد') });
    expect(link.getAttribute('href')).toBe('/admin/students/s1');
  });

  it('«خلصت» closes the task, says so and refreshes the dashboard', async () => {
    apiSend.mockResolvedValue(undefined);
    const { invalidate } = renderList();
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.taskDone }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.dashboard.taskClosed));
    expect(apiSend).toHaveBeenCalledWith('POST', '/admin-tasks/k1/done');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('a failure shows the error toast; no tasks shows the empty line', async () => {
    apiSend.mockRejectedValue(new Error('404'));
    renderList();
    fireEvent.click(screen.getByRole('button', { name: t.dashboard.taskDone }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.common.error));
  });

  it('empty', () => {
    renderList([]);
    expect(screen.getByText(t.dashboard.noTasks)).toBeTruthy();
  });
});
