import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { UserDetailDialog } from './UserDetailDialog';
import {
  CANDIDATES,
  DETAIL,
  fakeApi,
  renderWithClient,
  YOUSEF,
} from '@/features/people/users/users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));

const open = () =>
  renderWithClient(
    <UserDetailDialog userId="u1" canWrite onClose={() => undefined} onDone={() => undefined} />,
  );
const roleSelect = () => screen.findByLabelText(new RegExp(`^${t.users.form.role}`));
const save = () => screen.getByRole('button', { name: t.users.detail.save });
const pickRole = async (role: string) =>
  fireEvent.change(await roleSelect(), { target: { value: role } });

describe('UserEditor: the record of a new teacher, student or guardian role', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    apiSend.mockReset().mockResolvedValue({});
  });

  it('shows no picker and no lock hint for a staff role', async () => {
    open();
    expect(await roleSelect()).toHaveProperty('disabled', false);
    expect(screen.queryByText(t.users.form.roleLocked)).toBeNull();
    expect(screen.queryByLabelText(new RegExp(`^${t.users.link.label}`))).toBeNull();
  });

  it('a student role shows the picker and keeps Save off until a record is chosen', async () => {
    open();
    await pickRole('student');
    expect(screen.getByText(t.users.form.roleRecord)).toBeTruthy();
    expect(save()).toHaveProperty('disabled', true);
    fireEvent.click(await screen.findByRole('button', { name: /AB-0007/ }));
    expect(save()).toHaveProperty('disabled', false);
    fireEvent.click(save());
    const body = { role: 'student', role_id: null, linked_id: CANDIDATES[0]?.id };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/users/u1', body));
  });

  it('a teacher role offers an existing or a new teacher', async () => {
    open();
    await pickRole('teacher');
    fireEvent.click(screen.getByRole('radio', { name: t.users.link.newTeacher }));
    expect(save()).toHaveProperty('disabled', true);
    const name = screen.getByLabelText(new RegExp(`^${t.users.newTeacher.nameAr}`));
    fireEvent.change(name, { target: { value: 'أبرار' } });
    fireEvent.click(save());
    const teacher = { display_name_ar: 'أبرار', gender: 'female' };
    const body = { role: 'teacher', role_id: null, new_teacher: teacher };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/users/u1', body));
  });

  it('a linked login keeps its role: the hint shows and the picker never does', async () => {
    apiFetch.mockImplementation(fakeApi(undefined, { ...DETAIL, ...YOUSEF, id: 'u1' }));
    open();
    expect(await screen.findByText(t.users.form.roleLocked)).toBeTruthy();
    expect(await roleSelect()).toHaveProperty('disabled', true);
    expect(screen.queryByText(t.users.form.roleRecord)).toBeNull();
  });
});
