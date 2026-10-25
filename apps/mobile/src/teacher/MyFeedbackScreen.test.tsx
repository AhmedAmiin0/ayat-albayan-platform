import { fireEvent, screen } from '@testing-library/react-native';
import { answered } from '@/feedback/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { MyFeedbackScreen } from './MyFeedbackScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const text = t.mobile.feedback;
// A teacher's rows come without the parent's contact number (the API leaves it out).
const mine = { ...answered, contact_phone: undefined };

test('my own average and my answers; no contact number', async () => {
  mockApiFetch.mockResolvedValue({
    average: { avg_rating: 4.5, n: 12, recommend_yes_pct: 83.3 },
    items: [mine],
  });
  await renderWithQuery(<MyFeedbackScreen />);
  expect(await screen.findByText('يوسف أحمد · أبرار')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/feedback');
  expect(screen.getByText(text.averageLine.replace('{avg}', '4.5').replace('{n}', '12'))).toBeTruthy();
  expect(screen.getByText('الحلقة كانت ممتازة')).toBeTruthy();
  expect(screen.queryByText(new RegExp(text.contact))).toBeNull();
});

test('no answers yet: empty state, and a failed load offers a retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
    average: { avg_rating: null, n: 0, recommend_yes_pct: null },
    items: [],
  });
  await renderWithQuery(<MyFeedbackScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('header', { name: text.empty })).toBeTruthy();
});
