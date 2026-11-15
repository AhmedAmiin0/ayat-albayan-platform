import { SEND_REPLAYED, SEND_UNCONFIRMED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearAllDrafts, draftGeneration, getDraft, keepsFailed, keptFailed, requestIdFor, setDraft } from './draft-store';
import { ReplayedSend, rereadsAfter, sendErrorCode, sendErrorText } from './send-error';
import { settleOwnSend } from './send-start';
import { settleTextSend, textSentOf } from './use-text-send';

// docs/44 BUG7 on web, the final rule: after no answer the box owns a pinned id; every next text
// reuses it until a send with it gets an ANSWER (2xx or 4xx). Nothing is released by reads.

afterEach(clearAllDrafts);

const PHONE = '+966501234567';
const unconfirmed = { text: 'وصلت', id: 'req-1', code: SEND_UNCONFIRMED };
const refused = { text: 'وصلت', id: 'req-2', code: 'send_failed' };
const row = (body: string) => ({ id: 'srv', body }) as MessageView;
const sentOf = (text: string) => ({
  ...textSentOf(PHONE, getDraft(PHONE), text),
  gen: { draft: draftGeneration(), own: 0 },
});

describe('a send that ended with no answer', () => {
  it('a network error, the deadline or a 5xx is «unconfirmed» and re-reads the chat', () => {
    const errors = [new TypeError('Failed to fetch'), new ApiError(502, null), new ApiError(500, null)];
    expect(errors.map(sendErrorCode)).toEqual(Array(3).fill(SEND_UNCONFIRMED));
    expect(sendErrorText(errors[0])).toBe(t.inbox.error.send_unconfirmed);
    expect(errors.map(rereadsAfter)).toEqual([true, true, true]);
  });

  it("a 409 keeps its real reason (not «unconfirmed»); a replay of the first message has its note", () => {
    const closed = new ApiError(409, { code: 'session_closed' });
    expect([sendErrorCode(closed), rereadsAfter(closed)]).toEqual(['session_closed', true]);
    expect(sendErrorCode(new ApiError(422, null))).toBe('send_failed');
    expect(sendErrorText(new ReplayedSend())).toBe(t.inbox.error.send_replayed);
  });

  it('EVERY next text of the box reuses the pinned id; a refused one only for the same text', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    expect(sentOf('وصلت الآن').clientRequestId).toBe('req-1');
    expect(sentOf('نص آخر تمامًا').clientRequestId).toBe('req-1');
    expect(keepsFailed(unconfirmed, 'نص آخر')).toBe(true);
    expect(requestIdFor({ text: 'وصلت', failed: refused }, 'وصلت')).toBe('req-2');
    expect(requestIdFor({ text: 'أخرى', failed: refused }, 'أخرى')).not.toBe('req-2');
  });
});

describe('H2: other sends and fills keep the pinned id', () => {
  it('a template, rating or file going out settles a refused attempt, not an unconfirmed one', () => {
    setDraft(PHONE, { text: 'x', failed: unconfirmed });
    settleOwnSend(PHONE, 'tpl', { own: 0, draft: draftGeneration() });
    expect(getDraft(PHONE).failed).toBe(unconfirmed);
    setDraft(PHONE, { text: 'x', failed: refused });
    settleOwnSend(PHONE, 'tpl', { own: 0, draft: draftGeneration() });
    expect(getDraft(PHONE).failed).toBeNull();
  });

  it('a saved reply, a quote or a payment link filling the box keeps it (keptFailed)', () => {
    const kept = [keptFailed(unconfirmed), keptFailed(refused), keptFailed(null)];
    expect(kept).toEqual([unconfirmed, null, null]);
  });
});

describe('a 2xx with the pinned id releases it', () => {
  it('the same text: the failure is settled, the next send gets a new id', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    settleTextSend(row('وصلت'), sentOf('وصلت'));
    expect(getDraft(PHONE).failed).toBeNull();
    expect(requestIdFor(getDraft(PHONE), 'وصلت')).not.toBe('req-1');
  });

  it('M1, the first message came back: the edit back with the note and a fresh id', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    settleTextSend(row('وصلت'), sentOf('وصلت الآن'));
    const after = getDraft(PHONE);
    expect(after.text).toBe('وصلت الآن');
    expect(after.failed?.code).toBe(SEND_REPLAYED);
    expect(requestIdFor(after, 'وصلت الآن')).not.toBe('req-1');
  });

  it('a 2xx after a 4xx released the pin still catches a replay (session_closed before dedup)', () => {
    // A pinned retry got 409: the pin went, but the same text keeps the refused id (rule 8).
    const closed = { text: 'وصلت الآن', id: 'req-1', code: 'session_closed' };
    setDraft(PHONE, { text: 'وصلت الآن', failed: closed });
    const sent = sentOf('وصلت الآن');
    expect(sent.clientRequestId).toBe('req-1');
    settleTextSend(row('وصلت'), sent);
    expect(getDraft(PHONE).failed?.code).toBe(SEND_REPLAYED);
    expect(getDraft(PHONE).text).toBe('وصلت الآن');
  });

  it('a send settling after a sign-out writes nothing back', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    const sent = sentOf('وصلت الآن');
    clearAllDrafts();
    settleTextSend(row('وصلت'), sent);
    expect(getDraft(PHONE)).toEqual({ text: '', failed: null });
  });
});
