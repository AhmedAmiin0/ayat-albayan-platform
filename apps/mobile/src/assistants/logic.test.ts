import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ReceiptUploadError } from '@/core/lib/receipts/upload-receipt';
import { commissionsPath, statementsPath } from './api/api';
import { assistantsErrorText, fieldError } from './api/errors';
import { statement } from './api/fixtures';
import { generateTargets } from './statements/hooks/generate-targets';

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
