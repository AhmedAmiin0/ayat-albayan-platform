import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { detail, PHONE } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ThreadPane } from '../threads/pane/ThreadPane';
import { OPEN_SUB, student } from './sales-money-fixture';

vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));

describe('the sales money actions, English', () => {
  it('the buttons and the transfer step read in English', async () => {
    routeFetch(apiFetch, [
      ['/threads/%2B966501234567', detail([], { guardian_id: 'g-1', lead_id: null, lead_status: null })],
      ['/messaging/templates', []],
      ['/settings', {}],
      ['/sales/money/family', { students: [student({ open: [OPEN_SUB] })] }],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>,
    );
    expect(await screen.findByRole('button', { name: 'New subscription' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Record a bank transfer' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Record the bank transfer' }));
    expect(dialog.getByRole('button', { name: 'Pick the receipt from the chat' })).toBeTruthy();
    expect(dialog.getByRole('button', { name: 'Record the transfer' })).toBeTruthy();
    expect(dialog.getByText('Transfer date')).toBeTruthy();
  });
});
