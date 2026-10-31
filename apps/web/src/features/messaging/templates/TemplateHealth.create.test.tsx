import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { LINES, lineView } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

// «قالب جديد» (owner 2026-10-31): saved, then the existing «إرسال إلى ميتا» dialog for that row.

const S = t.templates.create;
const SAVED = template({ key: 'welcome_back', meta_name: 'welcome_back', status: 'not_submitted' });

async function createOne(lines = LINES) {
  routeFetch(apiFetch, [
    ['/admin/numbers', []],
    ['/messaging/templates/lines', lines],
    ['/messaging/templates', [template()]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
  // The numbers' facts first: whether the new row's number is on crm decides what follows the save.
  await screen.findAllByText(t.integrations.options.kapso);
  fireEvent.click(await screen.findByRole('button', { name: S.open }));
  fireEvent.change(screen.getByLabelText(S.key), { target: { value: 'welcome_back' } });
  fireEvent.change(screen.getByLabelText(S.body), { target: { value: 'Hello there.' } });
  apiSend.mockResolvedValue(SAVED);
  fireEvent.click(screen.getByRole('button', { name: S.save }));
  await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates', expect.objectContaining({ key: 'welcome_back' })));
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health — «قالب جديد»', () => {
  it('a meta / kapso number: the toast, then the submit confirm for the new row (nothing sent yet)', async () => {
    await createOne();
    expect(await screen.findByText(t.templates.submitConfirm.replace('{name}', 'welcome_back'))).toBeTruthy();
    expect(screen.getByText(S.saved.replace('{name}', 'welcome_back'))).toBeTruthy();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a crm number: saved, and no submit dialog (the template is made in the CRM)', async () => {
    await createOne([lineView('notifications', { provider: 'crm', waba_id: null }), lineView('chat')]);
    expect(await screen.findByText(S.saved.replace('{name}', 'welcome_back'))).toBeTruthy();
    expect(screen.queryByText(t.templates.submitConfirm.replace('{name}', 'welcome_back'))).toBeNull();
  });
});
