import { priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const LIST = { ...priceList({ country: 'SA', students: 1, discount: 10 }), fx: null };
const LIST_TEXT = priceListText(LIST, ar.pricing);
const QUOTE = '/pricing/quote?tier=standard&duration=45&country=SA&students=1';
const LISTED = '/pricing/list?country=SA&students=1';
const p = t.pricing;
const q = t.inbox.quote;
const r = q.rounding;

const paths = (): string[] => mockApiFetch.mock.calls.map(([path]) => String(path));
const lastPath = (): string => paths().at(-1) ?? '';
const press = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const on = (name: string) => screen.getByRole('radio', { name, checked: true });
const choice = () => screen.queryByLabelText(r.label);
const preview = () => screen.getByTestId('quote-preview').props.children as string;
const customPill = () => screen.getByRole('checkbox', { name: t.paymentLinks.customAmount });

beforeEach(() => {
  const answer = async (path: string) => (path.startsWith('/pricing/list') ? LIST : bulkSa);
  mockApiFetch.mockReset().mockImplementation(answer);
});

async function sheet() {
  await renderWithQuery(<QuoteSheet phone="+966501234567" open onClose={jest.fn()} />);
  await screen.findByTestId('quote-preview');
}

test('no discount: no rounding choice, in either mode', async () => {
  await sheet();
  expect(choice()).toBeNull();
  await press(q.mode.all);
  await waitFor(() => expect(preview()).toBe(LIST_TEXT));
  expect(choice()).toBeNull();
  expect(screen.queryByRole('radio', { name: r.up })).toBeNull();
});

test('a discount brings «التقريب» on «الأقرب»; the request is still today’s', async () => {
  await sheet();
  await press(p.discounts['10']);
  expect(choice()).toBeTruthy();
  expect(screen.getByRole('header', { name: r.label })).toBeTruthy();
  expect(on(r.nearest)).toBeTruthy();
  for (const name of [r.up, r.down]) {
    expect(screen.getByRole('radio', { name, checked: false })).toBeTruthy();
  }
  expect(lastPath()).toBe(`${QUOTE}&discount=10`);
});

test('a typed discount brings it too, and it goes when the field is emptied', async () => {
  await sheet();
  await fireEvent.changeText(screen.getByDisplayValue('0'), '7.5');
  expect(choice()).toBeTruthy();
  await fireEvent.changeText(screen.getByDisplayValue('7.5'), '');
  expect(choice()).toBeNull();
});

test('«للأعلى» and «للأدنى» reach the quote request; «الأقرب» asks today’s again', async () => {
  await sheet();
  await press(p.discounts['10']);
  await press(r.up);
  expect(on(r.up)).toBeTruthy();
  expect(lastPath()).toBe(`${QUOTE}&discount=10&rounding=up`);
  await press(r.down);
  expect(lastPath()).toBe(`${QUOTE}&discount=10&rounding=down`);
  await press(r.nearest);
  expect(on(r.nearest)).toBeTruthy();
  expect(lastPath()).toBe(`${QUOTE}&discount=10`);
});

test('the choice reaches the list request and survives the switch both ways', async () => {
  await sheet();
  await press(p.discounts['10']);
  await press(r.up);
  await press(q.mode.all);
  expect(lastPath()).toBe(`${LISTED}&discount=10&rounding=up`);
  expect(on(r.up)).toBeTruthy();
  await press(r.down);
  expect(lastPath()).toBe(`${LISTED}&discount=10&rounding=down`);
  await press(r.nearest);
  expect(lastPath()).toBe(`${LISTED}&discount=10&rounding=nearest`);
  await press(r.down);
  await press(q.mode.one);
  expect(on(r.down)).toBeTruthy();
  expect(lastPath()).toBe(`${QUOTE}&discount=10&rounding=down`);
});

test('the discount back at 0 hides the choice and asks today’s request; it returns as left', async () => {
  await sheet();
  await press(p.discounts['10']);
  await press(r.up);
  await press(p.discounts['0']);
  expect(choice()).toBeNull();
  expect(lastPath()).toBe(`${QUOTE}&discount=0`);
  await press(p.discounts['5']);
  expect(on(r.up)).toBeTruthy();
  expect(lastPath()).toBe(`${QUOTE}&discount=5&rounding=up`);
  await press(q.mode.all);
  await press(p.discounts['0']);
  expect(lastPath()).toBe(`${LISTED}&discount=0&rounding=nearest`);
});

test('«مبلغ مخصص» hides the choice and asks nothing new: the typed amount is the total', async () => {
  await sheet();
  await press(p.discounts['10']);
  await press(r.up);
  const asked = paths().length;
  await fireEvent.press(customPill());
  expect(choice()).toBeNull();
  expect(paths()).toHaveLength(asked);
  await fireEvent.press(customPill());
  expect(on(r.up)).toBeTruthy();
});

test('«مبلغ مخصص» left on does not hide the choice on «كل الأسعار», where it has no say', async () => {
  await sheet();
  await press(p.discounts['10']);
  await fireEvent.press(customPill());
  await press(q.mode.all);
  expect(choice()).toBeTruthy();
  await press(r.up);
  expect(lastPath()).toBe(`${LISTED}&discount=10&rounding=up`);
});
