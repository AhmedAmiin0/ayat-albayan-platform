import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { pageOf, recordingView } from './recordings-fixture';
import { StudentRecordings } from './StudentRecordings';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const R = t.studentRecordings;

function renderList(role: 'admin' | 'teacher', row = recordingView()) {
  apiFetch.mockImplementation(async (path: string) => (path.includes('/recordings') ? pageOf([row]) : []));
  apiSend.mockResolvedValue({});
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentRecordings studentId="s-1" role={role} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('visible-to-student toggle', () => {
  it('the lesson’s teacher (or an admin) turns it on: PATCH, then the list is asked again', async () => {
    renderList('teacher');
    const box = await screen.findByRole('checkbox', { name: R.visible.label });
    expect((box as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(R.visible.off)).toBeTruthy();
    fireEvent.click(box);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/recordings/rec-1/visibility', { visible: true }));
    await waitFor(() => expect(apiFetch.mock.calls.filter(([p]) => String(p).includes('/recordings')).length).toBeGreaterThan(1));
  });

  it('a group lesson’s recording is refused with its own explanation', async () => {
    renderList('admin');
    apiSend.mockRejectedValue(new ApiError(409, { code: 'recording_group_lesson' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: R.visible.label }));
    expect(await screen.findByText(R.visible.groupLesson)).toBeTruthy();
  });

  it('someone who may not manage it only reads the state', async () => {
    renderList('teacher', recordingView({ can_manage: false, visible_to_student: true }));
    const box = (await screen.findByRole('checkbox', { name: R.visible.label })) as HTMLInputElement;
    expect([box.checked, box.disabled]).toEqual([true, true]);
    expect(screen.getByText(R.visible.on)).toBeTruthy();
  });
});

describe('admin-only delete', () => {
  it('a teacher does not see «حذف التسجيل»', async () => {
    renderList('teacher');
    await screen.findByText(R.status.done);
    expect(screen.queryByRole('button', { name: R.delete.action })).toBeNull();
  });

  it('an admin confirms first; only then DELETE is sent', async () => {
    renderList('admin');
    fireEvent.click(await screen.findByRole('button', { name: R.delete.action }));
    expect(await screen.findByText(R.delete.body)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: R.delete.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', '/recordings/rec-1'));
  });

  it('cancel sends nothing; a deleted or running row has no delete button', async () => {
    renderList('admin');
    fireEvent.click(await screen.findByRole('button', { name: R.delete.action }));
    fireEvent.click(await screen.findByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
  });
});
