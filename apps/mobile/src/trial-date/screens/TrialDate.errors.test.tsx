import { fireEvent, screen } from '@testing-library/react-native';
import { SUN_17 } from '@/booking/testing/fixtures';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { historyOf, trialRow } from '../testing/fixtures';
import { TrialDateScreen } from './TrialDateScreen';
import { fakeTrialApi, fakeTrialSend, walkToReview } from '../testing/test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' }),
}));

const clash = { kind: 'teacher_busy', startsAt: SUN_17, endsAt: SUN_17 };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeTrialApi(historyOf([trialRow()])).fetch);
});

test('the check finds a clash: the booking’s conflict notice, no «احجز», «اختر موعدًا آخر» back to the slots', async () => {
  mockApiSend.mockImplementation(fakeTrialSend({}, [clash]));
  await renderWithQuery(<TrialDateScreen />);
  await walkToReview();
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.trialDate.submit })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  expect(await screen.findByRole('button', { name: /^17:00/ })).toBeTruthy();
});

test('409 conflict on the booking itself: the same notice', async () => {
  mockApiSend.mockImplementation((_m: string, path: string) =>
    path.endsWith('/check') ? Promise.resolve({ conflicts: [] }) : Promise.reject(new ApiError(409, { code: 'conflict', conflicts: [clash] })),
  );
  await renderWithQuery(<TrialDateScreen />);
  await walkToReview();
  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
});

test.each(['trial_date_subscribed', 'trial_date_invalid'] as const)('409/400 %s: its own line', async (code) => {
  mockApiSend.mockImplementation((_m: string, path: string) =>
    path.endsWith('/check') ? Promise.resolve({ conflicts: [] }) : Promise.reject(new ApiError(409, { code })),
  );
  await renderWithQuery(<TrialDateScreen />);
  await walkToReview();
  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.booking.error[code])).toBeTruthy();
});
