import { screen } from '@testing-library/react-native';
import { t, ltr } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { answered, page, pending, summary } from './fixtures';
import { FeedbackScreen } from './FeedbackScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const text = t.mobile.feedback;
const serve = (items = [answered, pending]) =>
  mockApi.onRead(async ({ path }) =>
    path.startsWith('/feedback/summary') ? summary : page(items),
  );

test('each teacher’s average on top, then every answer and the request still waiting', async () => {
  serve();
  await renderWithQuery(<FeedbackScreen />);
  expect(await screen.findByText('يوسف أحمد · أبرار')).toBeTruthy();
  expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/feedback?page=1&pageSize=25' });
  expect(screen.getByRole('header', { name: text.title })).toBeTruthy();
  // The first teacher: 4.5 of 5 from 12 answers, 83 % yes. The second: nobody answered yet.
  expect(
    screen.getByText(text.averageLine.replace('{avg}', '4.5').replace('{n}', '12')),
  ).toBeTruthy();
  expect(screen.getByText(text.recommendLine.replace('{pct}', '83'))).toBeTruthy();
  // The answer: type, rating, yes, the note, the contact number (isolated LTR).
  expect(
    screen.getByText(`${text.ratingValue.replace('{n}', '5')} · ${text.answer.yes}`),
  ).toBeTruthy();
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
