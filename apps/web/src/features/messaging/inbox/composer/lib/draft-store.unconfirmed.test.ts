import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearAllDrafts, keepsFailed, requestIdFor, SEND_UNCONFIRMED } from './draft-store';
import { rereadsAfter, sendErrorCode, sendErrorText } from './send-error';

// docs/44 BUG7 on web: a send with no answer keeps its clientRequestId for the retry, even when
// the text was edited, so it never becomes a second message; the API's refusal is unchanged.

afterEach(clearAllDrafts);

const unconfirmed = { text: 'وصلت', id: 'req-1', code: SEND_UNCONFIRMED };
const refused = { text: 'وصلت', id: 'req-2', code: 'send_failed' };

describe('a send that ended with no answer', () => {
  it('is «unconfirmed», not refused, and re-reads the chat', () => {
    const errors = [new TypeError('Failed to fetch'), new TypeError('Network request failed')];
    expect(errors.map(sendErrorCode)).toEqual([SEND_UNCONFIRMED, SEND_UNCONFIRMED]);
    expect(sendErrorText(errors[0])).toBe(t.inbox.error.send_unconfirmed);
    expect(rereadsAfter(errors[0])).toBe(true);
  });

  it("the API's answer keeps its own reason; only session_closed re-reads", () => {
    const closed = new ApiError(409, { code: 'session_closed' });
    expect(sendErrorCode(closed)).toBe('session_closed');
    expect(rereadsAfter(closed)).toBe(true);
    expect(sendErrorCode(new ApiError(500, null))).toBe('send_failed');
    expect(rereadsAfter(new ApiError(500, null))).toBe(false);
  });

  it('keeps its id for the retry, even of an edited text', () => {
    const draft = { text: 'وصلت الآن', failed: unconfirmed };
    expect(requestIdFor(draft, 'وصلت الآن')).toBe('req-1');
    expect(keepsFailed(unconfirmed, 'نص آخر')).toBe(true);
  });

  it('a refused send keeps its id only for the same text (rule 8, unchanged)', () => {
    expect(requestIdFor({ text: 'وصلت', failed: refused }, 'وصلت')).toBe('req-2');
    expect(requestIdFor({ text: 'أخرى', failed: refused }, 'أخرى')).not.toBe('req-2');
    expect(keepsFailed(refused, '  وصلت ')).toBe(true);
    expect(keepsFailed(null, 'وصلت')).toBe(false);
  });
});
