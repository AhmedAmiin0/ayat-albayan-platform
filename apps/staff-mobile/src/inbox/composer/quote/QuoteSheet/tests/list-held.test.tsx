import { priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const listOf = (discount: number) => ({
  ...priceList({ country: 'SA', students: 1, discount }),
  fx: null,
});
const TEXT = priceListText(listOf(0), ar.pricing);
const TEXT_10 = priceListText(listOf(10), ar.pricing);
const p = t.pricing;
const q = t.inbox.quote;
const ACTIONS = [q.send, q.edit, q.copy];
const isList = (path: string) => path.startsWith('/pricing/list');
const offline = () => Promise.reject(new Error('offline'));
const press = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const off = (name: string) =>
  screen.getByRole('button', { name }).props.accessibilityState?.disabled;
const preview = () => screen.getByTestId('quote-preview');
const text = () => preview().props.children as string;
const opacity = () => StyleSheet.flatten(preview().props.style).opacity;

/** Answers every list request with `list`: a value, a rejection or a pending promise. */
function lists(list: () => Promise<unknown>) {
  mockApiFetch.mockImplementation((path: string) =>
    isList(path) ? list() : Promise.resolve(bulkSa),
  );
}

beforeEach(() => {
  mockApiFetch.mockReset();
  lists(() => Promise.resolve(listOf(0)));
});

async function sheet() {
  await renderWithQuery(<QuoteSheet phone="+966501234567" open onClose={jest.fn()} />);
  await screen.findByTestId('quote-preview');
}

async function listSheet() {
  await sheet();
  await press(q.mode.all);
  await waitFor(() => expect(text()).toBe(TEXT));
}

test('while the next list loads the last one stays, dimmed, and nothing may leave', async () => {
  await listSheet();
  expect(opacity()).toBe(1);
  let answer: (list: unknown) => void = () => undefined;
  lists(() => new Promise((resolve) => (answer = resolve)));
  await press(p.discounts['10']);
  expect(text()).toBe(TEXT);
  expect(opacity()).toBeLessThan(1);
  for (const name of ACTIONS) expect(off(name)).toBe(true);
  await act(async () => answer(listOf(10)));
  await waitFor(() => expect(text()).toBe(TEXT_10));
  expect(opacity()).toBe(1);
  for (const name of ACTIONS) expect(off(name)).toBeFalsy();
});

test('a list that cannot be loaded: the error, nothing may leave; «retry» loads it', async () => {
  await sheet();
  lists(offline);
  await press(q.mode.all);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByTestId('quote-preview')).toBeNull();
  for (const name of ACTIONS) expect(off(name)).toBe(true);
  lists(() => Promise.resolve(listOf(0)));
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  await waitFor(() => expect(text()).toBe(TEXT));
  for (const name of ACTIONS) expect(off(name)).toBeFalsy();
});

test('a new choice whose list fails shows the error, never the last choice’s list', async () => {
  await listSheet();
  lists(offline);
  await press(p.discounts['10']);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByTestId('quote-preview')).toBeNull();
  for (const name of ACTIONS) expect(off(name)).toBe(true);
});

test('an answer that is not a price list is refused: nothing to send', async () => {
  await sheet();
  lists(() => Promise.resolve(bulkSa));
  await press(q.mode.all);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  for (const name of ACTIONS) expect(off(name)).toBe(true);
});

test('the failed list does not hold the single offer: back on «باقة واحدة» it may leave', async () => {
  await sheet();
  lists(offline);
  await press(q.mode.all);
  await screen.findByText(t.common.error);
  await press(q.mode.one);
  expect(screen.queryByText(t.common.error)).toBeNull();
  await waitFor(() => expect(off(q.send)).toBeFalsy());
});
