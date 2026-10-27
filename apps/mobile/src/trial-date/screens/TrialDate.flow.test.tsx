import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { maryam, SUN_17 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { historyOf, STUDENT, trialResult, trialRow, UPCOMING } from '../testing/fixtures';
import { effectLine } from '../lib/trial-date-text';
import { TrialDateScreen } from './TrialDateScreen';
import { fakeTrialApi, fakeTrialSend, walkToReview } from '../testing/test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: () => mockBack(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' }),
}));

const history = historyOf([trialRow()]);
const BODY = {
  studentIds: [STUDENT],
  kind: 'trial',
  package: 'trial',
  teacherId: maryam.id,
  byday: [0],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-04',
  startsAt: SUN_17,
  clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeTrialApi(history).fetch);
  mockApiSend.mockImplementation(fakeTrialSend(trialResult()));
});

test('admin: history → the last teacher kept → a free slot → review «سيُنقل…» → POST /booking/trial-date', async () => {
  const { client } = await renderWithQuery(<TrialDateScreen />);
  expect(await screen.findByRole('header', { name: t.trialDate.title.replace('{name}', 'ريم') })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`/booking/trial-dates?studentId=${STUDENT}`);
  // The header shows before the history query answers: wait for its rows, never read them at once.
  expect(await screen.findByText(t.trialDate.count.one)).toBeTruthy();
  expect(screen.getByText(t.trialDate.lastTeacher)).toBeTruthy();

  await walkToReview();
  const slots = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).find((p) => p.startsWith('/booking/slots'));
  expect(slots).toContain(`teacherId=${maryam.id}`);
  expect(slots).toContain(`excludeLessonId=${UPCOMING}`);
  expect(screen.getByText(effectLine(history, '24'))).toBeTruthy();
  expect(screen.queryByTestId('trial-date-warn')).toBeNull();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/booking/trial-date/check', BODY));

  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.trialDate.doneMoved)).toBeTruthy();
  expect(screen.getByText(t.trialDate.doneNote)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/booking/trial-date', BODY);
  const keys = invalidate.mock.calls.map((c) => JSON.stringify(c[0]?.queryKey));
  expect(keys).toEqual(expect.arrayContaining([JSON.stringify(['booking', 'trial-dates', STUDENT]), '["lessons"]', `["students","${STUDENT}"]`]));

  await fireEvent.press(screen.getByRole('button', { name: t.trialDate.close }));
  expect(mockBack).toHaveBeenCalled();
});

test('a retry after a failure re-sends the same request id (rule 8)', async () => {
  await renderWithQuery(<TrialDateScreen />);
  await walkToReview();
  mockApiSend.mockImplementation((_m: string, path: string) =>
    path.endsWith('/check') ? Promise.resolve({ conflicts: [] }) : Promise.reject(new Error('net')),
  );
  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  mockApiSend.mockImplementation(fakeTrialSend(trialResult({ moved_from_id: null })));
  await fireEvent.press(screen.getByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.trialDate.done)).toBeTruthy();
  const posts = mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === '/booking/trial-date');
  expect(posts).toHaveLength(2);
  const ids = posts.map((c: unknown[]) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(ids[0]).toBe(ids[1]);
});
