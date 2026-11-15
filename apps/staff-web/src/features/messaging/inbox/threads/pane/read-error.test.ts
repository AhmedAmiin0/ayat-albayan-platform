import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { readErrorText } from './read-error';

describe('readErrorText (a thread that fails to load)', () => {
  it('a 403 reads as not allowed to view the chat, never «غير مسموح لك بالإرسال»', () => {
    expect(readErrorText(new ApiError(403, null))).toBe(t.inbox.readForbidden);
    expect(readErrorText(new ApiError(403, null))).not.toBe(t.inbox.error.forbidden);
  });

  it("the API's reason keeps its words (403 not_your_thread)", () => {
    expect(readErrorText(new ApiError(403, { code: 'not_your_thread', message: 'x' }))).toBe(t.inbox.error.not_your_thread);
  });

  it('anything else is the generic error', () => {
    expect(readErrorText(new ApiError(500, null))).toBe(t.common.error);
    expect(readErrorText(new Error('network'))).toBe(t.common.error);
  });
});
