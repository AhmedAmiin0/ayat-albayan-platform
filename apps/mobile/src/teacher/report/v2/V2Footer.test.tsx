import { emptyContent, type ReportContent } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { formResponseV2, reportView } from '../testing/fixtures';
import { ReportEntryCardV2 } from './ReportEntryCardV2';

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

async function open(content: ReportContent = emptyContent()) {
  const form = formResponseV2({ report: { content } });
  const [entry] = form.entries;
  if (!entry) throw new Error('no entry');
  await renderWithQuery(<ReportEntryCardV2 form={form} entry={entry} tz="Africa/Cairo" />);
}

beforeEach(() => jest.clearAllMocks());

test('send stops on the form’s own check: attendance, then at least one part', async () => {
  await open();
  await fireEvent.press(screen.getByText(v2.send));
  expect(screen.getByText(t.reports.error.missing_attendance)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.on_time }));
  await fireEvent.press(screen.getByText(v2.send));
  expect(screen.getByText(t.reports.error.missing_segments)).toBeTruthy();
  expect(posts()).toHaveLength(0);
});

test('a complete report goes to /v2/submit with the suggestions it shows; then «احفظ التعديل»', async () => {
  const sent = reportView({
    form_version: 2,
    status: 'submitted',
    version: 1,
    content: graded,
    attendance: 'on_time',
  });
  mockApiSend.mockImplementation(async (m: string) =>
    m === 'POST' ? sent : reportView({ form_version: 2 }),
  );
  await open(graded);
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.on_time }));
  await fireEvent.press(screen.getByText(v2.send));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(posts()[0]?.[1]).toBe('/reports/r-1/v2/submit');
  expect(posts()[0]?.[2]).toMatchObject({
    expectedVersion: 0,
    attendance: 'on_time',
    program: 'quran',
    content: { segments: graded.segments },
    overall: 'excellent',
    homework: v2.suggest.homeworkQuran
      .replace('{surah}', 'الملك')
      .replace('{from}', '16')
      .replace('{to}', '22'),
    nextPlan: expect.stringContaining('سورة الملك 23–29'),
  });
  expect(await screen.findByText(t.reports.submitted)).toBeTruthy();
  expect(screen.getByText(v2.saveEdit)).toBeTruthy();
  expect(screen.queryByText(v2.saveDraft)).toBeNull();
});

test('absent: sent with the attendance and the note only, no content needed', async () => {
  mockApiSend.mockResolvedValue(
    reportView({ form_version: 2, status: 'submitted', version: 1, attendance: 'absent' }),
  );
  await open();
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.absent }));
  await fireEvent.changeText(screen.getByLabelText(v2.absentNote), 'نرجو الإبلاغ');
  await fireEvent.press(screen.getByText(v2.send));
  await waitFor(() => expect(posts()).toHaveLength(1));
  expect(posts()[0]?.[2]).toMatchObject({ attendance: 'absent', notes: 'نرجو الإبلاغ' });
});

test('an API refusal or no connection is said in the form’s words', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'version_conflict' }));
  await open(graded);
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.late }));
  await fireEvent.press(screen.getByText(v2.send));
  expect(await screen.findByText(t.reports.error.version_conflict)).toBeTruthy();
  mockApiSend.mockRejectedValueOnce(new ApiError(400, { code: 'form_version_mismatch' }));
  await fireEvent.press(screen.getByText(v2.send));
  expect(await screen.findByText(t.reports.error.form_version_mismatch)).toBeTruthy();
  expect(screen.queryByText(t.reports.submitted)).toBeNull();
});

test('a draft autosaves to /v2/draft after the pause; «احفظ مسودة» saves at once', async () => {
  mockApiSend.mockResolvedValue(reportView({ form_version: 2 }));
  await open();
  await fireEvent.press(screen.getByText(v2.saveDraft));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith(
      'PUT',
      '/reports/r-1/v2/draft',
      expect.objectContaining({ program: 'quran' }),
    ),
  );
  await fireEvent.press(screen.getByRole('radio', { name: v2.attendance.on_time }));
  await waitFor(
    () =>
      expect(mockApiSend).toHaveBeenLastCalledWith(
        'PUT',
        '/reports/r-1/v2/draft',
        expect.objectContaining({ attendance: 'on_time' }),
      ),
    { timeout: 3000 },
  );
  expect(
    await screen.findByText(new RegExp(t.reports.draftSaved.replace('{time}', ''))),
  ).toBeTruthy();
});
