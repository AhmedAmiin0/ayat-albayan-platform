import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { lineView } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// docs/19 «crm driver», docs/39: a crm line's row submits through the CRM; its status by hand stays a fallback.

const s = t.templates.crmStatus;
const MISSING = template({ key: 'renewal_due', status: 'missing' });

function renderHealth() {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', [lineView('notifications', { provider: 'crm', waba_id: null }), lineView('chat')]],
    ['/messaging/templates', [MISSING]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health: a crm line', () => {
  it('submit beside the hand-set marks; missing reads «غير متاح في نظام CRM»; approving PUTs the status', async () => {
    renderHealth();
    const row = within((await screen.findByText(t.templates.names.renewal_due)).closest('tr') as HTMLElement);
    await row.findByText(s.note);
    expect(row.getByRole('button', { name: t.templates.submit })).toBeTruthy();
    apiSend.mockResolvedValue({ ...MISSING, status: 'approved' });
    expect(row.getByText(s.missingChip)).toBeTruthy();
    fireEvent.click(row.getByRole('button', { name: s.approvedFor.replace('{name}', t.templates.names.renewal_due) }));
    fireEvent.click(row.getByRole('button', { name: s.confirmFor.replace('{name}', t.templates.names.renewal_due) }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/messaging/templates/renewal_due/crm-status', { status: 'approved' }));
    expect(await row.findByText(t.enums.templateStatus.approved)).toBeTruthy();
    const status = t.enums.templateStatus.approved;
    expect(await screen.findByText(s.saved.replace('{name}', t.templates.names.renewal_due).replace('{status}', status))).toBeTruthy();
  });
});
