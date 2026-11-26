import { offerText, priceList, priceListText } from '@ab/money';
import ar from '@ab/shared/i18n/ar.json';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { pathKey, t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const LIST = { ...priceList({ country: 'SA', students: 1, discount: 12.5 }), fx: null };
const QUOTE = '/pricing/quote?tier=standard&duration=45&country=SA&students=1';
const p = t.pricing;
const q = t.inbox.quote;

const lastPath = (): string => String(mockApiFetch.mock.calls.at(-1)?.[0]);
const press = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const typed = (value: string) => screen.getByDisplayValue(value);
const preview = () => screen.getByTestId('quote-preview').props.children as string;
const sendOff = () =>
  screen.getByRole('button', { name: q.send }).props.accessibilityState?.disabled;

async function sheet(permissions: string[] = ['pricing.read']) {
  const me = { role: 'sales', permissions };
  const answer = async (path: string) => {
    if (path === '/auth/me') return me;
    return path.startsWith('/pricing/list') ? LIST : bulkSa;
  };
  mockApiFetch.mockReset().mockImplementation(answer);
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), me);
  await renderWithQuery(<QuoteSheet phone="+966501234567" open onClose={jest.fn()} />, client);
  await screen.findByTestId('quote-preview');
}

test('the free discount field stands beside the pills, on the pill’s value', async () => {
  await sheet();
  expect(screen.getAllByLabelText(p.steps.discount)).toHaveLength(2);
  expect(typed('0').props.keyboardType).toBe('decimal-pad');
  await press(p.discounts['15']);
  expect(typed('15')).toBeTruthy();
});

test('a typed percent reaches the quote request: decimals, Arabic digits, held to 0–100', async () => {
  await sheet();
  await fireEvent.changeText(typed('0'), '12.5');
  expect(lastPath()).toBe(`${QUOTE}&discount=12.5`);
  expect(screen.queryByRole('radio', { name: p.discounts['15'], checked: true })).toBeNull();
  await fireEvent.changeText(typed('12.5'), '٧');
  expect(lastPath()).toBe(`${QUOTE}&discount=7`);
  await fireEvent.changeText(typed('٧'), '150');
  expect(lastPath()).toBe(`${QUOTE}&discount=100`);
  expect(preview()).toBe(offerText(bulkSa, ar.pricing));
});

test('a typed percent reaches the list request, and the list says it as it was chosen', async () => {
  await sheet();
  await fireEvent.changeText(typed('0'), '12.5');
  await press(q.mode.all);
  expect(lastPath()).toBe('/pricing/list?country=SA&students=1&discount=12.5&rounding=nearest');
  await waitFor(() => expect(preview()).toBe(priceListText(LIST, ar.pricing)));
  expect(preview()).toContain(ar.pricing.listDiscount.replace('{pct}', '12.5'));
  await fireEvent.changeText(typed('12.5'), '٣٠');
  expect(lastPath()).toBe('/pricing/list?country=SA&students=1&discount=30&rounding=nearest');
});

test.each([
  ['sales', ['pricing.read']],
  ['the admin', ['pricing.read', 'subscriptions.write']],
])('%s may type any percent, and the offer may leave', async (_role, permissions) => {
  await sheet(permissions);
  await fireEvent.changeText(typed('0'), '60');
  expect(lastPath()).toBe(`${QUOTE}&discount=60`);
  await waitFor(() => expect(sendOff()).toBeFalsy());
});
