import { describe, expect, it, vi } from 'vitest';
import type { ChannelPeopleRepo } from '@/modules/teaching/student-channels/channel-people.repo';
import type { ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import { ChannelBell } from './channel-bell';
import type { ChannelBellRepo } from './channel-bell.repo';

const row = (over: Partial<ChannelMessageRow>) =>
  ({
    id: 'm1',
    body: 'متى الحلقة؟',
    sender_profile_id: 'p-g',
    sender_role: 'guardian',
    created_at: '',
    deleted_at: null,
    ...over,
  }) as ChannelMessageRow;

function bell(names: ReadonlyMap<string, string>) {
  const rewrite = vi.fn(async (_change: { messageId: string; body: string }) => undefined);
  const people = { names: vi.fn(async () => new Map(names)) };
  const changed = new ChannelBell(
    { rewrite } as unknown as ChannelBellRepo,
    people as unknown as ChannelPeopleRepo,
  );
  return { changed, rewrite };
}

describe('ChannelBell: the rewritten bell row names its sender', () => {
  it('a named sender: the name', async () => {
    const { changed, rewrite } = bell(new Map([['p-g', 'أم سارة']]));
    await changed.changed(row({}));
    expect(rewrite).toHaveBeenCalledWith({ messageId: 'm1', body: 'أم سارة: متى الحلقة؟' });
  });

  it('a blank name: the role word, never an empty sender', async () => {
    const { changed, rewrite } = bell(new Map([['p-g', '  ']]));
    await changed.changed(row({}));
    expect(rewrite).toHaveBeenCalledWith({ messageId: 'm1', body: 'ولي الأمر: متى الحلقة؟' });
  });

  it('no sender profile: the role word', async () => {
    const { changed, rewrite } = bell(new Map());
    await changed.changed(row({ sender_profile_id: null, sender_role: 'sales' }));
    expect(rewrite.mock.calls[0]?.[0].body).toBe('مسؤول المتابعة: متى الحلقة؟');
  });
});
