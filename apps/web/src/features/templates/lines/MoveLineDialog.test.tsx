import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { LINES, lineView } from './template-lines-fixture';
import { TemplateHealth } from '../TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «نقل إلى الرقم الآخر» (owner 2026-10-18): always behind a confirm; a producer's template warns first.

const BOOKING = template({ key: 'booking_confirmation', meta_name: 'booking_confirmation' });
const WELCOME = template({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', status: 'missing' });
const moveOf = (name: string) => screen.getByRole('button', { name: t.templates.moveFor.replace('{name}', name) });
const linesCalls = () => apiFetch.mock.calls.filter(([path]) => path === '/messaging/templates/lines').length;

async function renderMove(lines = LINES) {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', lines],
    ['/messaging/templates', [BOOKING, WELCOME]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
  await screen.findByText(t.templates.names.booking_confirmation);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('move a template to the other number', () => {
  it('an automatic template warns that bookings or reminders will go out from the other number', async () => {
    await renderMove();
    fireEvent.click(moveOf(t.templates.names.booking_confirmation));
    const dialog = within(screen.getByRole('dialog', { name: t.templates.moveTitle }));
    const { notifications: from, chat: to } = t.enums.waLine;
    const text = t.templates.moveConfirm.replace('{name}', t.templates.names.booking_confirmation).replaceAll('{from}', from).replaceAll('{to}', to);
    expect(dialog.getByText(text)).toBeTruthy();
    expect(dialog.getByRole('note').textContent).toBe(t.templates.moveProducerWarning);
    fireEvent.click(dialog.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('an imported template moves without the warning; confirm patches the other line and says so', async () => {
    await renderMove();
    await waitFor(() => expect(linesCalls()).toBe(1));
    fireEvent.click(moveOf('academy_welcome'));
    const dialog = within(screen.getByRole('dialog', { name: t.templates.moveTitle }));
    expect(dialog.queryByText(t.templates.moveProducerWarning)).toBeNull();
    const moved = { ...WELCOME, line: 'notifications' as const, status: 'not_submitted' as const };
    apiSend.mockResolvedValue({ template: moved, sync: null });
    routeFetch(apiFetch, [
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [BOOKING, moved]],
    ]);
    fireEvent.click(dialog.getByRole('button', { name: t.templates.moveYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/academy_welcome/line', { line: 'notifications' }));
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.moved.replace('{line}', t.enums.waLine.notifications));
    expect(screen.queryByRole('dialog')).toBeNull();
    const row = screen.getAllByText('academy_welcome')[0]?.closest('tr');
    expect(row && within(row).getByText(t.enums.templateStatus.not_submitted)).toBeTruthy();
    await waitFor(() => expect(linesCalls()).toBe(2));
  });

  it('no move to a number the server is not set up for: disabled, with the reason beside it', async () => {
    await renderMove([lineView('notifications'), lineView('chat', { configured: false })]);
    await waitFor(() => expect((moveOf(t.templates.names.booking_confirmation) as HTMLButtonElement).disabled).toBe(true));
    const reason = moveOf(t.templates.names.booking_confirmation).getAttribute('aria-describedby');
    expect(reason && document.getElementById(reason)?.textContent).toBe(t.templates.moveUnavailable);
    // The chat row moves to notifications, which is configured.
    expect((moveOf('academy_welcome') as HTMLButtonElement).disabled).toBe(false);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a refused move keeps the row and says why', async () => {
    await renderMove();
    apiSend.mockRejectedValue(new ApiError(403, { code: 'allow_list_only' }));
    fireEvent.click(moveOf('academy_welcome'));
    fireEvent.click(screen.getByRole('button', { name: t.templates.moveYes }));
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.error.allow_list_only);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
