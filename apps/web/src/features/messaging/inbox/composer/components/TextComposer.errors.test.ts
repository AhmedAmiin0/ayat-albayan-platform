import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';

describe('a failed send in words', () => {
  it('a 403 without a code (an edited role without inbox.send) reads «غير مسموح لك بالإرسال» (W12)', () => {
    expect(sendErrorText(new ApiError(403, null))).toBe(t.inbox.error.forbidden);
    expect(sendErrorText(new ApiError(403, { message: 'Forbidden' }))).toBe(
      t.inbox.error.forbidden,
    );
  });

  it('a 403 with its own code keeps that reason', () => {
    expect(sendErrorText(new ApiError(403, { code: 'not_your_thread' }))).toBe(
      t.inbox.error.not_your_thread,
    );
  });

  it('409 session_closed is unchanged; anything else is send_failed', () => {
    expect(sendErrorText(new ApiError(409, { code: 'session_closed' }))).toBe(
      t.inbox.error.session_closed,
    );
    expect(sendErrorText(new ApiError(500, null))).toBe(t.inbox.error.send_failed);
    expect(sendErrorText(new Error('network'))).toBe(t.inbox.error.send_failed);
  });
});
