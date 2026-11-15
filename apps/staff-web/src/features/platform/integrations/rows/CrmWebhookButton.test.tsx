import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { integrationsQuery } from '@/features/platform/integrations/integrations-api';
import { CrmWebhookButton } from './CrmWebhookButton';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const s = t.integrations.crmWebhook;
const ANSWER = {
  data: {
    id: 'w-1',
    url: 'https://api.test.example/webhooks/wacrm',
    events: ['message.status_updated'],
    replaced: 1,
  },
};

function renderButton() {
  const onNote = vi.fn();
  const client = renderWithClient(<CrmWebhookButton onNote={onNote} />);
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  return { onNote, invalidate };
}

afterEach(() => apiSend.mockReset());

describe('«ربط علامات التسليم من نظام CRM تلقائيًا»', () => {
  it('shows the button and its one-line hint', () => {
    renderButton();
    expect(screen.getByRole('button', { name: s.button })).toBeTruthy();
    expect(screen.getByText(s.hint)).toBeTruthy();
  });

  it('click → POST /settings/integrations/crm-webhook, success note, integrations read again', async () => {
    let answer: (value: unknown) => void = () => undefined;
    apiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { onNote, invalidate } = renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect(await screen.findByRole('button', { name: s.pending })).toHaveProperty('disabled', true);
    answer(ANSWER);
    await waitFor(() => expect(onNote).toHaveBeenCalledExactlyOnceWith(s.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/settings/integrations/crm-webhook');
    expect(screen.queryByText(s.done)).toBeNull();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: integrationsQuery.queryKey });
  });

  it('a refusal shows its own words (a key without webhooks:manage)', async () => {
    apiSend.mockRejectedValue(new ApiError(502, { message: 'crm_scope_missing' }));
    const { onNote } = renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.crm_scope_missing);
    expect(onNote).not.toHaveBeenCalled();
  });

  it('the CRM base not on https has its own words', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { message: 'crm_base_insecure' }));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.crm_base_insecure);
  });

  it('any other failure is «try again»', async () => {
    apiSend.mockRejectedValue(new Error('network'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.unknown);
  });
});
