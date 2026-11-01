import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { integrationsQuery } from '@/features/platform/integrations/integrations-api';
import { CrmWebhookButton } from './CrmWebhookButton';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

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

afterEach(() => apiFetch.mockReset());

describe('«ربط علامات التسليم من CRM تلقائيًا»', () => {
  it('shows the button and its one-line hint', () => {
    renderButton();
    expect(screen.getByRole('button', { name: s.button })).toBeTruthy();
    expect(screen.getByText(s.hint)).toBeTruthy();
  });

  it('click → POST /settings/integrations/crm-webhook, success note, integrations read again', async () => {
    apiFetch.mockResolvedValue(ANSWER);
    const { onNote, invalidate } = renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', s.done);
    expect(apiFetch).toHaveBeenCalledWith('/settings/integrations/crm-webhook', { method: 'POST' });
    expect(onNote).toHaveBeenCalledWith(s.done);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: integrationsQuery.queryKey });
  });

  it('a refusal shows its own words (a key without webhooks:manage)', async () => {
    apiFetch.mockRejectedValue(new ApiError(502, { message: 'crm_scope_missing' }));
    const { onNote } = renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.crm_scope_missing);
    expect(onNote).not.toHaveBeenCalled();
  });

  it('any other failure is «try again»', async () => {
    apiFetch.mockRejectedValue(new Error('network'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.unknown);
  });
});
