import type { PaymentAttachmentView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { payment } from '@/payments/fixtures';
import { renderWithQuery } from '@/test/query';
import { PaymentItem } from './PaymentItem';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const file = (over: Partial<PaymentAttachmentView>): PaymentAttachmentView => ({
  id: 'a1',
  mime: 'image/jpeg',
  size: 9,
  url: 'https://files.test/a1.jpg?t=1',
  expires_at: '',
  legacy: false,
  ...over,
});
const view = new RegExp(t.payments.viewAttachments);

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.restoreAllMocks();
});

test('a bank payment without receipt_path: «عرض المرفقات», asked only once opened; images inline, a PDF opens outside', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockApiFetch.mockResolvedValue([
    file({ id: 'receipt', legacy: true, mime: null, url: 'https://files.test/old.pdf?t=1' }),
    file({}),
  ]);
  await renderWithQuery(<PaymentItem payment={payment({ id: 'p9' })} />);
  expect(screen.queryByText(t.mobileMoney.noReceipt)).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: view }));
  expect(mockApiFetch).toHaveBeenCalledWith('/payments/p9/attachments');
  const image = await screen.findByLabelText(t.payments.attachmentN.replace('{n}', '1'));
  expect(image.props.source).toEqual({ uri: 'https://files.test/a1.jpg?t=1' });
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.payments.legacyReceipt) }));
  expect(open).toHaveBeenCalledWith('https://files.test/old.pdf?t=1');
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.mobileMoney.hideAttachments) }));
  expect(screen.queryByLabelText(t.payments.attachmentN.replace('{n}', '1'))).toBeNull();
});

test('none on file says so; a failed read says so', async () => {
  mockApiFetch.mockResolvedValue([]);
  const first = await renderWithQuery(<PaymentItem payment={payment({ id: 'p1' })} />);
  await fireEvent.press(screen.getByRole('button', { name: view }));
  expect(await screen.findByText(t.payments.noAttachments)).toBeTruthy();
  await first.unmount();
  mockApiFetch.mockRejectedValue(new Error('gone'));
  await renderWithQuery(<PaymentItem payment={payment({ id: 'p2' })} />);
  await fireEvent.press(screen.getByRole('button', { name: view }));
  expect(await screen.findByText(t.mobileMoney.attachmentsFailed)).toBeTruthy();
});

test('cash with a stored receipt has «المرفقات»; cash without anything says «بلا إيصال»', async () => {
  const first = await renderWithQuery(<PaymentItem payment={payment({ method: 'cash', receipt_path: 'sub/slip.jpg' })} />);
  expect(screen.getByRole('button', { name: view })).toBeTruthy();
  await first.unmount();
  await renderWithQuery(<PaymentItem payment={payment({ method: 'cash' })} />);
  expect(screen.getByText(t.mobileMoney.noReceipt)).toBeTruthy();
  expect(screen.queryByRole('button', { name: view })).toBeNull();
});
