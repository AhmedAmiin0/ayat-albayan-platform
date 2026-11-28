import { priceList } from '@ab/money';
import { pricingRoutes } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@ab/mobile-kit';
import { bulkSa } from '@/finance/pricing/fixtures';
import { renderWithQuery } from '@/test/query';
import { QuoteSheet } from '@/inbox/composer/quote/QuoteSheet/QuoteSheet';

const mockApiFetch = jest.fn();
const mockCall = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  call: (mockRequest: unknown) => mockCall(mockRequest),
}));

const PHONE = '+966501234567';
const LIST = { ...priceList({ country: 'SA', students: 1, discount: 0 }), fx: null };
const PDF = { path: 'out/u/r/price-list.pdf', url: 'https://files.test/p', filename: 'x.pdf' };
const p = t.inbox.quote.pdf;
const button = (name: string) => screen.getByRole('button', { name });
const off = (name: string) => button(name).props.accessibilityState?.disabled;
const openUrl = jest.spyOn(Linking, 'openURL');

interface Sent {
  route?: unknown;
  path?: string;
  body: { clientRequestId: string };
}
const calls = () => mockCall.mock.calls.map(([r]) => r as Sent);

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(async (path: string) =>
    path.startsWith('/pricing/list') ? LIST : bulkSa,
  );
  mockCall.mockReset().mockImplementation(async (r: Sent) =>
    r.route === pricingRoutes.listPdf ? PDF : { id: 'm1' },
  );
  openUrl.mockReset().mockResolvedValue(true);
});

async function allPrices(open = true) {
  const onClose = jest.fn();
  await renderWithQuery(<QuoteSheet phone={PHONE} open={open} onClose={onClose} />);
  await screen.findByTestId('quote-preview');
  await fireEvent.press(screen.getByRole('radio', { name: t.inbox.quote.mode.all }));
  return onClose;
}

test('the PDF action shows only in the all-prices mode', async () => {
  await renderWithQuery(<QuoteSheet phone={PHONE} open onClose={jest.fn()} />);
  await screen.findByTestId('quote-preview');
  expect(screen.queryByRole('button', { name: p.create })).toBeNull();
  await fireEvent.press(screen.getByRole('radio', { name: t.inbox.quote.mode.all }));
  expect(button(p.create)).toBeTruthy();
});

test('creates the PDF for the chosen list, opens it, then sends it into the chat', async () => {
  const onClose = await allPrices();
  await fireEvent.press(button(p.create));
  await screen.findByRole('button', { name: p.open });
  const [made] = calls();
  expect(made).toMatchObject({ route: pricingRoutes.listPdf, body: { country: 'SA', discount: 0 } });
  await fireEvent.press(button(p.open));
  expect(openUrl).toHaveBeenCalledWith(PDF.url);
  await fireEvent.press(button(p.send));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(calls()[1]).toEqual({
    method: 'POST',
    path: `/threads/${encodeURIComponent(PHONE)}/file`,
    body: { clientRequestId: made?.body.clientRequestId, path: PDF.path, filename: PDF.filename },
  });
});

test('a new choice drops the prepared PDF: it is made again for the new prices', async () => {
  await allPrices();
  await fireEvent.press(button(p.create));
  await screen.findByRole('button', { name: p.open });
  await fireEvent.press(screen.getByRole('radio', { name: t.pricing.discounts['10'] }));
  expect(screen.queryByRole('button', { name: p.open })).toBeNull();
  expect(button(p.create)).toBeTruthy();
});

test('outside the 24 h window the PDF opens but cannot be sent', async () => {
  await allPrices(false);
  await fireEvent.press(button(p.create));
  await screen.findByRole('button', { name: p.open });
  expect(off(p.send)).toBe(true);
});

test('a failed PDF says so and sends nothing', async () => {
  mockCall.mockRejectedValueOnce(new Error('render failed'));
  await allPrices();
  await fireEvent.press(button(p.create));
  expect(await screen.findByText(p.failed)).toBeTruthy();
  expect(screen.queryByRole('button', { name: p.send })).toBeNull();
});
