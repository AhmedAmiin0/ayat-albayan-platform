import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AssistantDetailScreen } from './AssistantDetailScreen';
import { ALL, ASSISTANT, commission, routes, termsRowOf } from '../api/fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));
let mockId = 'a1';
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({ id: mockId }) }));

const T = t.assistants.terms;
const show = (permissions: readonly string[] = ALL) => {
  mockApiFetch.mockImplementation(
    routes(permissions, { '/assistant-pay/terms': [termsRowOf(ASSISTANT)], '/assistant-pay/commissions': [commission()] }),
  );
  return renderWithQuery(<AssistantDetailScreen />);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockId = 'a1';
});

test('a writer saves the terms: PUT /assistant-pay/terms/:id with the shared schema’s body', async () => {
  mockApiSend.mockResolvedValue(ASSISTANT.terms);
  await show();
  expect(await screen.findByRole('header', { name: ASSISTANT.name })).toBeTruthy();
  await fireEvent.changeText(await screen.findByLabelText(T.salaryAmount), '3500');
  await fireEvent.changeText(screen.getByLabelText(T.valuePercent), '12.5');
  await fireEvent.press(screen.getByRole('button', { name: T.save }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PUT', '/assistant-pay/terms/a1', {
      salary: { amount: 3500, currency: 'EGP', startsOn: '2026-10-01' },
      commission: { type: 'percent', value: 12.5, currency: null, startsOn: '2026-10-01' },
    }),
  );
  expect(await screen.findByText(t.mobileSalesMoney.done.terms)).toBeTruthy();
});

test('a percent over 100 is refused before any request, with the web’s words', async () => {
  await show();
  await fireEvent.changeText(await screen.findByLabelText(T.valuePercent), '150');
  await fireEvent.press(screen.getByRole('button', { name: T.save }));
  expect(screen.getByText(t.assistants.error.percent_max_100)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a fixed commission asks for its currency; an API refusal reads its mapped message', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'commission_start_earlier' }));
  await show();
  await fireEvent.press(await screen.findByRole('radio', { name: T.fixed }));
  expect(screen.getByLabelText(T.commissionCurrency)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: T.save }));
  expect(await screen.findByText(t.assistants.error.commission_start_earlier)).toBeTruthy();
});

test('without assistantpay.write the terms are read-only and no void is offered', async () => {
  await show(['assistantpay.read']);
  expect(await screen.findByText(t.assistants.terms.title)).toBeTruthy();
  expect(screen.queryByRole('button', { name: T.save })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: t.assistants.tabs.commissions }));
  await screen.findByText(t.assistants.ledger.total);
  expect(screen.queryByRole('button', { name: t.assistants.ledger.void })).toBeNull();
});

test('void: the reason is required, then POST /void {reason} and the ledger is re-read', async () => {
  mockApiSend.mockResolvedValue({ id: 'c1' });
  await show();
  await fireEvent.press(await screen.findByRole('tab', { name: t.assistants.tabs.commissions }));
  expect(await screen.findByText(/AB-1001/)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/assistant-pay/commissions?assistantId=a1');
  await fireEvent.press(screen.getByRole('button', { name: t.assistants.ledger.void }));
  const confirm = () => fireEvent.press(screen.getByRole('button', { name: t.assistants.ledger.void }));
  await confirm();
  expect(screen.getByText(t.assistants.error.reason_required)).toBeTruthy();
  const reads = mockApiFetch.mock.calls.length;
  await fireEvent.changeText(screen.getByLabelText(t.finance.reason), 'سجل خاطئ');
  await confirm();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/assistant-pay/commissions/c1/void', { reason: 'سجل خاطئ' }));
  await waitFor(() => expect(mockApiFetch.mock.calls.length).toBeGreaterThan(reads));
  expect(await screen.findByText(t.mobileSalesMoney.done.void)).toBeTruthy();
});

test('an already voided commission says so in Arabic', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'already_voided' }));
  await show();
  await fireEvent.press(await screen.findByRole('tab', { name: t.assistants.tabs.commissions }));
  await fireEvent.press(await screen.findByRole('button', { name: t.assistants.ledger.void }));
  await fireEvent.changeText(screen.getByLabelText(t.finance.reason), 'سجل خاطئ');
  await fireEvent.press(screen.getByRole('button', { name: t.assistants.ledger.void }));
  expect(await screen.findByText(t.assistants.error.already_voided)).toBeTruthy();
});

test('an unknown id says the salesperson was not found', async () => {
  mockId = 'zz';
  await show();
  expect(await screen.findByText(t.assistants.notFound)).toBeTruthy();
});
