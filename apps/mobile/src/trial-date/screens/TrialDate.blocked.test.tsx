import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { historyOf, OLD, trialRow } from '../testing/fixtures';
import { TrialDateScreen } from './TrialDateScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
const mockParams = { value: { studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' } as Record<string, string> };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.value,
}));

beforeEach(() => jest.clearAllMocks());

test('a subscriber: the history with the reason in place of the wizard', async () => {
  const history = historyOf([trialRow({ lesson_id: OLD, outcome: 'attended' })], { status: 'active', allowed: false });
  mockApiFetch.mockResolvedValue(history);
  await renderWithQuery(<TrialDateScreen />);
  expect(await screen.findByText(t.trialDate.notAllowed)).toBeTruthy();
  expect(screen.getByText(t.trialDate.outcome.attended)).toBeTruthy();
  expect(screen.queryByText(t.trialDate.lastTeacher)).toBeNull();
  expect(screen.queryByText(t.booking.pickTeacher)).toBeNull();
});

test('a failed read: the header and «تعذّر تحميل…» with a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('net'));
  await renderWithQuery(<TrialDateScreen />);
  expect(await screen.findByText(t.trialDate.loadError)).toBeTruthy();
  expect(screen.getByRole('header', { name: t.trialDate.title.replace('{name}', 'ريم') })).toBeTruthy();
});

test('a link without the student says so', async () => {
  mockParams.value = {};
  await renderWithQuery(<TrialDateScreen />);
  expect(screen.getByText(t.common.notFound)).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
