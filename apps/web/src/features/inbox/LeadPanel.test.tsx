import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/features/messaging/settings-fixture';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { InboxLead } from './api';
import { lead, PHONE } from './inbox-fixture';
import { LeadPanel } from './LeadPanel';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

function renderPanel(row: InboxLead = lead()) {
  routeFetch(apiFetch, [
    ['/leads?', { items: [lead({ id: 'other', phone_e164: '+966501234500' }), row], total: 2, page: 1, pageSize: 5 }],
    ['/settings', SETTINGS],
  ]);
  renderWithClient(<LeadPanel phone={PHONE} />);
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('lead panel in the thread (R-LEAD-02/03/05)', () => {
  it('«حجز حلقة تجريبية» opens the Phase 2 wizard with this lead', async () => {
    renderPanel();
    const book = await screen.findByRole('link', { name: t.booking.trialTitle });
    const search = new URLSearchParams({ leadId: 'lead-1', phone: PHONE, name: 'أم سهيلة' });
    expect(book.getAttribute('href')).toBe(`/admin/book?${search}`);
    expect(apiFetch).toHaveBeenCalledWith('/leads?q=%2B966501234567&page=1&pageSize=5');
  });

  it('saves only the changed qualification fields, times from selects', async () => {
    renderPanel(lead({ qualification: { student_name: 'سهيلة', age: 9 } }));
    const name = await screen.findByLabelText<HTMLInputElement>(t.leads.studentName);
    expect(name.value).toBe('سهيلة');
    fireEvent.change(screen.getByLabelText(t.leads.studentAge), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('checkbox', { name: t.enums.weekday['0'] }));
    const time = within(screen.getByRole('group', { name: t.leads.preferredTime }));
    fireEvent.change(time.getByRole('combobox', { name: t.availability.from }), { target: { value: '16:00' } });
    fireEvent.change(time.getByRole('combobox', { name: t.availability.to }), { target: { value: '18:30' } });
    apiSend.mockResolvedValue(lead());
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/leads/lead-1/qualification', {
        age: 10,
        available_days: [0],
        preferred_from: '16:00',
        preferred_to: '18:30',
      }),
    );
    expect(await screen.findByText(t.inbox.qualificationSaved)).toBeTruthy();
  });

  it('an end before the start is refused under the field', async () => {
    renderPanel(lead({ qualification: { preferred_from: '18:00' } }));
    const time = within(await screen.findByRole('group', { name: t.leads.preferredTime }));
    fireEvent.change(time.getByRole('combobox', { name: t.availability.to }), { target: { value: '17:00' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.endBeforeStart);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a refused status move says why in words', async () => {
    renderPanel();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'invalid_transition' }));
    fireEvent.change(await screen.findByRole('combobox', { name: t.leads.changeStatus }), { target: { value: 'converted' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.applyStatus }));
    expect((await screen.findByRole('status')).textContent).toContain(t.leads.invalidTransition);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/leads/lead-1/status', { status: 'converted' });
  });

  it('shows the next automatic follow-up and pauses it for this lead', async () => {
    renderPanel(lead({ status: 'no_reply', next_follow_up_at: '2026-10-03T07:00:00Z', follow_up_stage: 1 }));
    expect(await screen.findByText(/^المتابعة القادمة /)).toBeTruthy();
    expect(await screen.findByText(t.followUps.stage.replace('{n}', '1').replace('{total}', '2'))).toBeTruthy();
    apiSend.mockResolvedValue(lead({ follow_up_paused: true }));
    fireEvent.click(screen.getByRole('button', { name: t.followUps.pause }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/leads/lead-1/follow-up', { paused: true }));
  });

  it('says why the due follow-up has not gone out (no stale «المتابعة القادمة» in the past)', async () => {
    renderPanel(lead({ status: 'no_reply', next_follow_up_at: '2026-09-27T07:00:00Z', follow_up_note: 'waiting_template' }));
    expect(await screen.findByText(t.followUps.waitingTemplate)).toBeTruthy();
    expect(screen.queryByText(/^المتابعة القادمة /)).toBeNull();
  });

  it('a lead who sent «وقف» shows it, and resuming asks first', async () => {
    renderPanel(lead({ status: 'no_reply', follow_up_paused: true, follow_up_paused_by: 'lead' }));
    expect(await screen.findByText(t.followUps.pausedByLead)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.followUps.resume }));
    const dialog = screen.getByRole('dialog', { name: t.followUps.resumeLeadTitle });
    expect(apiSend).not.toHaveBeenCalled();
    apiSend.mockResolvedValue(lead({ follow_up_paused: false }));
    fireEvent.click(within(dialog).getByRole('button', { name: t.followUps.resumeLeadYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/leads/lead-1/follow-up', { paused: false }));
  });

  it('a number that is not a lead has no panel', async () => {
    routeFetch(apiFetch, [['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }]]);
    renderWithClient(<LeadPanel phone={PHONE} />);
    expect(await screen.findByText(t.inbox.noLead)).toBeTruthy();
  });
});
