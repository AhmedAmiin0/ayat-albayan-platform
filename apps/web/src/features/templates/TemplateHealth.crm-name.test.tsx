import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { lineView } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// docs/19 «crm driver»: the CRM name is edited only on a crm line's rows; a save replaces the row and closes.

const s = t.templates.crmName;
const ON_CRM = template({ key: 'renewal_due', status: 'approved', line: 'notifications' });
const ON_META = template({ key: 'welcome_greeting', status: 'approved', line: 'chat' });
const editFor = (key: 'renewal_due' | 'welcome_greeting') => s.editFor.replace('{name}', t.templates.names[key]);

function renderHealth() {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', [lineView('notifications', { provider: 'crm', waba_id: null }), lineView('chat')]],
    ['/messaging/templates', [ON_CRM, ON_META]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health: the CRM name', () => {
  it('only a crm line\'s row offers it; a save PUTs, shows the new name, closes and says so', async () => {
    renderHealth();
    const row = within((await screen.findByText(t.templates.names.renewal_due)).closest('tr') as HTMLElement);
    const meta = within((await screen.findByText(t.templates.names.welcome_greeting)).closest('tr') as HTMLElement);
    expect(meta.queryByRole('button', { name: editFor('welcome_greeting') })).toBeNull();
    apiSend.mockResolvedValue({ ...ON_CRM, crm_name: 'renewal_v2', crm_language: null });
    fireEvent.click(await row.findByRole('button', { name: editFor('renewal_due') }));
    fireEvent.change(screen.getByLabelText(s.name), { target: { value: 'renewal_v2' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PUT', '/messaging/templates/renewal_due/crm-name', { crm_name: 'renewal_v2', crm_language: null }),
    );
    expect(await row.findByText('renewal_v2')).toBeTruthy();
    expect(screen.queryByLabelText(s.name)).toBeNull();
    expect(await screen.findByText(s.saved.replace('{name}', t.templates.names.renewal_due))).toBeTruthy();
  });

  it('a refused save keeps the dialog open with the error', async () => {
    renderHealth();
    const row = within((await screen.findByText(t.templates.names.renewal_due)).closest('tr') as HTMLElement);
    apiSend.mockRejectedValue(new Error('409'));
    fireEvent.click(await row.findByRole('button', { name: editFor('renewal_due') }));
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(screen.getByLabelText(s.name)).toBeTruthy();
  });
});
