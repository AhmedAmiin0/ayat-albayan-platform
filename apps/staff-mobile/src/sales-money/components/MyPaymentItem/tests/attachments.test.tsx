import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { myPayment } from '@/sales-money/testing/fixtures';
import { MyPaymentItem } from '@/sales-money/components/MyPaymentItem/MyPaymentItem';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const view = new RegExp(t.payments.viewAttachments);
beforeEach(() => mockApi.reset('read'));

test('her bank payment: «عرض المرفقات» reads her own route, only once opened', async () => {
  mockApi.onRead(() => [
    {
      id: 'a1',
      mime: 'image/png',
      size: 9,
      url: 'https://files.test/a1.png',
      expires_at: '',
      legacy: false,
    },
  ]);
  const row = myPayment();
  await renderWithQuery(<MyPaymentItem payment={row} />);
  expect(mockApi.reads()).toHaveLength(0);
  await fireEvent.press(screen.getByRole('button', { name: view }));
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: `/sales/me/payments/${row.id}/attachments`,
  });
  expect(await screen.findByLabelText(t.payments.attachmentN.replace('{n}', '1'))).toBeTruthy();
});

test('cash: nothing to view', async () => {
  await renderWithQuery(<MyPaymentItem payment={myPayment({ method: 'cash' })} />);
  expect(screen.queryByRole('button', { name: view })).toBeNull();
});
