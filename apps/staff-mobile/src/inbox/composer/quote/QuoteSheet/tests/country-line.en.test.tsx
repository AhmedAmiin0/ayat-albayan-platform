import { offerText, priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ltr } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const LIST = {
  ...priceList({ country: null, students: 1, discount: 10, usdRate: 0.266667 }),
  fx: null,
};
const q = en.inbox.quote;
const line = (country: string, code: string) =>
  q.clientCountry.replace('{country}', country).replace('{code}', ltr(code));
const preview = () => screen.getByTestId('quote-preview').props.children as string;

beforeEach(() => {
  const answer = async (path: string) => (path.startsWith('/pricing/list') ? LIST : bulkSa);
  mockApiFetch.mockReset().mockImplementation(answer);
});

async function sheet(phone: string) {
  await renderWithQuery(<QuoteSheet phone={phone} open onClose={jest.fn()} />);
  await screen.findByTestId('quote-preview');
}

test.each([
  ['+201000000005', '🇪🇬 Egypt', '+20'],
  ['+77010000000', 'Russia or Kazakhstan', '+7'],
  ['+447700900123', '🇬🇧 United Kingdom', '+44'],
])('English UI, %s: the line and the country names are English', async (phone, country, code) => {
  await sheet(phone);
  expect(screen.getByText(line(country, code))).toBeTruthy();
});

test('English UI: the controls are English, the client’s offer stays Arabic', async () => {
  await sheet('+201000000005');
  expect(screen.getByLabelText(q.mode.label)).toBeTruthy();
  expect(screen.getByRole('radio', { name: q.mode.one, checked: true })).toBeTruthy();
  expect(screen.getByRole('radio', { name: q.mode.all, checked: false })).toBeTruthy();
  expect(preview()).toBe(offerText(bulkSa, ar.pricing));
});

test('English UI: the price list and its rounding choice; the list itself stays Arabic', async () => {
  await sheet('+201000000005');
  await fireEvent.press(screen.getByRole('radio', { name: en.pricing.discounts['10'] }));
  await fireEvent.press(screen.getByRole('radio', { name: q.mode.all }));
  await waitFor(() => expect(preview()).toBe(priceListText(LIST, ar.pricing)));
  expect(preview()).toContain(ar.pricing.listIntro);
  expect(screen.getByLabelText(q.rounding.label)).toBeTruthy();
  for (const name of [q.rounding.up, q.rounding.down]) {
    expect(screen.getByRole('radio', { name, checked: false })).toBeTruthy();
  }
  expect(screen.getByRole('radio', { name: q.rounding.nearest, checked: true })).toBeTruthy();
});
