import { offerText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const p = t.pricing;

beforeEach(() => {
  mockApi.reset('read');
  mockApi.onRead(() => bulkSa);
});

const sheet = (phone: string) =>
  renderWithQuery(<QuoteSheet phone={phone} open onClose={jest.fn()} />);

test.each([
  ['+966501234567', 'SA'],
  ['+971501234567', 'AE'],
] as const)('a %s chat opens on its country (%s), still editable', async (phone, country) => {
  await sheet(phone);
  await screen.findByTestId('quote-preview');
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: `/pricing/quote?tier=standard&duration=45&country=${country}&students=1&discount=0`,
  });
  expect(screen.getByRole('radio', { name: p.countries[country], checked: true })).toBeTruthy();
});

test('any other code opens on «دولة أخرى» and asks in USD (no country sent)', async () => {
  await sheet('+447700900123');
  await screen.findByTestId('quote-preview');
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: '/pricing/quote?tier=standard&duration=45&students=1&discount=0',
  });
  expect(screen.getByRole('radio', { name: p.otherCountry, checked: true })).toBeTruthy();
});

test('the preview is the calculator offer text, in Arabic; the discount is pills and a free field', async () => {
  await sheet('+966501234567');
  expect((await screen.findByTestId('quote-preview')).props.children).toBe(
    offerText(bulkSa, ar.pricing),
  );
  expect(screen.getByRole('radio', { name: p.discounts['15'] })).toBeTruthy();
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(2); // the pills' group, the field
});
