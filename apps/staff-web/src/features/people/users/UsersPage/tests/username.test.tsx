import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { UsersPage } from '@/features/people/users/UsersPage/UsersPage';
import { fakeApi, granted, renderWithClient, SARA, YOUSEF } from '@/features/people/users/users-test-kit';

// The users list shows a teacher's sign-in username (docs/30 §7).

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [...granted], can: (p: string) => granted.has(p) }) }));

const OMAR = { ...SARA, id: 'u3', email: null, full_name: 'أ. عمر', role: 'teacher' as const, username: 'ustadh.omar' };

describe('UsersPage — username column', () => {
  beforeEach(() => {
    apiFetch.mockReset().mockImplementation(fakeApi([OMAR, YOUSEF]));
    granted.clear();
    granted.add('users.read');
  });

  it('has the column and shows the username', async () => {
    renderWithClient(<UsersPage />);
    expect(await screen.findByText('ustadh.omar')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: t.familyAuth.usersColumn })).toBeTruthy();
  });
});
