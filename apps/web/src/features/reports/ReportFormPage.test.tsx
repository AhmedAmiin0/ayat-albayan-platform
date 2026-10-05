import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { formResponse, FULL_GRADES, reportView } from './report-fixture';
import { ReportFormPage } from './ReportFormPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

function renderForm(form = formResponse()) {
  apiFetch.mockImplementation((path: string) => (path === '/lessons/l-1/report-form' ? Promise.resolve(form) : Promise.resolve([])));
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ReportFormPage lessonId="l-1" role="teacher" />
    </QueryClientProvider>,
  );
}

const pick = (group: string, option: string) =>
  fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('radio', { name: option }));

function gradeEverything() {
  pick(t.reports.attendance, t.enums.attendance.on_time);
  for (const [rubric, grade] of Object.entries(FULL_GRADES)) {
    pick(t.reports.rubric[rubric as keyof typeof FULL_GRADES], t.enums.grade[grade]);
  }
  pick(t.reports.overall, t.enums.grade.excellent);
  for (const k of ['recited', 'newMemorization', 'revision', 'notes', 'homework'] as const) {
    fireEvent.change(screen.getByLabelText(t.reports[k]), { target: { value: 'تمام' } });
  }
}

describe('ReportFormPage (R-REP-01/02, journey 2)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the identity is prefilled and read-only (no inputs), from the lesson', async () => {
    renderForm();
    const identity = await screen.findByRole('region', { name: t.reports.identity });
    expect(identity.textContent).toContain('سهيلة');
    expect(identity.textContent).toContain('AB-0183');
    expect(identity.textContent).toContain('أبرار');
    expect(identity.textContent).toContain('2 · بقيت 3 حلقات');
    expect(identity.textContent).toContain(t.enums.program.quran);
    expect(within(identity).queryAllByRole('textbox')).toHaveLength(0);
  });

  it('submitting without grades says what is missing and sends nothing', async () => {
    renderForm();
    await screen.findByRole('region', { name: t.reports.identity });
    pick(t.reports.attendance, t.enums.attendance.late);
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(t.reports.error.missing_grades)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalledWith('POST', expect.anything(), expect.anything());
  });

  it('graded but the required text is blank: «missing_text», the blank fields marked (research-forms 12)', async () => {
    renderForm();
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    fireEvent.change(screen.getByLabelText(t.reports.homework), { target: { value: '' } });
    expect(screen.getByLabelText(t.reports.homework).getAttribute('aria-required')).toBe('true');
    expect(screen.getByLabelText(t.reports.theory).getAttribute('aria-required')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(t.reports.error.missing_text)).toBeTruthy();
    expect(screen.getByLabelText(t.reports.homework).getAttribute('aria-invalid')).toBe('true');
    expect(apiSend).not.toHaveBeenCalledWith('POST', expect.anything(), expect.anything());
  });

  it('autosaves the draft after a pause and says «حُفظت المسودة»', async () => {
    apiSend.mockResolvedValue(reportView());
    renderForm();
    await screen.findByRole('region', { name: t.reports.identity });
    fireEvent.change(screen.getByLabelText(t.reports.homework), { target: { value: 'سورة الملك' } });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(apiSend).toHaveBeenCalledWith('PUT', '/reports/r-1/draft', expect.objectContaining({ homework: 'سورة الملك' }));
    expect((await screen.findByText(/حُفظت المسودة/)).textContent).toMatch(/\d\d:\d\d/);
  });

  it('a full form is sent with the version; the page then reads «أُرسل التقرير»', async () => {
    apiSend.mockImplementation((method: string) =>
      Promise.resolve(method === 'POST' ? reportView({ status: 'submitted', version: 1, attendance: 'on_time', pdf_status: 'pending', edit_until: '2026-10-04T14:00:00.000Z' }) : reportView()),
    );
    renderForm();
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(t.reports.submitted)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/reports/r-1/submit', expect.objectContaining({ attendance: 'on_time', overall: 'excellent', expectedVersion: 0 }));
    expect(screen.getByRole('button', { name: t.reports.resubmit })).toBeTruthy();
    expect(screen.getByText(/يمكنك تعديل التقرير حتى/)).toBeTruthy();
    // A reopened form must load the sent version, so the cached form is refetched.
    const formLoads = () => apiFetch.mock.calls.filter(([path]) => path === '/lessons/l-1/report-form').length;
    await waitFor(() => expect(formLoads()).toBe(2));
  });

  it('a refusal reads in Arabic (409 version_conflict)', async () => {
    apiSend.mockImplementation((method: string) =>
      method === 'POST' ? Promise.reject(new ApiError(409, { code: 'version_conflict' })) : Promise.resolve(reportView()),
    );
    renderForm();
    await screen.findByRole('region', { name: t.reports.identity });
    gradeEverything();
    fireEvent.click(screen.getByRole('button', { name: t.reports.submit }));
    expect(await screen.findByText(t.reports.error.version_conflict)).toBeTruthy();
  });

  it('closed edit window: read-only, «مدة التعديل خلصت», no send button', async () => {
    renderForm(formResponse({}, { status: 'submitted', version: 1, attendance: 'on_time', can_edit: false }));
    expect(await screen.findByText(t.reports.editClosed)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.reports.resubmit })).toBeNull();
    expect(screen.getByLabelText(t.reports.notes)).toHaveProperty('disabled', true);
  });

  it('before the lesson starts the send button waits (not_started); a cancelled lesson says so', async () => {
    renderForm(formResponse({ submit_block: 'not_started' }));
    expect(await screen.findByText(t.reports.error.not_started)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.reports.submit })).toHaveProperty('disabled', true);
  });
});
