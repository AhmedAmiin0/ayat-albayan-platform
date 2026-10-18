import { fireEvent, screen, within } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { linesCheckQuery } from '@/features/messaging/api';
import { t } from '@/lib/i18n';
import { checked, LINES } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// «الرقم» (owner 2026-10-18): which number each template goes out from, and the submit dialog names it.

const WELCOME = template({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', status: 'not_submitted' });
const CHAT_PHONE = '+966 50 000 0000';
const rowOf = (text: string) => {
  const row = screen.getAllByText(text)[0]?.closest('tr');
  if (!row) throw new Error(`no row ${text}`);
  return within(row);
};

async function renderNumbers(withPhones: boolean) {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [template(), WELCOME]],
  ]);
  const client = renderWithClient(<TemplateHealth headingId="h" />);
  await screen.findByText(t.templates.names.booking_confirmation_plain);
  await screen.findAllByText('waba-c');
  if (!withPhones) return;
  act(() => client.setQueryData(linesCheckQuery.queryKey, [checked('notifications', null), checked('chat', CHAT_PHONE)]));
  await screen.findAllByText(CHAT_PHONE);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health — the number column', () => {
  it('the column is «الرقم»; a row shows its line and, after a lines check, the phone', async () => {
    await renderNumbers(true);
    expect(screen.getByRole('columnheader', { name: new RegExp(t.templates.number) })).toBeTruthy();
    const chat = rowOf('academy_welcome');
    expect(chat.getByText(t.enums.waLine.chat)).toBeTruthy();
    expect(chat.getByText(CHAT_PHONE).closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(rowOf(t.templates.names.booking_confirmation_plain).queryByText(CHAT_PHONE)).toBeNull();
  });

  it('a chat row can be submitted; the dialog names its number, phone and driver', async () => {
    await renderNumbers(true);
    fireEvent.click(rowOf('academy_welcome').getByRole('button', { name: t.templates.submit }));
    const dialog = within(screen.getByRole('dialog', { name: t.templates.submit }));
    expect(dialog.getByText(t.templates.submitTarget)).toBeTruthy();
    const target = dialog.getByTestId('submit-target');
    const expected = t.templates.submitTargetValue
      .replace('{line}', t.enums.waLine.chat)
      .replace('{phone}', CHAT_PHONE)
      .replace('{driver}', t.integrations.options.kapso);
    expect(target.textContent).toBe(expected);
    expect(within(target).getByText(CHAT_PHONE).closest('bdi')?.getAttribute('dir')).toBe('ltr');
  });

  it('without a lines check the dialog asks for one instead of a phone', async () => {
    await renderNumbers(false);
    fireEvent.click(rowOf('academy_welcome').getByRole('button', { name: t.templates.submit }));
    expect(screen.getByTestId('submit-target').textContent).toContain(t.templates.phoneUnknown);
  });
});
