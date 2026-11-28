import { describe, expect, it } from 'vitest';
import { toMessageView, type ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { hasGap, readNow, windowOf } from '@/modules/messaging/inbox/delta/delta-window';
import { threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { toThreadView } from '@/modules/messaging/inbox/threads/threads.mapper';

const NOW = new Date('2026-10-02T09:00:00Z');
const AFTER = '2026-10-02T08:00:00Z';

describe('windowOf', () => {
  const view = toThreadView(threadRow({ unread_count: 3 }), NOW);

  it('keeps the unread count unless cleared', () => {
    expect(windowOf(view, false).unread_count).toBe(3);
    expect(windowOf(view, true).unread_count).toBe(0);
  });

  it('copies the window fields', () => {
    expect(windowOf(view, false)).toMatchObject({
      last_inbound_at: view.last_inbound_at,
      session_open: view.session_open,
    });
  });
});

describe('readNow', () => {
  const msg = (over: Partial<ThreadMessageRow>) =>
    toMessageView({ row: messageRow({ read_at: null, ...over }), template: null });

  it('stamps only unread inbound rows', () => {
    const [inbound, outbound, read] = readNow(
      [
        msg({ direction: 'inbound' }),
        msg({ direction: 'outbound' }),
        msg({ direction: 'inbound', read_at: AFTER }),
      ],
      NOW,
    );
    expect(inbound?.read_at).toBe(NOW.toISOString());
    expect(outbound?.read_at).toBeNull();
    expect(read?.read_at).toBe(AFTER);
  });
});

describe('hasGap', () => {
  const rows = (...at: string[]) => at.map((created_at) => ({ created_at }));

  it('is false when no row is past the limit', () => {
    expect(hasGap(rows('2026-10-02T08:30:00Z'), { limit: 1, after: AFTER })).toBe(false);
  });

  it('is true when the row past the limit is newer than after', () => {
    const page = rows('2026-10-02T08:40:00Z', '2026-10-02T08:30:00Z');
    expect(hasGap(page, { limit: 1, after: AFTER })).toBe(true);
  });

  it('is false when the row past the limit is only in the overlap', () => {
    const page = rows('2026-10-02T08:40:00Z', '2026-10-02T07:59:59Z');
    expect(hasGap(page, { limit: 1, after: AFTER })).toBe(false);
  });
});
