import { offerText, priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ltr, t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const LIST = {
  ...priceList({ country: null, students: 1, discount: 0, usdRate: 0.266667 }),
  fx: null,
};
const p = t.pricing;
const q = t.inbox.quote;
const line = (country: string, code: string) =>
  q.clientCountry.replace('{country}', country).replace('{code}', ltr(code));
const anyLine = () =>
  screen.queryByText(q.clientCountry.split('{country}')[0] ?? '', { exact: false });
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
  ['+201000000005', '🇪🇬 مصر', '+20'],
  ['+2348031234567', '🇳🇬 نيجيريا', '+234'],
  ['+966501234567', '🇸🇦 السعودية', '+966'],
])(
  '%s: the line names the country of the number, with its flag and code',
  async (phone, country, code) => {
    await sheet(phone);
    expect(screen.getByText(line(country, code))).toBeTruthy();
  },
);

test.each([
  ['+77010000000', 'كازاخستان أو روسيا', '+7'],
  ['+12025550123', 'كندا أو جزر الولايات المتحدة الصغيرة النائية أو الولايات المتحدة', '+1'],
  ['+447700900123', 'المملكة المتحدة أو غيرنزي أو جزيرة مان', '+44'],
])(
  '%s: a shared code joins its countries, three at most, with no flag',
  async (phone, names, code) => {
    await sheet(phone);
    expect(screen.getByText(line(names, code))).toBeTruthy();
  },
);

test.each(['+99912345678', '+80012345678'])(
  '%s: a code no country has shows no line',
  async (phone) => {
    await sheet(phone);
    expect(anyLine()).toBeNull();
    expect(screen.getByRole('radio', { name: p.otherCountry, checked: true })).toBeTruthy();
  },
);

test('it is information only: an Egyptian number still opens on «دولة أخرى», priced in USD', async () => {
  await sheet('+201000000005');
  expect(screen.getByRole('radio', { name: p.otherCountry, checked: true })).toBeTruthy();
  expect(mockApiFetch.mock.calls).toEqual([
    ['/pricing/quote?tier=standard&duration=45&students=1&discount=0'],
  ]);
  expect(preview()).toBe(offerText(bulkSa, ar.pricing));
  expect(preview()).not.toContain('مصر');
});

test('the line stays on «كل الأسعار» and never enters the list', async () => {
  await sheet('+201000000005');
  await fireEvent.press(screen.getByRole('radio', { name: q.mode.all }));
  await waitFor(() => expect(preview()).toBe(priceListText(LIST, ar.pricing)));
  expect(mockApiFetch).toHaveBeenLastCalledWith(
    '/pricing/list?students=1&discount=0&rounding=nearest',
  );
  expect(screen.getByText(line('🇪🇬 مصر', '+20'))).toBeTruthy();
  expect(preview()).not.toContain('مصر');
});

test('choosing another country in the step leaves the line as the number says', async () => {
  await sheet('+201000000005');
  await fireEvent.press(screen.getByRole('radio', { name: p.countries.SA }));
  expect(screen.getByRole('radio', { name: p.countries.SA, checked: true })).toBeTruthy();
  expect(screen.getByText(line('🇪🇬 مصر', '+20'))).toBeTruthy();
});
