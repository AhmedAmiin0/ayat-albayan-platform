import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { CreateStudentDialog } from './CreateStudentDialog';

const api = vi.hoisted(() => ({ createStudent: vi.fn(), mergeStudents: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

const SUHAILA = { id: 's1', code: 'AB-0183', name: 'سهيلة', status: 'trial' };
const duplicate = () => new ApiError(409, { message: 'duplicate_student', guardian_id: 'g1', candidates: [SUHAILA] });

function renderDialog() {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateStudentDialog onClose={vi.fn()} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

function fillAndSubmit(phone = '0501234567') {
  fireEvent.change(screen.getByLabelText(t.guardians.phone), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText(t.guardians.name), { target: { value: 'ام جود' } });
  fireEvent.change(screen.getByLabelText(t.students.name), { target: { value: 'سهيله' } });
  fireEvent.click(screen.getByRole('button', { name: t.common.save }));
}

describe('CreateStudentDialog (R-STU-02, R-STU-03)', () => {
  beforeEach(() => {
    api.createStudent.mockReset();
    api.mergeStudents.mockReset();
  });

  it('creates without force and reports success', async () => {
    api.createStudent.mockResolvedValue({ id: 's2' });
    const onDone = renderDialog();
    fillAndSubmit();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.created));
    expect(api.createStudent).toHaveBeenCalledWith(expect.objectContaining({ name: 'سهيله', force: false }));
  });

  it('a bad phone is explained in Arabic and never sent', async () => {
    renderDialog();
    fillAndSubmit('@suhaila');
    await waitFor(() => expect(screen.getByText(t.common.phoneErrors.not_a_number)).toBeTruthy());
    expect(api.createStudent).not.toHaveBeenCalled();
  });

  it('409 shows the duplicate warning; "create anyway" resends with force', async () => {
    api.createStudent.mockRejectedValueOnce(duplicate()).mockResolvedValueOnce({ id: 's2' });
    const onDone = renderDialog();
    fillAndSubmit();
    await screen.findByText(t.students.duplicateTitle);
    expect(screen.getByText(/AB-0183/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.students.createAnyway }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.created));
    expect(api.createStudent).toHaveBeenLastCalledWith(expect.objectContaining({ force: true }));
  });

  it('merge: confirms, creates with force, folds the new row into the existing student', async () => {
    api.createStudent.mockRejectedValueOnce(duplicate()).mockResolvedValueOnce({ id: 's2' });
    api.mergeStudents.mockRejectedValueOnce(new Error('net')).mockResolvedValueOnce({ merge_id: 'm1' });
    const onDone = renderDialog();
    fillAndSubmit();
    fireEvent.click(await screen.findByRole('button', { name: t.students.merge }));
    expect(screen.getByRole('dialog', { name: t.students.mergeTitle })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await screen.findByText(t.common.error); // first merge attempt fails
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.mergeDone));
    expect(api.createStudent).toHaveBeenCalledTimes(2); // the retry did not create a second copy
    expect(api.mergeStudents).toHaveBeenLastCalledWith({ keptId: 's1', mergedId: 's2' });
  });
});
