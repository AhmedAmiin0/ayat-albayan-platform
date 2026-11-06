import { SEND_UNCONFIRMED } from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { heldLine } from '@/inbox/messages/hooks/held-line';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { message } from '@/inbox/shared/thread-fixtures';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { boxPin, clearHeldSends, heldSends, holdSend, releaseSend } from './pinned-send';
import { dropRows, isUnconfirmed, markUnconfirmed } from './unconfirmed';

const AT = '2026-10-02T09:00:00.000Z';
const sent = message({ id: 'req-1', body: 'وصلت', created_at: AT });
const cache = (rows = [sent]): ThreadCache => ({
  pages: [{ messages: rows, has_more: false } as unknown as ThreadDetail],
  pageParams: [null],
});
const held = (id: string, box: boolean) => ({ id, sent, known: new Set<string>(), box });

afterEach(clearHeldSends);

test('markUnconfirmed marks only that provisional row; dropRows takes rows out', () => {
  const other = message({ id: 'm1', body: 'قديمة' });
  const out = markUnconfirmed(cache([other, sent]), 'req-1');
  const rows = out?.pages[0]?.messages ?? [];
  expect(rows.map((m) => [m.id, m.error_code])).toEqual([
    ['m1', null],
    ['req-1', SEND_UNCONFIRMED],
  ]);
  expect(rows.map(isUnconfirmed)).toEqual([false, true]);
  expect(markUnconfirmed(undefined, 'req-1')).toBeUndefined();
  expect(dropRows(out, new Set(['req-1']))?.pages[0]?.messages.map((m) => m.id)).toEqual(['m1']);
});

test('the bubble says «unconfirmed» under an unconfirmed send, the held text its own line', () => {
  const unconfirmed = { status: 'queued' as const, error_code: SEND_UNCONFIRMED };
  expect(heldLine(unconfirmed)).toBe(t.messages.sendUnconfirmed);
  expect(heldLine({ status: 'queued', error_code: 'awaiting_reply' })).toBe(t.messages.awaitingReply);
  expect(heldLine({ status: 'sent', error_code: SEND_UNCONFIRMED })).toBeNull();
  expect(heldLine({ status: 'queued', error_code: null })).toBeNull();
});

test('only a held BOX text pins the box; a retry keeps the first send; release frees it', () => {
  const phone = '+201000000001';
  holdSend(phone, held('tpl-1', false));
  expect(boxPin(phone)).toBeUndefined();
  holdSend(phone, held('req-1', true));
  holdSend(phone, { ...held('req-1', true), sent: { ...sent, body: 'وصلت الآن' } });
  expect(boxPin(phone)).toBe('req-1');
  expect(heldSends(phone).find((h) => h.id === 'req-1')?.sent.body).toBe('وصلت');
  expect(boxPin('+201000000002')).toBeUndefined();
  releaseSend(phone, 'req-1');
  expect(boxPin(phone)).toBeUndefined();
});

test('sign-out forgets every held send (the admin: dedup namespace is shared)', () => {
  holdSend('+201000000001', held('req-1', true));
  clearChatMemory();
  expect(boxPin('+201000000001')).toBeUndefined();
});
