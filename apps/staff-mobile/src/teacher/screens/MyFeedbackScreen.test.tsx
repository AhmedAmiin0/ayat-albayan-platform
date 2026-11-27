import { fireEvent, screen } from '@testing-library/react-native';
import { answered, page } from '@/feedback/fixtures';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { MyFeedbackScreen } from './MyFeedbackScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const text = t.mobile.feedback;
// A teacher's own rows come without the teacher block and the parent's contact number.
const { teacher: _teacher, contact_phone: _phone, ...mine } = answered;

test('my own average and my answers; no contact number', async () => {
  mockApiFetch.mockResolvedValue({
    ...page([mine]),
    average: { avg_rating: 4.5, n: 12, recommend_yes_pct: 83.3 },
  });
  await renderWithQuery(<MyFeedbackScreen />);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/feedback');
  expect(
    screen.getByText(text.averageLine.replace('{avg}', '4.5').replace('{n}', '12')),
  ).toBeTruthy();
  expect(screen.getByText('الحلقة كانت ممتازة')).toBeTruthy();
  expect(screen.queryByText(new RegExp(text.contact))).toBeNull();
});

test('no answers yet: empty state, and a failed load offers a retry', async () => {
  mockApiFetch
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ ...page([]), average: null });
  await renderWithQuery(<MyFeedbackScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByRole('header', { name: text.empty })).toBeTruthy();
});
