import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CreateAccountButton } from './CreateAccountButton';
import { CANDIDATES, fakeApi, granted, renderWithClient } from '@/features/people/users/users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

/** The first candidate of the kit: a student without a login. */
const STUDENT = { id: CANDIDATES[0]?.id ?? '', name: 'يوسف علي', code: 'AB-0007' };
const button = () => screen.queryByRole('button', { name: t.users.account.create });

describe('CreateAccountButton', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    granted.clear();
  });

  it('is hidden without users.write, and asks nothing', () => {
    renderWithClient(<CreateAccountButton student={STUDENT} />);
    expect(button()).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens the create dialog already linked to the student', async () => {
    granted.add('users.write');
    renderWithClient(<CreateAccountButton student={STUDENT} />);
    fireEvent.click(await screen.findByRole('button', { name: t.users.account.create }));
    const dialog = screen.getByRole('dialog', { name: t.users.create.title });
    expect(within(dialog).getByText(/AB-0007/)).toBeTruthy();
    expect(within(dialog).getByLabelText(t.users.form.role)).toHaveProperty('value', 'student');
  });

  it('is hidden when the student already has a login (not among the records without one)', async () => {
    granted.add('users.write');
    const { client } = renderWithClient(<CreateAccountButton student={{ ...STUDENT, id: 'has-a-login' }} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(button()).toBeNull();
  });
});
