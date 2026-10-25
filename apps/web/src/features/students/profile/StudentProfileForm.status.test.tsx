import { QueryClient, QueryClientProvider, queryOptions } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { StudentProfileForm } from './StudentProfileForm';
import type { StudentProfile } from '../types';

const api = vi.hoisted(() => ({ updateStudent: vi.fn(), fetchStudent: vi.fn() }));
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateStudent: api.updateStudent,
  teacherOptionsQuery: queryOptions({ queryKey: ['teacher-options-test'], queryFn: async () => [] }),
  studentQuery: (id: string) => queryOptions({ queryKey: ['students', id], queryFn: api.fetchStudent }),
}));

const STUDENT = {
  id: 's1', name: 'سهيلة', program: 'quran', status: 'trial', teacher_id: null, tz: 'Asia/Riyadh',
  level: null, memorized: null, goal: null, riwaya: null, meeting_link_override: null, notes: null,
} as StudentProfile;

const statusSelect = () => screen.getByLabelText<HTMLSelectElement>(t.students.status);
const save = () => fireEvent.click(screen.getByRole('button', { name: t.common.save }));
const sentPatch = (call = 0): Record<string, unknown> => api.updateStudent.mock.calls[call]?.[1] as Record<string, unknown>;

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StudentProfileForm student={STUDENT} />
    </QueryClientProvider>,
  );
}

describe('StudentProfileForm status safety (R-STU-05)', () => {
  beforeEach(() => {
    api.updateStudent.mockReset();
    api.fetchStudent.mockReset();
  });

  it('an untouched status is not sent: a stale form never undoes an automatic move', async () => {
    api.updateStudent.mockResolvedValue({ ...STUDENT, status: 'active', level: 'جزء عم' });
    renderForm();
    fireEvent.change(screen.getByLabelText(t.students.level), { target: { value: 'جزء عم' } });
    save();
    await screen.findByText(t.students.updated);
    expect(sentPatch()).toMatchObject({ level: 'جزء عم' });
    expect(sentPatch()).not.toHaveProperty('status');
    expect(sentPatch()).not.toHaveProperty('expected_status');
    expect(statusSelect().value).toBe('active'); // reloaded from the PATCH answer
  });

  it('a changed status goes out with the loaded status as expected_status', async () => {
    api.updateStudent.mockResolvedValue({ ...STUDENT, status: 'paused' });
    renderForm();
    fireEvent.change(statusSelect(), { target: { value: 'paused' } });
    save();
    await screen.findByText(t.students.updated);
    expect(sentPatch()).toMatchObject({ status: 'paused', expected_status: 'trial' });
    save();
    await waitFor(() => expect(api.updateStudent).toHaveBeenCalledTimes(2));
    expect(sentPatch(1)).not.toHaveProperty('status'); // saved: no longer a change
  });

  it('409 status_changed: says so in Arabic, refetches and shows the current status', async () => {
    api.updateStudent.mockRejectedValueOnce(new ApiError(409, { code: 'status_changed', message: 'status_changed' }));
    api.fetchStudent.mockResolvedValue({ ...STUDENT, status: 'pending_subscription' });
    renderForm();
    fireEvent.change(statusSelect(), { target: { value: 'churned' } });
    save();
    expect((await screen.findByRole('alert')).textContent).toBe(t.students.statusChanged);
    expect(api.fetchStudent).toHaveBeenCalled();
    expect(statusSelect().value).toBe('pending_subscription');
    api.updateStudent.mockResolvedValue({ ...STUDENT, status: 'pending_subscription' });
    save();
    await waitFor(() => expect(api.updateStudent).toHaveBeenCalledTimes(2));
    expect(sentPatch(1)).not.toHaveProperty('status');
  });

  it('an untouched form follows a refetched student and expects its new status', async () => {
    api.updateStudent.mockResolvedValue({ ...STUDENT, status: 'paused' });
    const client = new QueryClient();
    const view = (student: StudentProfile) => (
      <QueryClientProvider client={client}><StudentProfileForm student={student} /></QueryClientProvider>
    );
    const { rerender } = render(view(STUDENT));
    rerender(view({ ...STUDENT, status: 'active' })); // e.g. a payment moved it
    await waitFor(() => expect(statusSelect().value).toBe('active'));
    fireEvent.change(statusSelect(), { target: { value: 'paused' } });
    save();
    await screen.findByText(t.students.updated);
    expect(sentPatch()).toMatchObject({ status: 'paused', expected_status: 'active' });
  });

  it('any other failure keeps the generic error', async () => {
    api.updateStudent.mockRejectedValue(new ApiError(500));
    renderForm();
    save();
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
  });
});
