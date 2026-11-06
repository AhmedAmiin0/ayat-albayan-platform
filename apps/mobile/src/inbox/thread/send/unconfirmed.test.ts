import { SEND_UNCONFIRMED } from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { heldLine } from '@/inbox/messages/hooks/held-line';
import { clearChatMemory } from '@/inbox/thread/anchor';
import { message } from '@/inbox/shared/thread-fixtures';
import type { ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { PINS, pinnedId } from './pinned-send';
import { isUnconfirmed, markUnconfirmed } from './unconfirmed';

const sent = message({ id: 'req-1', body: 'وصلت' });
const cache = (rows = [sent]): ThreadCache => ({
  pages: [{ messages: rows, has_more: false } as unknown as ThreadDetail],
  pageParams: [null],
});
const PHONE = '+201000000001';

afterEach(clearChatMemory);

test('markUnconfirmed marks only that provisional row', () => {
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
  const unconfirmed = { status: 'queued' as const, error_code: SEND_UNCONFIRMED };
  expect(heldLine(unconfirmed)).toBe(t.messages.sendUnconfirmed);
  expect(heldLine({ status: 'queued', error_code: 'awaiting_reply' })).toBe(t.messages.awaitingReply);
  expect(heldLine({ status: 'sent', error_code: SEND_UNCONFIRMED })).toBeNull();
});

test('the box and «عرض سعر» pin separately; the pinned id wins over a fresh one', () => {
  PINS.box.pin(PHONE, 'req-1', PINS.box.generation());
  expect(pinnedId('box', PHONE, 'fresh')).toBe('req-1');
  expect(pinnedId('quote', PHONE, 'fresh')).toBe('fresh');
  expect(pinnedId('box', '+201000000002', 'fresh')).toBe('fresh');
});

test('sign-out forgets every pin, and a send settling after it writes nothing back', () => {
  const before = PINS.box.generation();
  PINS.box.pin(PHONE, 'req-1', before);
  PINS.quote.pin(PHONE, 'q-1', PINS.quote.generation());
  clearChatMemory();
  expect([PINS.box.pinned(PHONE), PINS.quote.pinned(PHONE)]).toEqual([undefined, undefined]);
  PINS.box.pin(PHONE, 'req-2', before);
  expect(PINS.box.pinned(PHONE)).toBeUndefined();
});
