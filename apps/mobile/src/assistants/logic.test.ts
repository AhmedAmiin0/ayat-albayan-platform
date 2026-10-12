import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { ReceiptUploadError } from '@/payments/upload-receipt';
import { commissionsPath, statementsPath } from './api';
import { assistantsErrorText, fieldError } from './errors';
import { statement } from './fixtures';
import { generateTargets } from './generate-targets';
import { statementActions } from './statement-can';
import { sumByCurrency } from './totals';

const ALL = { write: true, approve: true };

test.each([
  { status: 'draft', has_receipt: false, can: ALL, expected: ['approve', 'details'] },
  { status: 'draft', has_receipt: false, can: { write: true, approve: false }, expected: ['details'] },
  { status: 'approved', has_receipt: false, can: ALL, expected: ['pay', 'reopen', 'details'] },
  { status: 'approved', has_receipt: false, can: { write: true, approve: false }, expected: ['pay', 'details'] },
  { status: 'approved', has_receipt: false, can: { write: false, approve: true }, expected: ['reopen', 'details'] },
  { status: 'approved', has_receipt: false, can: { write: false, approve: false }, expected: ['details'] },
  { status: 'paid', has_receipt: true, can: ALL, expected: ['receipt', 'details', 'unpay'] },
  { status: 'paid', has_receipt: false, can: ALL, expected: ['details', 'unpay'] },
  { status: 'paid', has_receipt: true, can: { write: true, approve: false }, expected: ['receipt', 'details'] },
] as const)('a $status statement (receipt $has_receipt) with $can offers $expected, as the web StatementActions', ({ status, has_receipt, can, expected }) => {
  expect(statementActions({ status, has_receipt }, can)).toEqual(expected);
});

test('the ledger and statement paths carry only the filters that are set; a month is cut in UTC', () => {
  expect(commissionsPath({ assistantId: '', month: '', status: '' })).toBe('/assistant-pay/commissions');
  expect(commissionsPath({ assistantId: 'a1', month: '2026-12', status: 'voided' })).toBe(
    `/assistant-pay/commissions?assistantId=a1&status=voided&from=${encodeURIComponent('2026-12-01T00:00:00.000Z')}&to=${encodeURIComponent('2027-01-01T00:00:00.000Z')}`,
  );
  expect(statementsPath({ assistantId: '', month: '2026-10', status: '' })).toBe('/assistant-pay/statements?month=2026-10');
  expect(statementsPath({ assistantId: 'a1', month: '2026-10', status: 'paid' })).toBe('/assistant-pay/statements?assistantId=a1&month=2026-10&status=paid');
});

test('generate skips the frozen (approved or paid) statements of the month', () => {
  const rows = [statement({ assistant: { id: 'a1', name: 'x' }, status: 'paid' }), statement({ assistant: { id: 'a2', name: 'y' }, status: 'draft' })];
  expect(generateTargets(['a1', 'a2', 'a3'], rows)).toEqual(['a2', 'a3']);
});

test('sums per currency in whole cents, never across currencies; a filter narrows the rows', () => {
  const rows = [
    { amount: 0.1, currency: 'SAR', keep: true },
    { amount: 0.2, currency: 'SAR', keep: true },
    { amount: 40, currency: 'EGP', keep: false },
  ];
  expect(sumByCurrency(rows)).toEqual({ SAR: 0.3, EGP: 40 });
  expect(sumByCurrency(rows, (r) => r.keep)).toEqual({ SAR: 0.3 });
});

test('API error codes and schema messages read the web’s Arabic; anything else is the generic error', () => {
  expect(assistantsErrorText(new ApiError(409, { code: 'invalid_transition' }))).toBe(t.assistants.error.invalid_transition);
  expect(assistantsErrorText(new ApiError(409, { code: 'already_voided' }))).toBe(t.assistants.error.already_voided);
  expect(assistantsErrorText(new ApiError(400, { message: 'validation_failed', issues: [{ message: 'reason_required' }] }))).toBe(
    t.assistants.error.reason_required,
  );
  expect(assistantsErrorText(new ApiError(400, { code: 'nope' }))).toBe(t.common.error);
  expect(assistantsErrorText(new ReceiptUploadError('x'))).toBe(t.payments.mobile.uploadFailed);
  expect(assistantsErrorText(new TypeError('Network request failed'))).toBe(t.mobileFinance.offline);
  expect(fieldError('percent_max_100')).toBe(t.assistants.error.percent_max_100);
  expect(fieldError('whatever')).toBe(t.assistants.error.invalid);
  expect(fieldError(undefined)).toBeUndefined();
});
