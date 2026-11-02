import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CreateStudentDialog } from './CreateStudentDialog';

const api = vi.hoisted(() => ({ createStudent: vi.fn(), mergeStudents: vi.fn() }));
vi.mock('@/features/people/students/api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

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
  fireEvent.change(screen.getByLabelText(t.leads.studentName), { target: { value: 'سهيله' } });
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

  it('empty «حفظ»: Arabic field errors (no browser bubble), nothing sent; tz is a select', async () => {
    renderDialog();
    const form = screen.getByLabelText(t.leads.studentName).closest('form');
    expect(form?.noValidate).toBe(true);
    expect(screen.getByLabelText(t.students.tz).tagName).toBe('SELECT');
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(screen.getAllByText(t.common.required)).toHaveLength(2));
    expect(screen.getByText(t.common.phoneErrors.empty)).toBeTruthy();
    expect(screen.getByLabelText(t.leads.studentName).getAttribute('aria-invalid')).toBe('true');
    expect(api.createStudent).not.toHaveBeenCalled();
  });

  it('the registration form’s age, gender, source and phone hint (research-forms 1, 3, 4)', async () => {
    api.createStudent.mockResolvedValue({ id: 's2' });
    renderDialog();
    expect(screen.getByText(t.guardians.phoneHint)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(t.students.age), { target: { value: '120' } });
    fillAndSubmit();
    expect(await screen.findByText(t.students.ageInvalid)).toBeTruthy();
    expect(api.createStudent).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(t.students.age), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(t.students.gender), { target: { value: 'female' } });
    fireEvent.change(screen.getByLabelText(t.guardians.source), { target: { value: 'referral' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    const sent = expect.objectContaining({ age: 9, gender: 'female', guardian: expect.objectContaining({ source: 'referral' }) });
    await waitFor(() => expect(api.createStudent).toHaveBeenCalledWith(sent));
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

  it('merge fails, admin backs out and picks "create anyway": no second copy', async () => {
    api.createStudent.mockRejectedValueOnce(duplicate()).mockResolvedValueOnce({ id: 's2' });
    api.mergeStudents.mockRejectedValueOnce(new Error('net'));
    const onDone = renderDialog();
    fillAndSubmit();
    fireEvent.click(await screen.findByRole('button', { name: t.students.merge }));
    fireEvent.click(screen.getByRole('button', { name: t.common.confirm }));
    await screen.findByText(t.common.error);
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    // Back on the duplicate step, focus is on «دمج», the button the admin had pressed.
    await waitFor(() => expect(document.activeElement?.textContent).toBe(t.students.merge));
    fireEvent.click(await screen.findByRole('button', { name: t.students.createAnyway }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(t.students.created));
    expect(api.createStudent).toHaveBeenCalledTimes(2); // the 409 attempt + the one forced create
  });
});
