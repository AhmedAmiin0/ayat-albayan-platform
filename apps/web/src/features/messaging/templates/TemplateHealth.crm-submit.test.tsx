import type { TemplateView } from '@ab/shared';
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

// docs/39: on a crm line «إرسال إلى ميتا» shows exactly when the API submits through the CRM.

const NEW = template({ key: 'renewal_due', meta_name: 'renewal_due', status: 'not_submitted', meta_id: null });
const PDF = template({ key: 'report_ready', meta_name: 'report_ready', status: 'not_submitted', header_format: 'document' });
const REFUSED = template({ key: 'follow_up_slots', meta_name: 'follow_up_slots', status: 'rejected', meta_id: 'mt-1' });
const UNSENT = template({ key: 'lesson_rescheduled', meta_name: 'lesson_rescheduled', status: 'rejected', meta_id: null });
const LIVE = template({ key: 'booking_confirmation_plain', status: 'approved' });

function renderHealth(rows: TemplateView[], provider: 'crm' | 'meta' = 'crm') {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', [lineView('notifications', { provider, waba_id: null }), lineView('chat')]],
    ['/messaging/templates', rows],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
}

const rowOf = async (key: keyof typeof t.templates.names) =>
  within((await screen.findByText(t.templates.names[key])).closest('tr') as HTMLElement);
const submitIn = (row: Awaited<ReturnType<typeof rowOf>>) => row.queryByRole('button', { name: t.templates.submit });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health: «إرسال إلى ميتا» on a crm line', () => {
  it('a new row: shown, and confirming posts the submit (once, through the API)', async () => {
    renderHealth([NEW]);
    const row = await rowOf('renewal_due');
    await row.findByText(t.templates.crmStatus.note);
    apiSend.mockResolvedValue({ ...NEW, status: 'pending', meta_id: 'mt-9' });
    fireEvent.click(row.getByRole('button', { name: t.templates.submit }));
    const dialog = within(screen.getByRole('dialog', { name: t.templates.submit }));
    fireEvent.click(dialog.getByRole('button', { name: t.templates.submitConfirmYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/renewal_due/submit'));
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a document header: no button, «تُنشأ في لوحة CRM» with the reason', async () => {
    renderHealth([PDF]);
    const row = await rowOf('report_ready');
    await row.findByText(t.templates.crmSubmit.document);
    expect(submitIn(row)).toBeNull();
  });

  it('rejected with a meta_id: edited in the CRM; rejected without one: shown', async () => {
    renderHealth([REFUSED, UNSENT]);
    const refused = await rowOf('follow_up_slots');
    await refused.findByText(t.templates.crmSubmit.rejected);
    expect(submitIn(refused)).toBeNull();
    expect(submitIn(await rowOf('lesson_rescheduled'))).toBeTruthy();
  });

  it('approved: neither, the hand-set marks stay as the fallback', async () => {
    renderHealth([LIVE]);
    const row = await rowOf('booking_confirmation_plain');
    await row.findByText(t.templates.crmStatus.note);
    expect(submitIn(row)).toBeNull();
    expect(row.queryByText(t.templates.crmSubmit.document)).toBeNull();
    expect(row.getByRole('button', { name: t.templates.crmStatus.missingFor.replace('{name}', t.templates.names.booking_confirmation_plain) })).toBeTruthy();
  });

  it('a meta line keeps its submit for a document header and a rejected row', async () => {
    renderHealth([PDF, REFUSED], 'meta');
    expect(submitIn(await rowOf('report_ready'))).toBeTruthy();
    expect(submitIn(await rowOf('follow_up_slots'))).toBeTruthy();
    expect(screen.queryByText(t.templates.crmSubmit.document)).toBeNull();
  });
});
