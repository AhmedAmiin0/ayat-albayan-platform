import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import type { InboxLead } from './api';
import { lead, PHONE } from './inbox-fixture';
import { LeadPanel, type LeadNotice } from './LeadPanel';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const FILLED = { student_name: 'عمر', age: 9, gender: 'male', guardian_name: 'أم عمر', tz: 'Africa/Cairo' } as const;

function renderPanel(row: InboxLead, onNotice?: (n: LeadNotice) => void) {
  routeFetch(apiFetch, [
    ['/leads?', { items: [row], total: 1, page: 1, pageSize: 5 }],
    ['/settings', SETTINGS],
    ['/students/teacher-options', []],
  ]);
  return renderWithClient(<LeadPanel phone={PHONE} {...(onNotice ? { onNotice } : {})} />);
}

const aside = () => screen.getByRole('complementary', { name: t.inbox.leadPanel });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('the short lead aside: summary, «تسجيل الطالب», «تعديل البيانات»', () => {
  it('nothing known yet: «لا توجد بيانات بعد», and no qualification field in the aside', async () => {
    renderPanel(lead());
    expect(await screen.findByText(t.inbox.noLeadData)).toBeTruthy();
    expect(within(aside()).queryByLabelText(t.leads.studentName)).toBeNull();
    expect(within(aside()).getByRole('button', { name: t.inbox.editLeadData })).toBeTruthy();
  });

  it('the summary shows only the filled facts, read-only', async () => {
    renderPanel(lead({ qualification: FILLED }));
    const card = within(await screen.findByRole('region', { name: t.leads.qualification }));
    expect(card.getByText('عمر')).toBeTruthy();
    expect(card.getByText(t.enums.gender.male)).toBeTruthy();
    expect(card.getByText(t.tz['Africa/Cairo'])).toBeTruthy();
    expect(card.queryByText(t.leads.country)).toBeNull();
    expect(card.queryByRole('textbox')).toBeNull();
  });

  it('«تسجيل الطالب»: the essentials pre-filled, the thread phone read-only; saved with the lead id', async () => {
    const onNotice = vi.fn();
    const client = renderPanel(lead({ qualification: FILLED }), onNotice);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.registerStudent }));
    const dialog = within(screen.getByRole('dialog', { name: t.inbox.registerStudent }));
    expect(dialog.getByLabelText<HTMLInputElement>(t.leads.studentName).value).toBe('عمر');
    const phone = dialog.getByLabelText<HTMLInputElement>(t.guardians.phone);
    expect([phone.value, phone.readOnly]).toEqual([PHONE, true]);
    expect(dialog.getByLabelText<HTMLInputElement>(t.guardians.name).value).toBe('أم عمر');
    expect(dialog.queryByLabelText(t.students.program)).toBeNull();
    expect(dialog.queryByLabelText(t.guardians.source)).toBeNull();
    apiSend.mockResolvedValue({ id: 's1', code: 'AB-0001', name: 'عمر', status: 'trial' });
    fireEvent.click(dialog.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith({ message: t.students.created }));
    expect(apiSend).toHaveBeenCalledWith('POST', '/students', {
      name: 'عمر',
      age: 9,
      gender: 'male',
      tz: 'Africa/Cairo',
      program: 'quran',
      guardian: { name: 'أم عمر', phone_e164: PHONE, tz: 'Africa/Cairo', source: 'facebook_ad' },
      force: false,
      lead_id: 'lead-1',
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    for (const key of ['leads', 'threads', 'students']) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
    }
  });

  it('«تعديل البيانات» opens the full form in a titled dialog; cancelling closes it', async () => {
    renderPanel(lead({ qualification: FILLED }));
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.editLeadData }));
    const dialog = screen.getByRole('dialog', { name: t.inbox.editLeadDataTitle });
    expect(within(dialog).getByLabelText<HTMLInputElement>(t.leads.studentName).value).toBe('عمر');
    expect(within(dialog).getByLabelText(t.leads.riwaya)).toBeTruthy();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
