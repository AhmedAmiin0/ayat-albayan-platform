import type { MessageView, ThreadDelta, ThreadDetail, ThreadView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { deltaSearch, mergeDelta, needsFullRead, type ThreadPages } from './thread-delta.js';

const NOW = Date.parse('2026-10-27T10:00:00Z');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function msg(n: number, over: Partial<MessageView> = {}): MessageView {
  return {
    ...{ id: id(n), direction: 'inbound', status: 'delivered', phone_e164: '+966500000000', lead_id: null, guardian_id: null },
    ...{ lesson_id: null, template_key: null, template_params: null, body: `m${n}`, media_mime: null, media_url: null },
    ...{ reply_to_wa_id: null, interactive_payload: null, error_code: null, error_text: null, attempts: 0 },
    ...{ next_attempt_at: null, scheduled_for: null, sent_at: null, delivered_at: null, read_at: null, sent_manually_at: null },
    ...{ created_at: new Date(NOW - (100 - n) * 60_000).toISOString(), click_to_chat: null, lesson: null },
    ...over,
  };
}

const thread = { phone_e164: '+966500000000', unread_count: 0, session_open: false, last_inbound_at: null } as ThreadView;
const page = (messages: MessageView[], has_more = false): ThreadDetail => ({
  thread,
  messages,
  has_more,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
});
const cache = (...pages: ThreadDetail[]): ThreadPages => ({ pages, pageParams: pages.map(() => '') });
const delta = (over: Partial<ThreadDelta> = {}): ThreadDelta => ({ messages: [], has_more: false, pending: [], ...over });

describe('deltaSearch: the delta request of an open chat', () => {
  it('after = the newest row held; pending = outgoing rows still moving, failed / read / old ones left out', () => {
    const rows = [
      msg(90, { direction: 'outbound', status: 'queued' }),
      msg(91, { direction: 'outbound', status: 'failed' }),
      msg(95, { direction: 'outbound', status: 'delivered' }),
      msg(96, { direction: 'outbound', status: 'read' }),
      msg(97),
    ];
    const old = msg(1, { direction: 'outbound', status: 'sent' }); // 99 minutes ago: past the pending window
    const q = new URLSearchParams(deltaSearch(cache(page(rows), page([old])), NOW) ?? '');
    expect(q.get('after')).toBe(msg(97).created_at);
    expect(q.get('pending')).toBe([id(90), id(95)].join(','));
  });

  it('nothing to anchor on (no cache, an empty chat): null, the caller reads the whole thread', () => {
    expect(deltaSearch(undefined, NOW)).toBeNull();
    expect(deltaSearch(cache(page([])), NOW)).toBeNull();
  });

  it('no pending row: no pending param', () => {
    expect(deltaSearch(cache(page([msg(97)])), NOW)).toBe(`?after=${encodeURIComponent(msg(97).created_at)}`);
  });
});

describe('mergeDelta: a delta folded into the cached pages', () => {
  it('new rows join the newest page in time order; a known row is replaced by id, never doubled', () => {
    const data = cache(page([msg(90), msg(92)]), page([msg(10)]));
    const out = mergeDelta(data, delta({ messages: [msg(92, { body: 'edited' }), msg(91), msg(93)] }));
    expect(out?.pages[0]?.messages.map((m) => [m.id, m.body])).toEqual([
      [id(90), 'm90'],
      [id(91), 'm91'],
      [id(92), 'edited'],
      [id(93), 'm93'],
    ]);
    expect(out?.pages[1]).toEqual(data.pages[1]);
  });

  it('pending statuses replace their rows wherever they are (an older page too)', () => {
    const sent = msg(10, { direction: 'outbound', status: 'sent' });
    const data = cache(page([msg(90)]), page([sent]));
    const out = mergeDelta(data, delta({ pending: [{ ...sent, status: 'delivered' }] }));
    expect(out?.pages[1]?.messages[0]?.status).toBe('delivered');
    expect(out?.pages[0]?.messages).toHaveLength(1);
  });

  it('a new inbound row’s window lands on the thread; no window keeps the thread as it was', () => {
    const data = cache(page([msg(90)]));
    const window = { last_inbound_at: msg(93).created_at, session_open: true, unread_count: 0, reply_line: null };
    const opened = mergeDelta(data, delta({ messages: [msg(93)], thread: { ...window, last_inbound_line: null, last_chat_inbound_at: null, last_notifications_inbound_at: null } }));
    expect(opened?.pages[0]?.thread).toMatchObject({ phone_e164: '+966500000000', session_open: true, last_inbound_at: msg(93).created_at });
    expect(mergeDelta(data, delta())?.pages[0]?.thread).toBe(thread);
  });

  it('no cache: nothing to merge into', () => {
    expect(mergeDelta(undefined, delta({ messages: [msg(1)] }))).toBeUndefined();
  });

  it('has_more = a gap: the caller re-reads instead of merging', () => {
    expect(needsFullRead(delta({ has_more: true }))).toBe(true);
    expect(needsFullRead(delta())).toBe(false);
  });
});
