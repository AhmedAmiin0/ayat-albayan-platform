import { offerText, priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { currencyName, t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const LIST = { ...priceList({ country: 'SA', students: 1, discount: 0 }), fx: null };
const LIST_TEXT = priceListText(LIST, ar.pricing);
const OFFER = offerText(bulkSa, ar.pricing);
const p = t.pricing;
const q = t.inbox.quote;
const c = t.subscriptions.customPrice;

const paths = (): string[] => mockApiFetch.mock.calls.map(([path]) => String(path));
const lastPath = (): string => paths().at(-1) ?? '';
const press = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const on = (name: string) => screen.getByRole('radio', { name, checked: true });
const step = (title: string) => screen.queryByRole('header', { name: title });
const preview = () => screen.getByTestId('quote-preview').props.children as string;
const customPill = () => screen.queryByRole('checkbox', { name: t.paymentLinks.customAmount });
const amount = () => screen.getByLabelText(c.label.replace('{currency}', currencyName('SAR')));
const sendOff = () =>
  screen.getByRole('button', { name: q.send }).props.accessibilityState?.disabled;

beforeEach(() => {
  const answer = async (path: string) => (path.startsWith('/pricing/list') ? LIST : bulkSa);
  mockApiFetch.mockReset().mockImplementation(answer);
});

async function sheet() {
  await renderWithQuery(<QuoteSheet phone="+966501234567" open onClose={jest.fn()} />);
  await screen.findByTestId('quote-preview');
}

async function listSheet() {
  await sheet();
  await press(q.mode.all);
  await waitFor(() => expect(preview()).toBe(LIST_TEXT));
}

test('opens on «باقة واحدة»: today’s steps and offer, and no list is asked', async () => {
  await sheet();
  expect(screen.getByLabelText(q.mode.label)).toBeTruthy();
  expect(on(q.mode.one)).toBeTruthy();
  for (const title of Object.values(p.steps)) expect(step(title)).toBeTruthy();
  expect(customPill()).toBeTruthy();
  expect(preview()).toBe(OFFER);
  expect(paths()).toEqual([
    '/pricing/quote?tier=standard&duration=45&country=SA&students=1&discount=0',
  ]);
});

test('«كل الأسعار» asks the list for the chat’s country and shows its text', async () => {
  await listSheet();
  expect(on(q.mode.all)).toBeTruthy();
  expect(lastPath()).toBe('/pricing/list?country=SA&students=1&discount=0&rounding=nearest');
  expect(preview()).toContain(ar.pricing.listIntro);
  expect(sendOff()).toBeFalsy();
});

test('«كل الأسعار» keeps country, students and discount; duration, package and custom amount go', async () => {
  await listSheet();
  for (const title of [p.steps.country, p.steps.students, p.steps.discount]) {
    expect(step(title)).toBeTruthy();
  }
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(2);
  expect(step(p.steps.duration)).toBeNull();
  expect(step(p.steps.frequency)).toBeNull();
  expect(screen.queryByRole('radio', { name: p.durations['45'] })).toBeNull();
  expect(screen.queryByRole('radio', { name: p.frequencies.standard })).toBeNull();
  expect(customPill()).toBeNull();
});

test('the list is asked with the chosen country, students and discount', async () => {
  await listSheet();
  await press(p.countries.AE);
  await fireEvent.press(screen.getByRole('button', { name: p.increase }));
  await press(p.discounts['15']);
  expect(lastPath()).toBe('/pricing/list?country=AE&students=2&discount=15&rounding=nearest');
  await press(p.otherCountry);
  expect(lastPath()).toBe('/pricing/list?students=2&discount=15&rounding=nearest');
});

test('back on «باقة واحدة» the single offer returns; choices made on either side are kept', async () => {
  await sheet();
  await press(p.durations['60']);
  await press(p.frequencies.bulk);
  await press(p.countries.AE);
  await fireEvent.press(screen.getByRole('button', { name: p.increase }));
  await press(p.discounts['10']);
  await press(q.mode.all);
  expect(lastPath()).toBe('/pricing/list?country=AE&students=2&discount=10&rounding=nearest');
  await waitFor(() => expect(preview()).toBe(LIST_TEXT));
  for (const name of [p.countries.AE, p.discounts['10']]) expect(on(name)).toBeTruthy();
  await press(p.countries.QA);
  await press(p.discounts['15']);
  await press(q.mode.one);
  expect(lastPath()).toBe('/pricing/quote?tier=bulk&duration=60&country=QA&students=2&discount=15');
  await waitFor(() => expect(sendOff()).toBeFalsy());
  expect(preview()).toBe(OFFER);
  const kept = [p.countries.QA, p.durations['60'], p.frequencies.bulk, p.discounts['15']];
  for (const name of [q.mode.one, ...kept]) expect(on(name)).toBeTruthy();
});

test('an invalid custom amount holds the single offer only: the list may still leave', async () => {
  await sheet();
  const pill = customPill();
  if (!pill) throw new Error('no custom amount toggle');
  await fireEvent.press(pill);
  await fireEvent.changeText(amount(), 'abc');
  expect(sendOff()).toBe(true);
  await press(q.mode.all);
  await waitFor(() => expect(preview()).toBe(LIST_TEXT));
  expect(screen.queryByText(c.invalid)).toBeNull();
  expect(sendOff()).toBeFalsy();
  await press(q.mode.one);
  expect(amount().props.value).toBe('abc');
  expect(sendOff()).toBe(true);
});
