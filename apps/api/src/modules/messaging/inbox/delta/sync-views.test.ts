import type { MessageView } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { MessageViews, ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { ThreadQuotes } from '@/modules/messaging/inbox/threads/thread-quotes';
import { SyncViews } from './sync-views';

const row = (id: string, phone: string, over: Partial<ThreadMessageRow> = {}) =>
  messageRow({ id, phone_e164: phone, updated_at: `2026-11-06T10:00:0${id}Z`, ...over });
const views = {
  view: vi.fn(
    async (r: ThreadMessageRow) =>
      ({
        id: r.id,
        phone_e164: r.phone_e164,
        template_key: r.template_key,
        template_params: r.template_params,
        click_to_chat: 'x',
      }) as unknown as MessageView,
  ),
};

describe('SyncViews', () => {
  it('quotes are looked up per chat; every view keeps its updated_at', async () => {
    const attach = vi.fn(async (v: readonly MessageView[], _phone: string) => [...v]);
    const s = new SyncViews(
      views as unknown as MessageViews,
      { attach } as unknown as ThreadQuotes,
    );
    const out = await s.render([row('1', '+1'), row('2', '+2'), row('3', '+1')], 'admin');
    expect(attach.mock.calls.map((c) => c[1])).toEqual(['+1', '+2']);
    expect(out.map((m) => [m.id, m.updated_at])).toEqual([
      ['1', '2026-11-06T10:00:01Z'],
      ['3', '2026-11-06T10:00:03Z'],
      ['2', '2026-11-06T10:00:02Z'],
    ]);
  });

  it('sales: link template views lose their links (defence in depth); no quotes service is fine', async () => {
    const s = new SyncViews(views as unknown as MessageViews);
    const [v] = await s.render(
      [row('1', '+1', { template_key: 'lesson_join_link', template_params: { a: 1 } })],
      'sales',
    );
    expect(v).toMatchObject({ template_params: null, click_to_chat: null });
  });
});
