import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { historyOf, OLD, trialRow } from '@/trial-date/testing/fixtures';
import { TrialDateScreen } from './TrialDateScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
const mockParams = {
  value: { studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' } as Record<
    string,
    string
  >,
};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.value,
}));

beforeEach(() => jest.clearAllMocks());

test('a subscriber: the history with the reason in place of the wizard', async () => {
  const history = historyOf([trialRow({ lesson_id: OLD, outcome: 'attended' })], {
    status: 'active',
    allowed: false,
  });
  mockApi.onRead(() => history);
  await renderWithQuery(<TrialDateScreen />);
  expect(await screen.findByText(t.trialDate.notAllowed)).toBeTruthy();
  expect(screen.getByText(t.trialDate.outcome.attended)).toBeTruthy();
  expect(screen.queryByText(t.trialDate.lastTeacher)).toBeNull();
  expect(screen.queryByText(t.booking.pickTeacher)).toBeNull();
});

test('a failed read: the header and «تعذّر تحميل…» with a retry', async () => {
  mockApi.onRead(() => Promise.reject(new Error('net')));
  await renderWithQuery(<TrialDateScreen />);
  expect(await screen.findByText(t.trialDate.loadError)).toBeTruthy();
  expect(
    screen.getByRole('header', { name: t.trialDate.title.replace('{name}', 'ريم') }),
  ).toBeTruthy();
});

test('a link without the student says so', async () => {
  mockParams.value = {};
  await renderWithQuery(<TrialDateScreen />);
  expect(screen.getByText(t.common.notFound)).toBeTruthy();
  expect(mockApi.reads()).toHaveLength(0);
});
