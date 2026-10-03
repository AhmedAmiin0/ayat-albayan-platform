import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { PaySheet } from './PaySheet';
import { egp } from './text';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiSend: (...a: unknown[]) => mockApiSend(...a) }));

const e = t.teacherEarnings;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const done = jest.fn();
const close = jest.fn();
const sheet = <PaySheet open base="/teachers/t1" due={150} earningIds={['e3', 'e2']} onDone={done} onClose={close} />;

const amount = () => screen.getByLabelText(e.payAmount);
const submit = () => fireEvent.press(screen.getByRole('button', { name: e.submit }));
const bodyOf = (call: number) => (mockApiSend.mock.calls[call] as unknown[])[2] as Record<string, unknown>;

beforeEach(() => jest.clearAllMocks());

test('the amount starts at the selected total; the method is not preselected', async () => {
  await renderWithQuery(sheet);
  expect(amount().props.value).toBe('150');
  expect(screen.getByText(e.selectedDue.replace('{amount}', egp(150)))).toBeTruthy();
  await submit();
  expect(screen.getByText(t.common.required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('more than what is owed is blocked and never sent', async () => {
  await renderWithQuery(sheet);
  await fireEvent.changeText(amount(), '150.5');
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.cash }));
  await submit();
  expect(screen.getByText(e.error.over_payment)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a part-payment goes to POST with the ticked ids, a uuid and no receipt; the lists refresh', async () => {
  mockApiSend.mockResolvedValue({ id: 'p9' });
  const client = createTestQueryClient();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(sheet, client);
  await fireEvent.changeText(amount(), '60');
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.wallet }));
  await fireEvent.changeText(screen.getByLabelText(e.note), ' دفعة ');
  await submit();
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(close).toHaveBeenCalled();
  const [method, path] = mockApiSend.mock.calls[0] as [string, string];
  expect([method, path]).toEqual(['POST', '/teachers/t1/earnings/payments']);
  const body = bodyOf(0);
  expect(body).toMatchObject({ amount: 60, method: 'wallet', note: 'دفعة', earningIds: ['e3', 'e2'] });
  expect(String(body['clientRequestId'])).toMatch(UUID);
  expect(typeof body['paidAt']).toBe('string');
  expect(body).not.toHaveProperty('receiptPath');
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['teachers', 't1', 'earnings'] });
});

test('a retry after a failure re-sends the same clientRequestId; a changed amount gets a new one', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(500)).mockRejectedValueOnce(new ApiError(500)).mockResolvedValue({});
  await renderWithQuery(sheet);
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.cash }));
  await submit();
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  await submit();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(2));
  expect(bodyOf(1)['clientRequestId']).toBe(bodyOf(0)['clientRequestId']);
  expect(bodyOf(1)['paidAt']).toBe(bodyOf(0)['paidAt']);
  await fireEvent.changeText(amount(), '100');
  await submit();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledTimes(3));
  expect(bodyOf(2)['clientRequestId']).not.toBe(bodyOf(0)['clientRequestId']);
});

test('an API code shows its wording and keeps the form', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'client_request_reused' }));
  await renderWithQuery(sheet);
  await fireEvent.press(screen.getByRole('radio', { name: t.enums.paymentMethod.cash }));
  await submit();
  expect(await screen.findByText(e.error.client_request_reused)).toBeTruthy();
  expect(amount().props.value).toBe('150');
  expect(done).not.toHaveBeenCalled();
});

test('closed: nothing is mounted', async () => {
  await renderWithQuery(<PaySheet open={false} base="/teachers/t1" due={10} onDone={done} onClose={close} />);
  expect(screen.queryByLabelText(e.payAmount)).toBeNull();
});
