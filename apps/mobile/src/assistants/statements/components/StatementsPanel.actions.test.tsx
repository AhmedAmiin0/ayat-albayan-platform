import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ALL, ASSISTANT, routes, statement } from '../../api/fixtures';
import { StatementsPanel } from './StatementsPanel';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (...a: unknown[]) => mockApiSend(...a),
}));

const onNotice = jest.fn();
const ALL_CAN = { read: true, write: true, approve: true };
const show = (rows: unknown[], can = ALL_CAN) => {
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/statements': rows }));
  return renderWithQuery(<StatementsPanel assistants={[ASSISTANT]} assistantId="a1" can={can} onNotice={onNotice} />);
};
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const statementReads = () => mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith('/assistant-pay/statements')).length;

beforeEach(() => jest.clearAllMocks());

test('«اعتماد» asks once, then POSTs approve with no body and re-reads the statements', async () => {
  mockApiSend.mockResolvedValue(statement({ status: 'approved' }));
  await show([statement()]);
  await screen.findByText(t.payouts.approve);
  await press(t.payouts.approve);
  expect(mockApiSend).not.toHaveBeenCalled();
  const before = statementReads();
  const confirms = screen.getAllByRole('button', { name: t.payouts.approve });
  await fireEvent.press(confirms[confirms.length - 1] as never);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/approve', undefined));
  await waitFor(() => expect(statementReads()).toBeGreaterThan(before));
  expect(onNotice).toHaveBeenCalledWith(t.mobileSalesMoney.done.approve);
});

test('a refused approve shows the mapped Arabic and keeps the confirm open', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'empty_statement' }));
  await show([statement()]);
  await screen.findByText(t.payouts.approve);
  await press(t.payouts.approve);
  const confirms = screen.getAllByRole('button', { name: t.payouts.approve });
  await fireEvent.press(confirms[confirms.length - 1] as never);
  expect(await screen.findByText(t.assistants.error.empty_statement)).toBeTruthy();
  expect(onNotice).not.toHaveBeenCalled();
});

test('«إعادة فتح» of an approved statement POSTs reopen', async () => {
  mockApiSend.mockResolvedValue(statement());
  await show([statement({ status: 'approved', approved_at: '2026-11-01T09:00:00Z' })]);
  await screen.findByText(t.finance.reopen);
  await press(t.finance.reopen);
  const confirms = screen.getAllByRole('button', { name: t.finance.reopen });
  await fireEvent.press(confirms[confirms.length - 1] as never);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/reopen', undefined));
  expect(onNotice).toHaveBeenCalledWith(t.mobileSalesMoney.done.reopen);
});

test('«إلغاء الدفع» needs a reason of three letters, then POSTs unpay with it', async () => {
  mockApiSend.mockResolvedValue(statement({ status: 'approved' }));
  await show([statement({ status: 'paid', paid_at: '2026-11-02T09:00:00Z', method: 'bank' })]);
  await screen.findByText(t.finance.unpay);
  await press(t.finance.unpay);
  const confirm = () => {
    const all = screen.getAllByRole('button', { name: t.finance.unpay });
    return fireEvent.press(all[all.length - 1] as never);
  };
  await fireEvent.changeText(screen.getByLabelText(t.finance.reason), 'خط');
  await confirm();
  expect(screen.getByText(t.assistants.error.reason_required)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText(t.finance.reason), 'دفعة مكررة');
  await confirm();
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements/st1/unpay', { reason: 'دفعة مكررة' }));
  expect(onNotice).toHaveBeenCalledWith(t.mobileSalesMoney.done.unpay);
});

test('without assistantpay.approve: no approve, reopen or un-pay; a writer still pays', async () => {
  await show([statement({ status: 'approved' })], { read: true, write: true, approve: false });
  expect(await screen.findByText(t.payouts.markPaid)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.finance.reopen })).toBeNull();
  expect(screen.queryByRole('button', { name: t.payouts.approve })).toBeNull();
});

test('«التفاصيل» opens the lines: salary, each commission with its student, each adjustment', async () => {
  await show([statement()]);
  await screen.findByText(t.assistants.statements.details);
  await press(t.assistants.statements.details);
  expect(screen.getByText(t.assistantPortal.earnings.line.commission.replace('{student}', 'سهيلة'))).toBeTruthy();
  expect(screen.getByText(t.assistantPortal.earnings.line.adjustment.replace('{reason}', 'خصم تجريبي'))).toBeTruthy();
});

test('«احسب كشوف الشهر» asks, then POSTs {assistantId, month} for each non-frozen salesperson', async () => {
  mockApiSend.mockResolvedValue(statement());
  await show([]);
  await screen.findByText(t.assistants.statements.empty);
  await press(t.assistants.statements.generate);
  const confirms = screen.getAllByRole('button', { name: t.assistants.statements.generate });
  await fireEvent.press(confirms[confirms.length - 1] as never);
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/assistant-pay/statements', { assistantId: 'a1', month: expect.stringMatching(/^\d{4}-\d{2}$/) }),
  );
  expect(onNotice).toHaveBeenCalledWith(t.mobileSalesMoney.done.generate);
});
