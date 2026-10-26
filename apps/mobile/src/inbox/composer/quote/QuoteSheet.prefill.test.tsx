import { offerText } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from './QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const p = t.pricing;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(bulkSa);
});

const sheet = (phone: string) => renderWithQuery(<QuoteSheet phone={phone} open onClose={jest.fn()} />);

test.each([
  ['+966501234567', 'SA'],
  ['+971501234567', 'AE'],
] as const)('a %s chat opens on its country (%s), still editable', async (phone, country) => {
  await sheet(phone);
  await screen.findByTestId('quote-preview');
  expect(mockApiFetch).toHaveBeenCalledWith(`/pricing/quote?tier=standard&duration=45&country=${country}&students=1&discount=0`);
  expect(screen.getByRole('radio', { name: p.countries[country], checked: true })).toBeTruthy();
});

test('any other code opens on «دولة أخرى» and asks in USD (no country sent)', async () => {
  await sheet('+447700900123');
  await screen.findByTestId('quote-preview');
  expect(mockApiFetch).toHaveBeenCalledWith('/pricing/quote?tier=standard&duration=45&students=1&discount=0');
  expect(screen.getByRole('radio', { name: p.otherCountry, checked: true })).toBeTruthy();
});

test('the preview is the calculator offer text, in Arabic; the discount is pills only', async () => {
  await sheet('+966501234567');
  expect((await screen.findByTestId('quote-preview')).props.children).toBe(offerText(bulkSa, ar.pricing));
  expect(screen.getByRole('radio', { name: p.discounts['15'] })).toBeTruthy();
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(1); // the pills' group; no free field
});
