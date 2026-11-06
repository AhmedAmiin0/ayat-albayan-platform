import { emptyContent, type ReportContent, type ReportView } from '@ab/shared';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponseV2, reportView } from '@/teacher/report/testing/fixtures';
import { ReportEntryCardV2 } from './ReportEntryCardV2';

// Owner 2026-11-06: one send per tap, «تم إرسال التقرير بنجاح» and a read-only report, an edit
// only through «تعديل التقرير» (the same report and its version).
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));

const v2 = t.reports.v2;
const posts = () => mockApiSend.mock.calls.filter(([m]) => m === 'POST');
const graded: ReportContent = {
  ...emptyContent(),
  segments: [{ kind: 'new', surah: 67, from: 16, to: 22, grade: 'excellent' }],
};
const AT = '2026-10-03T14:05:00.000Z';
const SENT = { form_version: 2 as const, status: 'submitted' as const, version: 1, content: graded, attendance: 'on_time' as const, submitted_at: AT };

async function open(report: Partial<ReportView>) {
  const form = formResponseV2({ report });
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
}

beforeEach(() => jest.clearAllMocks());

test('a double tap while pending sends once, with a spinner; then the confirmation, read-only', async () => {
  let answer: (value: ReportView) => void = () => undefined;
  mockApiSend.mockImplementation((m: string) =>
    m === 'POST' ? new Promise((resolve) => (answer = resolve)) : Promise.resolve(reportView({ form_version: 2 })));
  await open({ content: graded });
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.on_time }));
  // Two presses on the same element before React re-renders: the hook's guard stops the second.
  const send = screen.getByText(v2.send);
  await act(async () => {
    await Promise.all([fireEvent.press(send), fireEvent.press(send)]);
  });
  await fireEvent.press(screen.getByText(t.reports.submitting));
  expect(screen.getByTestId('send-spinner')).toBeTruthy();
  expect(posts()).toHaveLength(1);
  answer(reportView(SENT));
  expect(await screen.findByText(/تم إرسال التقرير بنجاح/)).toBeTruthy();
  expect(posts()).toHaveLength(1);
  expect(screen.queryByText(v2.send)).toBeNull();
  expect(screen.getByRole('radio', { name: v2.attendance.on_time })).toBeDisabled();
});

test('inside the window «تعديل التقرير» re-opens the same report; «حفظ التعديل» sends its version', async () => {
  mockApiSend.mockResolvedValue(reportView({ ...SENT, version: 2, edited_at: AT }));
  await open(SENT);
  expect(screen.queryByText(t.reports.resubmit)).toBeNull();
  await fireEvent.press(screen.getByText(t.reports.edit));
  await fireEvent.press(screen.getByText(t.reports.resubmit));
  expect(await screen.findByText(/تم حفظ التعديل بنجاح/)).toBeTruthy();
  expect(posts()).toEqual([['POST', '/reports/r-1/v2/submit', expect.objectContaining({ expectedVersion: 1 })]]);
  expect(screen.getByText(t.reports.edit)).toBeTruthy();
});

test('after the window: no «تعديل التقرير», and why', async () => {
  await open({ ...SENT, can_edit: false });
  expect(screen.getByText(t.reports.editClosed)).toBeTruthy();
  expect(screen.queryByText(t.reports.edit)).toBeNull();
});

test('a stale edit (409) says so and stays in the edit', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'version_conflict' }));
  await open(SENT);
  await fireEvent.press(screen.getByText(t.reports.edit));
  await fireEvent.press(screen.getByText(t.reports.resubmit));
  expect(await screen.findByText(t.reports.error.version_conflict)).toBeTruthy();
  expect(screen.getByText(t.reports.resubmit)).toBeTruthy();
});
