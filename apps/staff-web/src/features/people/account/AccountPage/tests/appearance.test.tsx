import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderWithClient } from '@/features/people/account/account-test-kit';
import { AccountPage } from '@/features/people/account/AccountPage/AccountPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

describe('AccountPage appearance (moved out of the sidebar foot)', () => {
  it('shows the theme switch and no time-format switch while the profile still loads', () => {
    mockApi.onRead(() => new Promise(() => undefined));
    renderWithClient(<AccountPage />);
    const region = screen.getByRole('region', { name: t.settings.sections.appearance });
    expect(within(region).getByRole('group', { name: t.theme.label })).toBeTruthy();
    expect(within(region).queryByRole('group', { name: t.clock.label })).toBeNull();
  });

  it('stays when the profile fails to load (a browser setting, not a profile field)', async () => {
    mockApi.onRead(() => Promise.reject(new Error('offline')));
    renderWithClient(<AccountPage />);
    expect(await screen.findByText(t.account.loadError, {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByRole('region', { name: t.settings.sections.appearance })).toBeTruthy();
  });
});
