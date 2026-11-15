import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import {
  ALL,
  renderActions,
  VIEW,
} from '@/features/people/students/people-edit/people-edit.test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const E = t.peopleEdit;

async function open(view = VIEW) {
  renderActions(apiFetch, { permissions: ALL, view });
  fireEvent.click(await screen.findByRole('button', { name: E.convert }));
  return screen.findByRole<HTMLInputElement>('checkbox', { name: E.selfToggle });
}

describe('«تحويل إلى طالب / ولي أمر»', () => {
  it('«الطالب هو ولي الأمر» toggles contact_is_self', async () => {
    apiSend.mockResolvedValue({ id: 's1', contact_is_self: true });
    fireEvent.click(await open());
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/people/students/s1/contact-self', {
        contact_is_self: true,
      }),
    );
  });

  it('the toggle is locked while another child holds the number', async () => {
    const students = VIEW.guardian.students.map((s) => ({ ...s, contact_is_self: s.id === 's2' }));
    const box = await open({ ...VIEW, guardian: { ...VIEW.guardian, students } });
    expect(box.disabled).toBe(true);
    expect(screen.getByText(E.selfTaken)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: E.toStudent }).disabled).toBe(
      true,
    );
  });

  it('guardian → student after a confirm, with the new code in the notice', async () => {
    apiSend.mockResolvedValue({ id: 's9', code: 'AB-0300' });
    await open();
    fireEvent.click(screen.getByRole('button', { name: E.toStudent }));
    expect(screen.getByRole('alert').textContent).toBe(
      E.toStudentConfirm.replace('{name}', 'أم سهيلة'),
    );
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    expect(await screen.findByText(E.toStudentDone.replace('{code}', 'AB-0300'))).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/people/guardians/g1/to-student', undefined);
  });

  it('student → guardian: refused with its history in MSA; blocked with a login', async () => {
    apiSend.mockRejectedValue(
      new ApiError(409, { code: 'student_has_records', tables: ['subscriptions'] }),
    );
    await open();
    fireEvent.click(screen.getByRole('button', { name: E.toGuardian }));
    fireEvent.click(screen.getByRole('button', { name: E.confirm }));
    expect(await screen.findByText(E.errors.student_has_records)).toBeTruthy();
  });

  it('a student with a login: «تحويل إلى ولي أمر» is off and says why', async () => {
    await open({ ...VIEW, student: { ...VIEW.student, has_login: true } });
    expect(screen.getByRole<HTMLButtonElement>('button', { name: E.toGuardian }).disabled).toBe(
      true,
    );
    expect(screen.getByText(E.toGuardianLogin)).toBeTruthy();
  });
});
