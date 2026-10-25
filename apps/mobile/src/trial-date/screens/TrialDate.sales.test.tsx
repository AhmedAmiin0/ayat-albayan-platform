import { fireEvent, screen } from '@testing-library/react-native';
import { maryam } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { renderWithQuery } from '@/test/query';
import { historyOf, OLD, STUDENT, trialResult, trialRow } from '../testing/fixtures';
import { TrialDateScreen } from './TrialDateScreen';
import { fakeTrialApi, fakeTrialSend, walkToReview } from '../testing/test-utils';

// A salesperson, from her family chat (/sales/inbox/trial-date): everything under /sales/booking.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => false, replace: (h: unknown) => mockReplace(h), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: '44444444-4444-4444-8444-444444444444', name: 'ريم' }),
}));

// No upcoming trial (the last one was missed): the new date books a new trial lesson.
const history = historyOf([trialRow({ lesson_id: OLD, outcome: 'absent' })]);

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeTrialApi(history, '/sales/booking').fetch);
  mockApiSend.mockImplementation(fakeTrialSend(trialResult({ moved_from_id: null })));
});

test('sales: /sales/booking reads and posts, «ستُحجز حلقة تجريبية جديدة», back to her chats', async () => {
  await renderWithQuery(
    <TreeBaseProvider value="/sales">
      <TrialDateScreen />
    </TreeBaseProvider>,
  );
  await screen.findByText(t.trialDate.count.one);
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/booking/trial-dates?studentId=${STUDENT}`);
  await walkToReview();
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/booking\/teachers/));
  const slots = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).find((p) => p.includes('/slots'));
  expect(slots).toMatch(/^\/sales\/booking\/slots/);
  expect(slots).not.toContain('excludeLessonId');
  expect(screen.getByText(t.trialDate.newLesson)).toBeTruthy();

  await fireEvent.press(await screen.findByRole('button', { name: t.trialDate.submit }));
  expect(await screen.findByText(t.trialDate.done)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/booking/trial-date/check', expect.objectContaining({ studentIds: [STUDENT] }));
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/sales/booking/trial-date',
    expect.objectContaining({ studentIds: [STUDENT], kind: 'trial', package: 'trial', teacherId: maryam.id }),
  );
  await fireEvent.press(screen.getByRole('button', { name: t.trialDate.close }));
  expect(mockReplace).toHaveBeenCalledWith('/sales/inbox');
});
