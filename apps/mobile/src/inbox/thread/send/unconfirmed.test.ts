import type { ThreadDetail } from '@ab/shared';
import { message } from '@/inbox/shared/thread-fixtures';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { heldLine } from '@/inbox/messages/hooks/held-line';
import { t } from '@/core/lib/i18n/i18n';
import { isUnconfirmed, markUnconfirmed, SEND_UNCONFIRMED, sentRowOf } from './unconfirmed';
import { sendIdFor, pinSend, unpinSend } from './pinned-send';

const AT = '2026-10-02T09:00:00.000Z';
const sent = message({ id: 'req-1', body: 'وصلت', created_at: AT });
const cache = (rows = [sent]): ThreadCache => ({
  pages: [{ messages: rows, has_more: false } as unknown as ThreadDetail],
  pageParams: [null],
});

test('markUnconfirmed marks only that provisional row, kept on its page', () => {
  const other = message({ id: 'm1', body: 'قديمة' });
  const out = markUnconfirmed(cache([other, sent]), 'req-1');
  const rows = out?.pages[0]?.messages ?? [];
  expect(rows.map((m) => [m.id, m.error_code])).toEqual([
    ['m1', null],
    ['req-1', SEND_UNCONFIRMED],
  ]);
  expect(rows.map(isUnconfirmed)).toEqual([false, true]);
  expect(markUnconfirmed(undefined, 'req-1')).toBeUndefined();
});

test('the bubble says «unconfirmed» under an unconfirmed send, the held text its own line', () => {
  expect(heldLine({ status: 'queued', error_code: SEND_UNCONFIRMED })).toBe(t.messages.sendUnconfirmed);
  expect(heldLine({ status: 'queued', error_code: 'awaiting_reply' })).toBe(t.messages.awaitingReply);
  expect(heldLine({ status: 'sent', error_code: SEND_UNCONFIRMED })).toBeNull();
  expect(heldLine({ status: 'queued', error_code: null })).toBeNull();
});

describe('sentRowOf: the server row of an unconfirmed send in a fresh page', () => {
  const server = message({ id: 'srv-1', body: 'وصلت', created_at: '2026-10-02T09:00:05Z' });

  test('ours, new since the send, the same words', () => {
    expect(sentRowOf([server], sent, new Set())).toBe(server);
  });

  test('a row held before the send, an inbound row or other words is not it', () => {
    expect(sentRowOf([server], sent, new Set(['srv-1']))).toBeUndefined();
    const inbound = { ...server, direction: 'inbound' as const };
    expect(sentRowOf([inbound], sent, new Set())).toBeUndefined();
    expect(sentRowOf([{ ...server, body: 'أخرى' }], sent, new Set())).toBeUndefined();
  });

  test("allows the phone's clock 5 minutes ahead, not more", () => {
    const early = (min: number) => ({
      ...server,
      created_at: new Date(Date.parse(AT) - min * 60_000).toISOString(),
    });
    expect(sentRowOf([early(4)], sent, new Set())).toBeDefined();
    expect(sentRowOf([early(6)], sent, new Set())).toBeUndefined();
  });

  test('a template matches by its key (the server renders its own body)', () => {
    const tpl = { ...sent, template_key: 'renewal_due', body: 'عرض سعر' };
    const row = { ...server, template_key: 'renewal_due', body: 'نص القالب' };
    expect(sentRowOf([row], tpl, new Set())).toBe(row);
    expect(sentRowOf([{ ...row, template_key: 'other' }], tpl, new Set())).toBeUndefined();
  });
});

test('a pinned id wins for every send of that chat until a send with it succeeds', () => {
  const phone = '+201000000001';
  expect(sendIdFor(phone, 'new')).toBe('new');
  pinSend(phone, 'req-1');
  expect(sendIdFor(phone, 'edited-text-id')).toBe('req-1');
  expect(sendIdFor('+201000000002', 'x')).toBe('x');
  unpinSend(phone, 'other');
  expect(sendIdFor(phone, 'new')).toBe('req-1');
  unpinSend(phone, 'req-1');
  expect(sendIdFor(phone, 'new')).toBe('new');
});
