import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { openV2, pick, v2Report } from './v2-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const v2 = t.reports.v2;
const p = v2.picker;

/** Attended; «التسميع» = الفاتحة 1–7 picked from the list and graded ممتاز. */
function fillQuran() {
  pick(v2.attendanceTitle, v2.attendance.on_time);
  const [recited] = screen.getAllByRole('button', { name: v2.pickRange });
  if (recited) fireEvent.click(recited);
  fireEvent.click(screen.getByRole('button', { name: /سورة الفاتحة/ }));
  fireEvent.click(screen.getByRole('button', { name: p.done }));
  pick('تقييم التسميع', t.enums.grade.excellent);
}

describe('the new report form: send and autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('nothing picked: says a part is missing and sends nothing', async () => {
    await openV2({ apiFetch });
    pick(v2.attendanceTitle, v2.attendance.late);
    fireEvent.click(screen.getByRole('button', { name: v2.send }));
    expect(await screen.findByText(t.reports.error.missing_segments)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalledWith('POST', expect.anything(), expect.anything());
  });

  it('a new part opens after the last saved ayah', async () => {
    await openV2({ apiFetch });
    const buttons = screen.getAllByRole('button', { name: v2.pickRange });
    if (buttons[1]) fireEvent.click(buttons[1]);
    const dialog = screen.getByRole('dialog', { name: v2.segment.new });
    expect(within(dialog).getByRole('status').textContent).toContain('يبدأ تلقائيًا بعد آخر حفظ (الآية 15).');
  });

  it('sends the v2 body (parts, suggested overall, version; untouched homework left to the API) and reads «أُرسل التقرير»', async () => {
    apiSend.mockImplementation((method: string) =>
      Promise.resolve(method === 'POST' ? v2Report({ status: 'submitted', version: 1, attendance: 'on_time', pdf_status: 'pending' }) : v2Report()),
    );
    await openV2({ apiFetch });
    fillQuran();
    fireEvent.click(screen.getByRole('button', { name: v2.send }));
    expect(await screen.findByText(t.reports.submitted)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith(
      'POST',
      '/reports/r-1/v2/submit',
      expect.objectContaining({
        attendance: 'on_time',
        program: 'quran',
        overall: 'excellent',
        expectedVersion: 0,
        content: expect.objectContaining({ segments: [{ kind: 'recited', surah: 1, from: 1, to: 7, grade: 'excellent' }] }),
      }),
    );
    expect(apiSend.mock.calls.find((c) => c[0] === 'POST')?.[2]).not.toHaveProperty('homework');
  });

  it('a refusal reads in the API words', async () => {
    apiSend.mockImplementation((method: string) =>
      method === 'POST' ? Promise.reject(new ApiError(409, { code: 'form_version_mismatch' })) : Promise.resolve(v2Report()),
    );
    await openV2({ apiFetch });
    fillQuran();
    fireEvent.click(screen.getByRole('button', { name: v2.send }));
    expect(await screen.findByText(t.reports.error.form_version_mismatch)).toBeTruthy();
  });

  it('autosaves to /v2/draft after a pause; «احفظ مسودة» saves at once', async () => {
    apiSend.mockResolvedValue(v2Report());
    await openV2({ apiFetch });
    fireEvent.click(screen.getByRole('button', { name: v2.quick.keep_going }));
    fireEvent.click(screen.getByRole('button', { name: v2.saveDraft }));
    const quick = expect.objectContaining({ content: expect.objectContaining({ quick: ['keep_going'] }) });
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', '/reports/r-1/v2/draft', quick));
    fireEvent.change(screen.getByRole('textbox', { name: new RegExp(v2.note) }), { target: { value: 'أحسنت' } });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(apiSend).toHaveBeenCalledWith('PUT', '/reports/r-1/v2/draft', expect.objectContaining({ notes: 'أحسنت' }));
    expect(await screen.findByText(/حُفظت المسودة/)).toBeTruthy();
  });
});
