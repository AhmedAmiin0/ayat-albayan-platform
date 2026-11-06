import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { formResponse, reportView } from './report-fixture';
import { gradeEverything, renderReportForm } from './report-form-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

// Owner 2026-11-06: one send per tap, a clear «sent» and a read-only view, and an edit only
// through «تعديل التقرير» (the same report, its version), never a second report.
const AT = '2026-10-03T14:05:00.000Z';
const sent = { status: 'submitted' as const, version: 1, attendance: 'on_time' as const, submitted_at: AT, edit_until: '2026-10-04T14:05:00.000Z' };
const posts = () => apiSend.mock.calls.filter(([method]) => method === 'POST');
const sendButton = () => screen.getByRole('button', { name: t.reports.submitting });

describe('the report form: one send, then read-only, edit on demand', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a double tap while pending sends one request; the button is disabled with a spinner', async () => {
    let answer = (_: unknown) => undefined as void;
    apiSend.mockImplementation((method: string) =>
      method === 'POST' ? new Promise((resolve) => (answer = resolve)) : Promise.resolve(reportView()));
    renderReportForm(apiFetch, formResponse());
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    const button = screen.getByRole('button', { name: t.reports.submit });
    // Two clicks before React re-renders (a double tap): the hook's guard stops the second.
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(sendButton().getAttribute('aria-busy')).toBe('true'));
    fireEvent.click(sendButton());
    expect((sendButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('send-spinner')).toBeTruthy();
    expect(posts()).toHaveLength(1);
    answer(reportView(sent));
    expect(await screen.findByText(/تم إرسال التقرير بنجاح/)).toBeTruthy();
    expect(posts()).toHaveLength(1);
  });

  it('after the send: «تم إرسال التقرير بنجاح», the fields read-only, no send button', async () => {
    apiSend.mockImplementation((method: string) =>
      Promise.resolve(method === 'POST' ? reportView(sent) : reportView()));
    renderReportForm(apiFetch, formResponse());
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(/تم إرسال التقرير بنجاح/)).toBeTruthy();
    expect(screen.getByLabelText(t.reports.homework).matches(':disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: t.reports.submit })).toBeNull();
    expect(screen.queryByRole('button', { name: t.reports.resubmit })).toBeNull();
  });

  it('inside the window «تعديل التقرير» re-opens the same report; «حفظ التعديل» sends its version', async () => {
    apiSend.mockResolvedValue(reportView({ ...sent, version: 2, edited_at: AT }));
    renderReportForm(apiFetch, formResponse({}, { ...sent, grades: reportView().grades }));
    fireEvent.click(await screen.findByRole('button', { name: t.reports.edit }));
    gradeEverything();
    fireEvent.click(screen.getByRole('button', { name: t.reports.resubmit }));
    expect(await screen.findByText(/تم حفظ التعديل بنجاح/)).toBeTruthy();
    expect(posts()).toEqual([['POST', '/reports/r-1/submit', expect.objectContaining({ expectedVersion: 1 })]]);
    expect(screen.getByRole('button', { name: t.reports.edit })).toBeTruthy();
  });

  it('after the window: no «تعديل التقرير», and the reason', async () => {
    renderReportForm(apiFetch, formResponse({}, { ...sent, can_edit: false }));
    expect(await screen.findByText(t.reports.editClosed)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.reports.edit })).toBeNull();
  });

  it('an edit refused as stale (409) says so and stays in the edit', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'version_conflict' }));
    renderReportForm(apiFetch, formResponse({}, sent));
    fireEvent.click(await screen.findByRole('button', { name: t.reports.edit }));
    gradeEverything();
    fireEvent.click(screen.getByRole('button', { name: t.reports.resubmit }));
    expect(await screen.findByText(t.reports.error.version_conflict)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reports.resubmit })).toBeTruthy();
  });
});
