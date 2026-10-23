import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { CATALOGUE_ROUTE, SETTINGS } from '@/test/settings-fixture';
import { SettingsPage } from './SettingsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const s = t.sales.assign;

function renderPage(on: boolean) {
  routeFetch(apiFetch, [
    ['/settings/integrations', []],
    ['/settings', { ...SETTINGS, sales_auto_assign: on }],
    CATALOGUE_ROUTE,
    ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ['/messaging/templates', []],
  ]);
  renderWithClient(<SettingsPage />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التعيين التلقائي للعملاء الجدد» (settings.sales_auto_assign)', () => {
  it('sits with the other switches, OFF reads «متوقف», turning it on PATCHes only salesAutoAssign', async () => {
    renderPage(false);
    expect(await screen.findByText(s.auto)).toBeTruthy();
    expect(screen.getByText(s.autoHint)).toBeTruthy();
    expect(screen.getByText(s.autoOff)).toBeTruthy();
    apiSend.mockResolvedValue({ ...SETTINGS, sales_auto_assign: true });
    fireEvent.click(screen.getByRole('button', { name: s.autoEnable }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { salesAutoAssign: true }));
    expect(await screen.findByText(s.autoOn)).toBeTruthy();
  });

  it('turning it off and a failed save', async () => {
    renderPage(true);
    apiSend.mockRejectedValue(new Error('down'));
    fireEvent.click(await screen.findByRole('button', { name: s.autoDisable }));
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { salesAutoAssign: false });
    expect(screen.getByText(s.autoOn)).toBeTruthy();
  });
});
