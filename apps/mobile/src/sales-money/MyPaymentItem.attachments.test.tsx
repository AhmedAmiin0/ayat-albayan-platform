import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { myPayment } from './fixtures';
import { MyPaymentItem } from './MyPaymentItem';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const view = new RegExp(t.payments.viewAttachments);
beforeEach(() => mockApiFetch.mockReset());

test('her bank payment: «عرض المرفقات» reads her own route, only once opened', async () => {
  mockApiFetch.mockResolvedValue([
    { id: 'a1', mime: 'image/png', size: 9, url: 'https://files.test/a1.png', expires_at: '', legacy: false },
  ]);
  const row = myPayment();
  await renderWithQuery(<MyPaymentItem payment={row} />);
  expect(mockApiFetch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: view }));
  expect(mockApiFetch).toHaveBeenCalledWith(`/sales/me/payments/${row.id}/attachments`);
  expect(await screen.findByLabelText(t.payments.attachmentN.replace('{n}', '1'))).toBeTruthy();
});

test('cash: nothing to view', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash' })} />);
  expect(screen.queryByRole('button', { name: view })).toBeNull();
});
