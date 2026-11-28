import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderWithClient } from '@/features/people/account/account-test-kit';
import { AccountPage } from '@/features/people/account/AccountPage/AccountPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

describe('AccountPage appearance (moved out of the sidebar foot)', () => {
  it('shows the theme and time-format switches while the profile still loads', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderWithClient(<AccountPage />);
    const region = screen.getByRole('region', { name: t.settings.sections.appearance });
    expect(within(region).getByRole('group', { name: t.theme.label })).toBeTruthy();
    expect(within(region).getByRole('group', { name: t.clock.label })).toBeTruthy();
  });

  it('stays when the profile fails to load (a browser setting, not a profile field)', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    renderWithClient(<AccountPage />);
    expect(await screen.findByText(t.account.loadError, {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByRole('region', { name: t.settings.sections.appearance })).toBeTruthy();
  });
});
