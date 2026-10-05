import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { CreateStudentDialog } from './CreateStudentDialog';
import { EMPTY_STUDENT, toCreateBody } from './create-student';

const api = vi.hoisted(() => ({ createStudent: vi.fn(), mergeStudents: vi.fn() }));
vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch: vi.fn(async () => [{ id: 't-abrar', display_name_ar: 'أبرار', meeting_link: null }]),
}));

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateStudentDialog onClose={vi.fn()} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('«إضافة طالب»: «المعلم/المعلمة» (registration form)', () => {
  beforeEach(() => api.createStudent.mockReset());

  it('asks name and WhatsApp first, then age and gender (the form’s order)', () => {
    renderDialog();
    const labels = [t.leads.studentName, t.guardians.phone, t.students.age, t.students.gender, t.students.teacher, t.guardians.source];
    const html = document.body.textContent ?? '';
    const at = labels.map((x) => html.indexOf(x));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('the teacher list starts with the empty option and sends the pick', async () => {
    api.createStudent.mockResolvedValue({ id: 's2' });
    renderDialog();
    const select = screen.getByLabelText(t.students.teacher);
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(2));
    expect(within(select).getAllByRole('option')[0]?.textContent).toBe(t.students.noTeacher);
    fireEvent.change(screen.getByLabelText(t.guardians.phone), { target: { value: '0501234567' } });
    fireEvent.change(screen.getByLabelText(t.guardians.name), { target: { value: 'ام جود' } });
    fireEvent.change(screen.getByLabelText(t.leads.studentName), { target: { value: 'سهيله' } });
    fireEvent.change(select, { target: { value: 't-abrar' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(api.createStudent).toHaveBeenCalledWith(expect.objectContaining({ teacher_id: 't-abrar' })));
  });

  it('toCreateBody: no teacher picked sends no teacher_id', () => {
    expect(toCreateBody({ ...EMPTY_STUDENT, name: 'x' }, false)).not.toHaveProperty('teacher_id');
    expect(toCreateBody({ ...EMPTY_STUDENT, name: 'x', teacher_id: 't1' }, false)).toMatchObject({ teacher_id: 't1' });
  });
});
