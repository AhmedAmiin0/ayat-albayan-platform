import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CreateStudentDialog } from './CreateStudentDialog';
import { EMPTY_STUDENT, toCreateBody, type CreateStudentValues } from './create-student';

const api = vi.hoisted(() => ({ createStudent: vi.fn(), mergeStudents: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('@/lib/http/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(async (path: string) => {
    if (path.startsWith('/students/teacher-options')) return [];
    throw new Error(`unrouted ${path}`);
  }),
}));

const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'trial' };
const duplicate = () => new ApiError(409, { message: 'duplicate_student', guardian_id: 'g1', candidates: [SUHAILA] });
const INITIAL: Partial<CreateStudentValues> = {
  name: 'سهيله',
  guardianPhone: '+966501234567',
  guardianName: 'ام جود',
  age: '9',
  source: 'referral',
};

function renderDialog() {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateStudentDialog title="تسجيل الطالب" initial={INITIAL} leadId="lead-1" onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('CreateStudentDialog pre-filled from a lead (R-STU-02, R-LEAD-06)', () => {
  beforeEach(() => {
    api.createStudent.mockReset();
    api.mergeStudents.mockReset();
  });

  it('the given title, values and a read-only phone; program and source keep their defaults unseen', async () => {
    api.createStudent.mockResolvedValue({ id: 's2' });
    const onDone = renderDialog();
    expect(screen.getByRole('dialog', { name: 'تسجيل الطالب' })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>(t.students.age).value).toBe('9');
    expect(screen.getByLabelText<HTMLInputElement>(t.guardians.phone).readOnly).toBe(true);
    expect(screen.queryByLabelText(t.students.program)).toBeNull();
    expect(screen.queryByLabelText(t.guardians.source)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.created));
    expect(api.createStudent).toHaveBeenCalledWith(
      expect.objectContaining({ program: 'quran', lead_id: 'lead-1', guardian: expect.objectContaining({ source: 'referral' }) }),
    );
  });

  it('a duplicate created anyway still converts the lead', async () => {
    api.createStudent.mockRejectedValueOnce(duplicate()).mockResolvedValueOnce({ id: 's2' });
    const onDone = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    fireEvent.click(await screen.findByRole('button', { name: t.students.createAnyway }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.created));
    expect(api.createStudent).toHaveBeenLastCalledWith(expect.objectContaining({ force: true, lead_id: 'lead-1' }));
  });

  it('merged into the existing student: the create before the merge carries the lead', async () => {
    api.createStudent.mockRejectedValueOnce(duplicate()).mockResolvedValueOnce({ id: 's2' });
    api.mergeStudents.mockResolvedValue({ merge_id: 'm1' });
    const onDone = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    fireEvent.click(await screen.findByRole('button', { name: t.students.merge }));
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.mergeDone));
    expect(api.createStudent).toHaveBeenLastCalledWith(expect.objectContaining({ force: true, lead_id: 'lead-1' }));
  });

  it('toCreateBody: lead_id only when a lead is given', () => {
    const v = { ...EMPTY_STUDENT, name: 'x' };
    expect(toCreateBody(v, false)).not.toHaveProperty('lead_id');
    expect(toCreateBody(v, false, 'lead-1')).toMatchObject({ lead_id: 'lead-1' });
  });
});
