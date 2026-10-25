import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { riyadhToday } from '@/calendar/week';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { payment } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { PaymentsScreen } from './PaymentsScreen';
import { monthLabel, monthRange, recentMonths } from './months';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// Cash paid against a booking invoice: the invoice is the receipt (ReceiptViewer); bank files are in
// «المرفقات» (PaymentItem.attachments.test).
const slip = payment({ id: 'p1', method: 'cash', invoice_id: 'inv1' });
const refund = payment({ id: 'p2', method: 'cash', kind: 'refund', amount: 20, student: { id: 's2', code: 'AB-0201', name: 'يوسف' } });
const pdf = payment({ id: 'p3', method: 'cash', invoice_id: 'inv3', student: { id: 's3', code: 'AB-0202', name: 'مريم' } });
const totals = [{ currency: 'SAR', net: 250, payments: 270, refunds: 20 }];

function backend(items = [slip, refund, pdf]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith('/receipt')) {
      return { url: path.includes('p3') ? 'https://files.test/slip.pdf?t=1' : 'https://files.test/slip.jpg?t=1' };
    }
    return { items, total: items.length, page: 1, pageSize: 25, totals };
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.restoreAllMocks();
});

test('rows: student, amount, method, day, recorder; the refund says «استرداد»; the net is on top', async () => {
  backend();
  await renderWithQuery(<PaymentsScreen />);
  expect(await screen.findByText('يوسف')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/payments?page=1&pageSize=25');
  expect(screen.getByText(money(250, 'SAR'))).toBeTruthy();
  expect(screen.getByText(t.mobileMoney.refundsOf.replace('{amount}', money(20, 'SAR')))).toBeTruthy();
  expect(screen.getByText(`${t.enums.paymentKind.refund} ${money(20, 'SAR')}`)).toBeTruthy();
  expect(screen.getByText(ltr('AB-0201'))).toBeTruthy();
  expect(screen.getAllByText(/الإدارة/).length).toBe(3);
});

test('type and month chips filter on the server', async () => {
  backend();
  await renderWithQuery(<PaymentsScreen />);
  await screen.findByText('يوسف');
  await fireEvent.press(screen.getByRole('tab', { name: t.enums.paymentKind.refund }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/payments?kind=refund&page=1&pageSize=25'));
  const month = recentMonths(riyadhToday(new Date()))[1] ?? '';
  const { from, to } = monthRange(month);
  await fireEvent.press(screen.getByRole('tab', { name: monthLabel(month) }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(`/payments?kind=refund&from=${from}&to=${to}&page=1&pageSize=25`),
  );
});

test('«عرض الإيصال» fetches the signed URL only then, and shows the image', async () => {
  backend([slip]);
  await renderWithQuery(<PaymentsScreen />);
  await screen.findByText('هدى');
  expect(mockApiFetch).not.toHaveBeenCalledWith('/payments/p1/receipt');
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.mobileMoney.viewReceipt) }));
  const image = await screen.findByLabelText(t.mobileMoney.receiptA11y.replace('{student}', 'هدى'));
  expect(image.props.source).toEqual({ uri: 'https://files.test/slip.jpg?t=1' });
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.mobileMoney.hideReceipt) }));
  expect(screen.queryByLabelText(t.mobileMoney.receiptA11y.replace('{student}', 'هدى'))).toBeNull();
});

test('a PDF receipt opens in the phone`s viewer', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  backend([pdf]);
  await renderWithQuery(<PaymentsScreen />);
  await screen.findByText('مريم');
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.mobileMoney.viewReceipt) }));
  await fireEvent.press(await screen.findByRole('button', { name: t.mobileMoney.openPdf }));
  expect(open).toHaveBeenCalledWith('https://files.test/slip.pdf?t=1');
});

test('a receipt that cannot load says so; a payment without one says «بلا إيصال»', async () => {
  backend([slip, refund]);
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.endsWith('/receipt')) throw new Error('gone');
    return { items: [slip, refund], total: 2, page: 1, pageSize: 25, totals };
  });
  await renderWithQuery(<PaymentsScreen />);
  await screen.findByText('يوسف');
  expect(screen.getByText(t.mobileMoney.noReceipt)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.mobileMoney.viewReceipt) }));
  expect(await screen.findByText(t.mobileMoney.receiptFailed)).toBeTruthy();
});

test('read-only: the web-only note, and no edit or void controls', async () => {
  backend([slip]);
  await renderWithQuery(<PaymentsScreen />);
  expect(await screen.findByText(t.mobileMoney.webOnlyEdit)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.finance.editPayment })).toBeNull();
});

test('empty period and failed read', async () => {
  backend([]);
  const first = await renderWithQuery(<PaymentsScreen />);
  expect(await screen.findByRole('header', { name: t.mobileMoney.paymentsEmpty })).toBeTruthy();
  first.unmount();
  mockApiFetch.mockReset();
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<PaymentsScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
