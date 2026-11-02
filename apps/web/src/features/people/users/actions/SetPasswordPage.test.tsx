import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/people/users/users-test-kit';
import { SetPasswordPage } from './SetPasswordPage';

const S = t.users.setPassword;
const hasRecoverySession = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
vi.mock('./set-password', async (orig) => ({ ...(await orig<object>()), hasRecoverySession }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));

describe('SetPasswordPage: the recovery-session check', () => {
  beforeEach(() => hasRecoverySession.mockReset());

  it('shows «checking», then the password form when the link carries a session', async () => {
    hasRecoverySession.mockResolvedValue(true);
    renderWithClient(<SetPasswordPage />);
    expect(screen.getByText(S.checking)).toBeTruthy();
    expect(await screen.findByText(S.intro)).toBeTruthy();
    expect(screen.queryByText(S.checking)).toBeNull();
    expect(hasRecoverySession).toHaveBeenCalledTimes(1);
  });

  it('says the link is invalid without a session', async () => {
    hasRecoverySession.mockResolvedValue(false);
    renderWithClient(<SetPasswordPage />);
    expect(await screen.findByText(S.invalid)).toBeTruthy();
    expect(screen.queryByText(S.intro)).toBeNull();
  });
});
