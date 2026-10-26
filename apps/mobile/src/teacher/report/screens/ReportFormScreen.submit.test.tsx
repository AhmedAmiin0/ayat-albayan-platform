import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { FULL_GRADES, formResponse, reportView } from '../testing/fixtures';
import { ReportFormScreen } from './ReportFormScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => ({ lessonId: 'l-1' }),
}));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
const submitCalls = () => mockApiSend.mock.calls.filter(([m]) => m === 'POST');

async function open() {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/teachers/me' ? me : formResponse()));
  await renderWithQuery(<ReportFormScreen />);
  await screen.findByText(t.reports.readOnlyHint);
}

/** «حضرت في الموعد», ممتاز on all seven grade rows, and the five required texts. */
async function fillAll() {
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.attendance.on_time }));
  for (const radio of screen.getAllByRole('radio', { name: t.enums.grade.excellent })) await fireEvent.press(radio);
  await fireEvent.changeText(screen.getByLabelText(t.reports.recited), 'الفاتحة');
  const [newMemorization] = screen.getAllByLabelText(t.reports.newMemorization).filter((n) => n.props.multiline);
  if (newMemorization) await fireEvent.changeText(newMemorization, 'الملك 1-5');
  const [revision] = screen.getAllByLabelText(t.reports.revision).filter((n) => n.props.multiline);
  if (revision) await fireEvent.changeText(revision, 'النبأ');
  await fireEvent.changeText(screen.getByLabelText(t.reports.notes), 'ممتازة');
  await fireEvent.changeText(screen.getByLabelText(t.reports.homework), 'الملك 6-10');
}

beforeEach(() => jest.clearAllMocks());

test('a draft autosaves: PUT /reports/:id/draft with the whole form after the 800 ms pause', async () => {
  mockApiSend.mockResolvedValue(reportView({ recited: 'الفاتحة' }));
  await open();
  await fireEvent.changeText(screen.getByLabelText(t.reports.recited), 'الفاتحة');
  expect(mockApiSend).not.toHaveBeenCalled();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PUT', '/reports/r-1/draft', expect.objectContaining({ recited: 'الفاتحة', attendance: null })), {
    timeout: 3000,
  });
  expect(await screen.findByText(new RegExp(t.reports.draftSaved.replace('{time}', '')))).toBeTruthy();
});

test('submit stops on the API’s rules: attendance, then grades, then the required text', async () => {
  mockApiSend.mockResolvedValue(reportView());
  await open();
  await fireEvent.press(screen.getByText(t.reports.submit));
  expect(screen.getByText(t.reports.error.missing_attendance)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.attendance.on_time }));
  await fireEvent.press(screen.getByText(t.reports.submit));
  expect(screen.getByText(t.reports.error.missing_grades)).toBeTruthy();
  for (const radio of screen.getAllByRole('radio', { name: t.enums.grade.good })) await fireEvent.press(radio);
  await fireEvent.press(screen.getByText(t.reports.submit));
  expect(screen.getByText(t.reports.error.missing_text)).toBeTruthy();
  expect(submitCalls()).toHaveLength(0);
});

test('a complete report is sent with its version; the sent state and edit window show', async () => {
  const sent = reportView({ status: 'submitted', version: 1, submitted_at: '2026-10-03T14:00:00Z', edit_until: '2026-10-04T14:00:00Z' });
  mockApiSend.mockImplementation(async (m: string) => (m === 'POST' ? { ...sent, grades: FULL_GRADES } : reportView()));
  await open();
  await fillAll();
  await fireEvent.press(screen.getByText(t.reports.submit));
  await waitFor(() => expect(submitCalls()).toHaveLength(1));
  expect(submitCalls()[0]?.[1]).toBe('/reports/r-1/submit');
  expect(submitCalls()[0]?.[2]).toMatchObject({
    expectedVersion: 0,
    attendance: 'on_time',
    grades: { recitation: 'excellent', commitment: 'excellent' },
    overall: 'excellent',
    recited: 'الفاتحة',
    homework: 'الملك 6-10',
  });
  expect(await screen.findByText(t.reports.submitted)).toBeTruthy();
  expect(screen.getByText(t.reports.resubmit)).toBeTruthy();
});

test('offline: the submit fails and says the report was not sent', async () => {
  mockApiSend.mockImplementation(async (m: string) => {
    if (m === 'POST') throw new TypeError('Network request failed');
    return reportView();
  });
  await open();
  await fillAll();
  await fireEvent.press(screen.getByText(t.reports.submit));
  expect(await screen.findByText(t.reports.offlineNotSent)).toBeTruthy();
  expect(screen.queryByText(t.reports.submitted)).toBeNull();
});
