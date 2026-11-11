import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { formResponse } from './report-fixture';
import { renderReportForm } from './report-form-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

// Review 11-11 (#709 follow-up): the close-time refetch never costs the teacher the form or shows
// unsaved edits as if they had been sent.
const AT = '2026-10-03T14:05:00.000Z';
const sent = {
  status: 'submitted' as const, version: 1, attendance: 'on_time' as const,
  submitted_at: AT, edit_until: '2026-10-03T14:35:00.000Z', homework: 'الواجب المحفوظ',
};
const homework = () => screen.getByLabelText(t.reports.homework) as HTMLTextAreaElement;

describe('the report form at the edit window close', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-03T14:10:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a failed background refetch keeps the loaded form on screen', async () => {
    const client = renderReportForm(apiFetch, formResponse({}, sent));
    await screen.findByRole('region', { name: t.reports.identity });
    apiFetch.mockRejectedValue(new Error('offline'));
    await act(() => client.invalidateQueries());
    expect(screen.getByRole('region', { name: t.reports.identity })).toBeTruthy();
    expect(homework().value).toBe('الواجب المحفوظ');
  });

  it('closed mid-edit: the card shows the saved text, not the unsaved edit', async () => {
    const client = renderReportForm(apiFetch, formResponse({}, sent));
    fireEvent.click(await screen.findByRole('button', { name: t.reports.edit }));
    fireEvent.change(homework(), { target: { value: 'تعديل لم يُحفظ' } });
    expect(homework().value).toBe('تعديل لم يُحفظ');
    const closed = formResponse({}, { ...sent, can_edit: false });
    apiFetch.mockImplementation((path: string) =>
      path === '/lessons/l-1/report-form' ? Promise.resolve(closed) : Promise.resolve([]));
    await act(() => client.invalidateQueries());
    await waitFor(() => expect(homework().value).toBe('الواجب المحفوظ'));
    expect(homework().disabled).toBe(true);
  });
});
