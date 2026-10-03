import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { answered, page, pending, summary } from './fixtures';
import { FeedbackScreen } from './FeedbackScreen';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const text = t.mobile.feedback;
const serve = (items = [answered, pending]) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/feedback/summary') ? summary : page(items),
  );

test('each teacher’s average on top, then every answer and the request still waiting', async () => {
  serve();
  await renderWithQuery(<FeedbackScreen />);
  expect(await screen.findByText('يوسف أحمد · أبرار')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/feedback?page=1&pageSize=25');
  expect(screen.getByRole('header', { name: text.title })).toBeTruthy();
  // أبرار: 4.5 of 5 from 12 answers, 83 % yes. هند: nobody answered yet.
  expect(screen.getByText(text.averageLine.replace('{avg}', '4.5').replace('{n}', '12'))).toBeTruthy();
  expect(screen.getByText(text.recommendLine.replace('{pct}', '83'))).toBeTruthy();
  expect(screen.getByText(text.empty)).toBeTruthy();
  // The answer: type, rating, «نعم», the note, the contact number (isolated LTR).
  expect(screen.getByText(`${text.rating}: ${text.ratingValue.replace('{n}', '5')}`)).toBeTruthy();
  expect(screen.getByText(`${text.recommend} ${text.answer.yes}`)).toBeTruthy();
  expect(screen.getByText('الحلقة كانت ممتازة')).toBeTruthy();
  expect(screen.getByText(`${text.contact}: ${ltr('+966 55 214 7730')}`)).toBeTruthy();
  // The pending one says so, and shows its own lesson type.
  expect(screen.getByText('مريم علي · أبرار')).toBeTruthy();
  expect(screen.getByText(text.pending)).toBeTruthy();
  expect(screen.getByText(new RegExp(text.kind.subscription))).toBeTruthy();
});

test('nothing sent yet: the honest empty state', async () => {
  serve([]);
  await renderWithQuery(<FeedbackScreen />);
  expect(await screen.findByRole('header', { name: text.empty })).toBeTruthy();
});
