import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { maryam } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { historyOf, STUDENT, trialResult, trialRow, UPCOMING } from '@/trial-date/testing/fixtures';
import { fakeTrialApi, fakeTrialSend } from '@/trial-date/testing/test-utils';
import { TrialDateScreen } from './TrialDateScreen';

// «تعديل الموعد التجريبي» by a salesperson (owner 2026-11-02): the upcoming trial moves with a new
// length and her own meeting link; the clash check never carries the link.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => false, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' }),
}));

const LINK = 'https://meet.jit.si/ab-trial';
const history = historyOf([trialRow({ lesson_id: UPCOMING, outcome: 'upcoming' })]);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeTrialApi(history, '/sales/booking').fetch);
  mockApiSend.mockImplementation(fakeTrialSend(trialResult({ moved_from_id: UPCOMING })));
});

test('a new length and her link reach POST /sales/booking/trial-date; the check has no link', async () => {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <TrialDateScreen />
    </TreeBaseProvider>,
  );
  const keep = t.booking.mobile.keepTeacher.replace('{teacher}', maryam.display_name_ar);
  await fireEvent.press(await screen.findByRole('button', { name: keep }));
  await fireEvent.press(await screen.findByRole('radio', { name: t.enums.duration['60'] }));
  await fireEvent.press(await screen.findByRole('button', { name: /^17:00/ }));
  await screen.findByText(t.trialDate.mobile.newTime);
  await waitFor(() => expect(screen.queryByText(t.common.loading)).toBeNull());
  await fireEvent.changeText(screen.getByLabelText(t.booking.meetingLink), ` ${LINK} `);
  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.trialDate.doneMoved)).toBeTruthy();
  const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
  expect(sent('/sales/booking/trial-date')[0]?.[2]).toMatchObject({
    studentIds: [STUDENT],
    durationMin: 60,
    meetingLink: LINK,
  });
  const checks = sent('/sales/booking/trial-date/check');
  expect(checks.length).toBeGreaterThan(0);
  expect(checks.every((c: unknown[]) => !JSON.stringify(c[2]).includes('meetingLink'))).toBe(true);
});
