import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { sendErrorCodeText, sendErrorText } from './send-error';

const e = t.inbox.correction.errors;

describe('«تعديل»: the API’s refusals in words', () => {
  it('maps each correction code', () => {
    expect(sendErrorText(new ApiError(400, { code: 'correction_not_in_thread' }))).toBe(
      e.correction_not_in_thread,
    );
    expect(sendErrorText(new ApiError(400, { code: 'not_correctable' }))).toBe(e.not_correctable);
    expect(sendErrorText(new ApiError(403, { code: 'not_your_message' }))).toBe(e.not_your_message);
  });

  it('a stored code too (a remounted box), the send’s own codes unchanged', () => {
    expect(sendErrorCodeText('not_correctable')).toBe(e.not_correctable);
    expect(sendErrorCodeText('session_closed')).toBe(t.inbox.error.session_closed);
  });
});
