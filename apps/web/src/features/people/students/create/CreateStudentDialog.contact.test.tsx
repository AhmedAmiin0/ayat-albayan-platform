import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CreateStudentDialog } from './CreateStudentDialog';

// «رقم الواتساب لـ: ولي الأمر / الطالب نفسه» (docs/30 §1) on «إضافة طالب».

const api = vi.hoisted(() => ({ createStudent: vi.fn(), mergeStudents: vi.fn() }));
vi.mock('@/features/people/students/api', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));
const C = t.familyAuth.contactIsSelf;

function fillAndSubmit(self: boolean) {
  render(<QueryClientProvider client={new QueryClient()}><CreateStudentDialog onClose={vi.fn()} onDone={vi.fn()} /></QueryClientProvider>);
  expect(screen.getByRole('radio', { name: C.guardian })).toHaveProperty('checked', true);
  if (self) fireEvent.click(screen.getByRole('radio', { name: C.self }));
  fireEvent.change(screen.getByLabelText(t.guardians.phone), { target: { value: '0501234567' } });
  fireEvent.change(screen.getByLabelText(t.guardians.name), { target: { value: 'ام جود' } });
  fireEvent.change(screen.getByLabelText(t.leads.studentName), { target: { value: 'سهيله' } });
  fireEvent.click(screen.getByRole('button', { name: t.common.save }));
}

describe('CreateStudentDialog: contact_is_self', () => {
  beforeEach(() => api.createStudent.mockReset().mockResolvedValue({ id: 's2' }));

  it('the default «ولي الأمر» sends nothing (the DB default false)', async () => {
    fillAndSubmit(false);
    await waitFor(() => expect(api.createStudent).toHaveBeenCalled());
    expect(api.createStudent.mock.calls[0]?.[0]).not.toHaveProperty('contact_is_self');
  });

  it('«الطالب نفسه» sends contact_is_self: true', async () => {
    fillAndSubmit(true);
    await waitFor(() => expect(api.createStudent).toHaveBeenCalled());
    expect(api.createStudent).toHaveBeenCalledWith(expect.objectContaining({ contact_is_self: true }));
  });
});
