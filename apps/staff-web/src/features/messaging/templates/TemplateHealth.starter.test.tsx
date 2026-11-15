import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { LINES } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «متاح للمعلمين والمبيعات» (the restricted allow-list) (owner 2026-10-12, docs/16): the line of each template and the admin's switch.

const BOOKING = template();
const WELCOME = template({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true, status: 'missing' });
const toggleOf = (name: string) => screen.getByRole('checkbox', { name: t.templates.salesStarterFor.replace('{name}', name) });
const rowOf = (text: string) => {
  const row = screen.getAllByText(text)[0]?.closest('tr');
  if (!row) throw new Error(`no row ${text}`);
  return within(row);
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health — line and sales starters', () => {
  it('each row says its number; a chat row is offered «أرسله إلى ميتا للاعتماد» too (its own WABA)', async () => {
    routeFetch(apiFetch, [
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [BOOKING, WELCOME]],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(t.templates.names.booking_confirmation_plain);
    expect(rowOf(t.templates.names.booking_confirmation_plain).getByText(t.enums.waLine.notifications)).toBeTruthy();
    expect(rowOf('academy_welcome').getByText(t.enums.waLine.chat)).toBeTruthy();
    expect(rowOf('academy_welcome').getByRole('button', { name: t.templates.submit })).toBeTruthy();
    expect(screen.getByText(t.templates.salesStarterIntro)).toBeTruthy();
  });

  it('one switch per template, each with its own name; ticking saves through PATCH and says so', async () => {
    routeFetch(apiFetch, [
      ['/messaging/templates/lines', LINES],
      ['/messaging/templates', [BOOKING, WELCOME]],
    ]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(t.templates.names.booking_confirmation_plain);
    const booking = toggleOf(t.templates.names.booking_confirmation_plain);
    expect((booking as HTMLInputElement).checked).toBe(false);
    expect((toggleOf('academy_welcome') as HTMLInputElement).checked).toBe(true);
    apiSend.mockResolvedValue({ ...BOOKING, sales_starter: true });
    fireEvent.click(booking);
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/booking_confirmation_plain/starter', { sales_starter: true }),
    );
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.starterOn);
    await waitFor(() => expect((toggleOf(t.templates.names.booking_confirmation_plain) as HTMLInputElement).checked).toBe(true));
  });
});
