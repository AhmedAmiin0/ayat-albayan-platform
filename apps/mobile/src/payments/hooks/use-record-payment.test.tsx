import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { balanceOf, page, payment, STUDENT, SUB_ID, subscription } from '@/payments/fixtures';
import type { PaymentInput } from '@/payments/lib/optimistic';
import type { Receipt } from '@/core/lib/receipts/receipt';
import { useRecordPayment } from './use-record-payment';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
const mockUpload = jest.fn();
jest.mock('@/core/lib/receipts/upload-receipt', () => ({
  ...jest.requireActual('@/core/lib/receipts/upload-receipt'),
  uploadReceipt: (...args: unknown[]) => mockUpload(...args),
}));

const listKey = ['payments', 'list', { studentId: 's1', pageSize: 5 }];
const otherKey = ['payments', 'list', { studentId: 's2', pageSize: 5 }];
const balanceKey = ['students', 's1', 'balance'];
const receipt: Receipt = { uri: 'file:///r.jpg', mime: 'image/jpeg', bytes: new ArrayBuffer(3), size: 3 };
const input: PaymentInput = {
  subscriptionId: SUB_ID,
  student: STUDENT,
  amount: 145,
  currency: 'SAR',
  method: 'bank',
  paidAt: '2026-10-01T10:00:00.000Z',
  receipt: null,
};

function setup() {
  const client = createTestQueryClient();
  client.setQueryData(listKey, page([payment()]));
  client.setQueryData(otherKey, page([]));
  client.setQueryData(balanceKey, balanceOf(subscription()));
  return { client, wrapper: queryWrapper(client) };
}
const ids = (data: unknown) => (data as ReturnType<typeof page>).items.map((p) => (p as { id: string }).id);

beforeEach(() => {
  mockApiSend.mockReset();
  mockUpload.mockReset();
});

test('row and paid show at once, only for this student; POST /payments without a receipt', async () => {
  let resolve: (v: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((r) => (resolve = r)));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useRecordPayment('s1'), { wrapper });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(ids(client.getQueryData(listKey))).toHaveLength(2));
  expect(ids(client.getQueryData(otherKey))).toEqual([]);
  expect(client.getQueryData(balanceKey)).toMatchObject({ current: { paid: 145 } });
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/payments', {
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    subscriptionId: SUB_ID,
    amount: 145,
    currency: 'SAR',
    method: 'bank',
    paidAt: input.paidAt,
  });
  await act(async () => resolve(payment({ id: 'p2' })));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
});

test('a refused payment rolls the list and the balance back', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'currency_mismatch', currency: 'SAR' }));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useRecordPayment('s1'), { wrapper });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(ids(client.getQueryData(listKey))).toEqual(['p1']);
  expect(client.getQueryData(balanceKey)).toMatchObject({ current: { paid: 0 } });
});

test('the receipt goes up first; a retry after a failed POST reuses its path', async () => {
  mockUpload.mockResolvedValue(`${SUB_ID}/a.jpg`);
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed'));
  const { wrapper } = setup();
  const { result } = await renderHook(() => useRecordPayment('s1'), { wrapper });
  await act(async () => result.current.mutate({ ...input, receipt }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  mockApiSend.mockResolvedValue(payment({ id: 'p2' }));
  await act(async () => result.current.mutate({ ...input, receipt }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockUpload).toHaveBeenCalledWith(SUB_ID, receipt);
  expect(mockApiSend).toHaveBeenLastCalledWith(
    'POST',
    '/payments',
    expect.objectContaining({ receiptPath: `${SUB_ID}/a.jpg` }),
  );
});

test('a failed upload never records the payment', async () => {
  mockUpload.mockRejectedValue(new Error('upload'));
  const { client, wrapper } = setup();
  const { result } = await renderHook(() => useRecordPayment('s1'), { wrapper });
  await act(async () => result.current.mutate({ ...input, receipt }));
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockApiSend).not.toHaveBeenCalled();
  expect(ids(client.getQueryData(listKey))).toEqual(['p1']);
});

test('a lost reply: the retry re-sends the same clientRequestId; the next payment gets a new one', async () => {
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed'));
  const { wrapper } = setup();
  const { result } = await renderHook(() => useRecordPayment('s1'), { wrapper });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(result.current.isError).toBe(true));
  mockApiSend.mockResolvedValue(payment({ id: 'p2' }));
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => result.current.mutate({ ...input, amount: 50 }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(3));
  const [lost, retry, next] = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(retry).toBe(lost);
  expect(next).not.toBe(lost);
});
