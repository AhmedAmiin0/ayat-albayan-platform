import { SEND_REPLAYED, SEND_UNCONFIRMED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { clearAllDrafts, draftGeneration, getDraft, keepsFailed, keptFailed, requestIdFor, setDraft } from './draft-store';
import { ReplayedSend, rereadsAfter, sendErrorCode, sendErrorText } from './send-error';
import { settleOwnSend } from './send-start';
import { failedOf, resolveBox, settleTextSend, textSentOf } from './unconfirmed';

// docs/44 BUG7 on web (and the review of PR #667: H1, H2, M1, M2): a send with no answer keeps its
// clientRequestId for the box's retry, edited or not, until a read shows the first one went.

afterEach(clearAllDrafts);

const PHONE = '+966501234567';
const AT = '2026-10-02T09:00:00.000Z';
const unconfirmed = { text: 'وصلت', id: 'req-1', code: SEND_UNCONFIRMED, at: AT, known: ['m0'] };
const refused = { text: 'وصلت', id: 'req-2', code: 'send_failed' };
const row = (over: Partial<MessageView>) =>
  ({ id: 'srv', direction: 'outbound', body: 'وصلت', template_key: null, created_at: AT, ...over }) as MessageView;
const gen = () => ({ draft: draftGeneration() });

describe('a send that ended with no answer', () => {
  it('a network error, the deadline or a 5xx is «unconfirmed» and re-reads the chat', () => {
    const errors = [new TypeError('Failed to fetch'), new ApiError(502, null), new ApiError(500, null)];
    expect(errors.map(sendErrorCode)).toEqual(Array(3).fill(SEND_UNCONFIRMED));
    expect(sendErrorText(errors[0])).toBe(t.inbox.error.send_unconfirmed);
    expect(errors.map(rereadsAfter)).toEqual([true, true, true]);
  });

  it("a 4xx keeps its own reason; a replay of the first message has its own note", () => {
    const closed = new ApiError(409, { code: 'session_closed' });
    expect([sendErrorCode(closed), rereadsAfter(closed)]).toEqual(['session_closed', true]);
    expect(sendErrorCode(new ApiError(422, null))).toBe('send_failed');
    expect(sendErrorCode(new ReplayedSend())).toBe(SEND_REPLAYED);
    expect(sendErrorText(new ReplayedSend())).toBe(t.inbox.error.send_replayed);
  });

  it('keeps its id for the retry, even of an edited text; a refused one only for the same text', () => {
    expect(requestIdFor({ text: 'وصلت الآن', failed: unconfirmed }, 'وصلت الآن')).toBe('req-1');
    expect(keepsFailed(unconfirmed, 'نص آخر')).toBe(true);
    expect(requestIdFor({ text: 'وصلت', failed: refused }, 'وصلت')).toBe('req-2');
    expect(requestIdFor({ text: 'أخرى', failed: refused }, 'أخرى')).not.toBe('req-2');
  });

  it('a retry with no answer again keeps what was FIRST sent and seen', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    const sent = { ...textSentOf(PHONE, getDraft(PHONE), 'وصلت الآن'), gen: gen() };
    expect(sent).toMatchObject({ clientRequestId: 'req-1', replay: true });
    expect(failedOf(sent, SEND_UNCONFIRMED, [])).toBe(unconfirmed);
  });
});

describe('H2: other sends and fills keep the unconfirmed id', () => {
  it('a template, rating or file going out settles a refused attempt, not an unconfirmed one', () => {
    setDraft(PHONE, { text: 'x', failed: unconfirmed });
    settleOwnSend(PHONE, 'tpl', { own: 0, draft: draftGeneration() });
    expect(getDraft(PHONE).failed).toBe(unconfirmed);
    setDraft(PHONE, { text: 'x', failed: refused });
    settleOwnSend(PHONE, 'tpl', { own: 0, draft: draftGeneration() });
    expect(getDraft(PHONE).failed).toBeNull();
  });

  it('a saved reply or a quote filling the box keeps it (keptFailed)', () => {
    const kept = [keptFailed(unconfirmed), keptFailed(refused), keptFailed(null)];
    expect(kept).toEqual([unconfirmed, null, null]);
  });
});

describe('H1: a read showing the first send releases the id', () => {
  it('its row with the ORIGINAL text, new since the send, confirms it', () => {
    setDraft(PHONE, { text: 'وصلت الآن', failed: unconfirmed });
    resolveBox(PHONE, [row({ id: 'm0' }), row({ body: 'وصلت الآن' })]);
    expect(getDraft(PHONE).failed).toBe(unconfirmed);
    resolveBox(PHONE, [row({})]);
    expect(getDraft(PHONE)).toEqual({ text: 'وصلت الآن', failed: null });
    expect(requestIdFor(getDraft(PHONE), 'وصلت الآن')).not.toBe('req-1');
  });
});

describe('M1: a replay answered with the first message', () => {
  it('brings the edit back with a note and a fresh id; a normal answer settles the failure', () => {
    setDraft(PHONE, { text: '', failed: unconfirmed });
    const sent = { ...textSentOf(PHONE, getDraft(PHONE), 'وصلت الآن'), gen: gen() };
    settleTextSend(row({ body: 'وصلت' }), sent);
    const after = getDraft(PHONE);
    expect(after.text).toBe('وصلت الآن');
    expect(after.failed?.code).toBe(SEND_REPLAYED);
    expect(requestIdFor(after, 'وصلت الآن')).not.toBe('req-1');
    settleTextSend(row({ body: 'وصلت الآن' }), { ...sent, replay: false });
    expect(getDraft(PHONE).failed).toBeNull();
  });
});
