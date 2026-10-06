import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { CreateAccountButton } from './CreateAccountButton';
import { fakeApi, granted, renderWithClient } from './users-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

const STUDENT = { id: 'st-1', name: 'يوسف علي', code: 'AB-0007' };

describe('CreateAccountButton', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi());
    granted.clear();
  });

  it('is hidden without users.write', () => {
    renderWithClient(<CreateAccountButton student={STUDENT} />);
    expect(screen.queryByRole('button', { name: t.users.account.create })).toBeNull();
  });

  it('opens the create dialog already linked to the student', () => {
    granted.add('users.write');
    renderWithClient(<CreateAccountButton student={STUDENT} />);
    fireEvent.click(screen.getByRole('button', { name: t.users.account.create }));
    const dialog = screen.getByRole('dialog', { name: t.users.create.title });
    expect(within(dialog).getByText(/AB-0007/)).toBeTruthy();
    expect(within(dialog).getByLabelText(t.users.form.role)).toHaveProperty('value', 'student');
  });
});
