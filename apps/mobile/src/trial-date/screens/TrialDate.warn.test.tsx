import { screen } from '@testing-library/react-native';
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

const rows = (n: number) => Array.from({ length: n }, (_, i) => trialRow({ lesson_id: `l${i}`, outcome: i === 0 ? 'upcoming' : 'moved' }));

async function review(count: number) {
  mockApiFetch.mockImplementation(fakeTrialApi(historyOf(rows(count))).fetch);
  mockApiSend.mockImplementation(fakeTrialSend({}));
  await renderWithQuery(<TrialDateScreen />);
  await walkToReview();
}

beforeEach(() => jest.clearAllMocks());

test('the 2nd date: no warning', async () => {
  await review(1);
  expect(screen.queryByTestId('trial-date-warn')).toBeNull();
});

test('the 3rd date: «… رقم 3 …», and booking stays possible (a warning, not a block)', async () => {
  await review(2);
  expect(screen.getByText(t.trialDate.warn.replace('{n}', '3'))).toBeTruthy();
  expect(await screen.findByRole('button', { name: t.trialDate.submit })).toBeTruthy();
});

test('the 6th date: «… رقم 6 …»', async () => {
  await review(5);
  expect(screen.getByText(t.trialDate.warn.replace('{n}', '6'))).toBeTruthy();
});
