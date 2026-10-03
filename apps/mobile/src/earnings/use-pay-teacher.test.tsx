import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { PAYMENT } from './fixtures';
import type { PayInput } from './pay-draft';
import { usePayTeacher } from './use-pay-teacher';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiSend: (...a: unknown[]) => mockApiSend(...a) }));
const mockUpload = jest.fn();
jest.mock('./upload-receipt', () => ({ uploadTeacherReceipt: (...a: unknown[]) => mockUpload(...a) }));

const receipt = { uri: 'file:///r.jpg', mime: 'image/jpeg' as const, bytes: new ArrayBuffer(3), size: 3 };
const input: PayInput = { amount: 60, method: 'cash', paidAt: '2026-10-01T10:00:00.000Z', receipt: null, earningIds: ['e2'] };

beforeEach(() => {
  mockApiSend.mockReset();
  mockUpload.mockReset();
});

test('POST without a receipt: the ticked ids, the amount and a clientRequestId', async () => {
  mockApiSend.mockResolvedValue({ payment: PAYMENT, replayed: false });
  const { result } = await renderHook(() => usePayTeacher('t1'), { wrapper: queryWrapper(createTestQueryClient()) });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockUpload).not.toHaveBeenCalled();
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/teacher-earnings/t1/payments', {
    clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    amount: 60,
    method: 'cash',
    paidAt: input.paidAt,
    earningIds: ['e2'],
  });
});

test('a failed POST then a retry: same clientRequestId, the receipt is not uploaded twice', async () => {
  mockUpload.mockResolvedValue('t1/a.jpg');
  mockApiSend.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue({ payment: PAYMENT, replayed: true });
  const { result } = await renderHook(() => usePayTeacher('t1'), { wrapper: queryWrapper(createTestQueryClient()) });
  const withReceipt = { ...input, receipt, earningIds: undefined };
  await act(async () => result.current.mutate(withReceipt));
  await waitFor(() => expect(result.current.isError).toBe(true));
  await act(async () => result.current.mutate(withReceipt));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockUpload).toHaveBeenCalledTimes(1);
  const [first, second] = mockApiSend.mock.calls.map((c) => c[2] as { clientRequestId: string; receiptPath: string; earningIds?: string[] });
  expect(second?.clientRequestId).toBe(first?.clientRequestId);
  expect(first?.receiptPath).toBe('t1/a.jpg');
  expect(first?.earningIds).toBeUndefined();
});

test('after success the next payment gets a new clientRequestId; the teacher’s earnings refetch', async () => {
  mockApiSend.mockResolvedValue({ payment: PAYMENT, replayed: false });
  const client = createTestQueryClient();
  const spy = jest.spyOn(client, 'invalidateQueries');
  const { result } = await renderHook(() => usePayTeacher('t1'), { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => result.current.mutate(input));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  const [a, b] = mockApiSend.mock.calls.map((c) => (c[2] as { clientRequestId: string }).clientRequestId);
  expect(a).not.toBe(b);
  expect(spy).toHaveBeenCalledWith({ queryKey: ['teacher-earnings', 't1'] });
});
