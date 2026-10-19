import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { readErrorText } from './read-error';

describe('readErrorText (a thread that fails to load)', () => {
  it('a 403 reads as not allowed to view the chat, never «غير مسموح لك بالإرسال»', () => {
    expect(readErrorText(new ApiError(403, null))).toBe(t.inbox.readForbidden);
    expect(readErrorText(new ApiError(403, null))).not.toBe(t.inbox.error.forbidden);
  });

  it('anything else is the generic error', () => {
    expect(readErrorText(new ApiError(500, null))).toBe(t.common.error);
    expect(readErrorText(new Error('network'))).toBe(t.common.error);
  });
});
