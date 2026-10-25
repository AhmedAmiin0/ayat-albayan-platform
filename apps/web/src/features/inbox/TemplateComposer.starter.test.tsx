import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE, template } from './inbox-fixture';
import { TemplateComposer } from './TemplateComposer';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// A chat starter imported from Meta (owner 2026-10-12): its key is its Meta name, not a TEMPLATE_KEYS one.
const IMPORTED = template({
  key: 'academy_welcome',
  meta_name: 'academy_welcome',
  body_ar: '{{1}} {{2}} {{3}} {{4}}',
  params: ['var_1', 'var_2', 'var_3', 'var_4'],
  line: 'chat',
  sales_starter: true,
});
const field = (n: string) => screen.getByLabelText(t.inbox.composer.param.replace('{n}', n), { exact: true });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('TemplateComposer — an imported starter', () => {
  it('shows its four variables and sends it with its own key and every value', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [IMPORTED]]]);
    renderWithClient(<TemplateComposer phone={PHONE} context={{}} teacher={false} />);
    await screen.findByRole('option', { name: 'academy_welcome' }); // the list has loaded: the option exists
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.chooseTemplate }), { target: { value: 'academy_welcome' } });
    ['1', '2', '3', '4'].forEach((n) => fireEvent.change(field(n), { target: { value: `v${n}` } }));
    apiSend.mockResolvedValue(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', expect.stringMatching(/\/template$/), {
        key: 'academy_welcome',
        params: { '1': 'v1', '2': 'v2', '3': 'v3', '4': 'v4' },
        clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      }),
    );
  });

  it('a missing variable blocks the send', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [IMPORTED]]]);
    renderWithClient(<TemplateComposer phone={PHONE} context={{}} teacher={false} />);
    await screen.findByRole('option', { name: 'academy_welcome' }); // the list has loaded: the option exists
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.composer.chooseTemplate }), { target: { value: 'academy_welcome' } });
    fireEvent.change(field('1'), { target: { value: 'v1' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.sendTemplate }));
    expect(await screen.findByText(t.inbox.composer.required.replace('{field}', t.inbox.composer.param.replace('{n}', '4')))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
