import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { LINES, lineSync } from './template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const APPROVED = template();
const DRAFT = template({
  key: 'renewal_due',
  meta_name: 'renewal_due',
  status: 'not_submitted',
  body_ar: 'فاضل {{2}} في باقة {{1}}',
  params: ['student_name', 'remaining_label'],
  quality: null,
  last_checked_at: null,
});
const REJECTED = template({ key: 'follow_up_slots', status: 'rejected', last_error: 'INVALID_FORMAT', category: 'marketing' });
const PDF = template({ key: 'report_ready', status: 'not_submitted', header_format: 'document', params: ['student_name', 'lesson_when'] });

function renderHealth() {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [APPROVED, DRAFT, REJECTED, PDF]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
}

const rowOf = (key: keyof typeof t.templates.names) => {
  const row = screen.getByText(t.templates.names[key]).closest('tr');
  if (!row) throw new Error(`no row ${key}`);
  return within(row);
};

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('template health (R-MSG-01, issue C1)', () => {
  it('every template with its status chip, Meta’s reason, quality and last check', async () => {
    renderHealth();
    await screen.findByText(t.templates.names.booking_confirmation_plain);
    expect(rowOf('booking_confirmation_plain').getByText(t.enums.templateStatus.approved).closest('[data-tone]')?.getAttribute('data-tone')).toBe('ok');
    expect(rowOf('booking_confirmation_plain').getByText(t.templates.qualityScore.GREEN)).toBeTruthy();
    expect(rowOf('renewal_due').getByText(t.templates.neverChecked)).toBeTruthy();
    expect(rowOf('follow_up_slots').getByText('INVALID_FORMAT')).toBeTruthy();
    expect(screen.getByText(t.templates.needsAttention)).toBeTruthy();
    expect(rowOf('booking_confirmation_plain').queryByRole('button', { name: t.templates.submit })).toBeNull();
    expect(rowOf('follow_up_slots').getByRole('button', { name: t.templates.submit })).toBeTruthy();
  });

  it('«مزامنة مع Meta» of the notifications number reads its WABA now; not configured is said in words', async () => {
    renderHealth();
    const sync = t.templates.perNumber.syncFor.replace('{line}', t.enums.waLine.notifications);
    apiSend
      .mockResolvedValueOnce({ lines: [lineSync()], templates: [APPROVED] })
      .mockRejectedValueOnce(new ApiError(503, { code: 'not_configured' }));
    fireEvent.click(await screen.findByRole('button', { name: sync }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/health', { line: 'notifications' }));
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.perNumber.synced.replace('{line}', t.enums.waLine.notifications));
    await waitFor(() => expect(screen.queryByText(t.templates.names.renewal_due)).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: sync }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(t.templates.error.not_configured.replace('{line}', t.enums.waLine.notifications)));
  });

  it('submitting to Meta is explicit: the dialog shows the exact text, then T3', async () => {
    renderHealth();
    await screen.findByText(t.templates.names.renewal_due);
    fireEvent.click(rowOf('renewal_due').getByRole('button', { name: t.templates.submit }));
    const dialog = within(screen.getByRole('dialog', { name: t.templates.submit }));
    expect(dialog.getByText(t.templates.submitConfirm.replace('{name}', t.templates.names.renewal_due))).toBeTruthy();
    expect(dialog.getByText('فاضل {{2}} في باقة {{1}}')).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue({ ...DRAFT, status: 'pending' });
    fireEvent.click(dialog.getByRole('button', { name: t.templates.submitConfirmYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/renewal_due/submit'));
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.submitted);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a PDF template without the Meta app id on the server says so', async () => {
    renderHealth();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'needs_app_id', line: 'notifications' }));
    await screen.findByText(t.templates.names.report_ready);
    fireEvent.click(rowOf('report_ready').getByRole('button', { name: t.templates.submit }));
    fireEvent.click(screen.getByRole('button', { name: t.templates.submitConfirmYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/report_ready/submit'));
    expect((await screen.findByRole('status')).textContent).toContain(
      t.templates.error.needs_app_id.replace('{line}', t.enums.waLine.notifications).replace('{key}', 'WA_APP_ID'),
    );
  });

  it('a rejected row shows no stale quality', async () => {
    renderHealth();
    await screen.findByText(t.templates.names.follow_up_slots);
    expect(rowOf('follow_up_slots').queryByText(t.templates.qualityScore.GREEN)).toBeNull();
  });
});
