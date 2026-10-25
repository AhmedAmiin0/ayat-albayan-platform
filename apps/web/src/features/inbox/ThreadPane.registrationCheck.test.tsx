import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from './inbox-fixture';
import { InboxModeContext, type InboxMode } from './mode';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));
const granted = vi.hoisted(() => new Set<string>());
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: (p: string) => granted.has(p) }) }));

const R = t.registrationCheck;

function open(mode: InboxMode) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], { guardian_id: 'g-1', lead_id: null, lead_status: null })],
    ['/messaging/templates', []],
    ['/settings', {}],
    ['/sales/money/family', { students: [] }],
    ['/sales/registration-check', { found: false, matches: [], more: false }],
  ]);
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

describe('«تحقق من التسجيل» in the sales chat header', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    granted.clear();
    granted.add('students.check_registration');
  });

  it('checks the thread’s number', async () => {
    open('sales');
    fireEvent.click(await screen.findByRole('button', { name: t.common.more }));
    fireEvent.click(await screen.findByRole('button', { name: R.action }));
    const dialog = within(screen.getByRole('dialog', { name: R.title }));
    expect(dialog.getByLabelText(R.phone)).toHaveProperty('value', PHONE);
    expect(await dialog.findByText(R.notFoundPhone)).toBeTruthy();
  });

  it('is hidden without the permission', async () => {
    granted.clear();
    open('sales');
    await screen.findAllByRole('heading');
    expect(screen.queryByRole('button', { name: R.action })).toBeNull();
  });
});
