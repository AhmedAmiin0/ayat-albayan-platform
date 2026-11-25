import { beforeEach, describe, expect, it } from 'vitest';
import { realtime } from './presence-realtime';

const client = () => realtime.module().supabase;

describe('the fake presence realtime', () => {
  beforeEach(() => realtime.reset());

  it('records each opened topic and answers its join once joinAll runs', () => {
    const statuses: string[] = [];
    client().channel('presence:a').subscribe((s) => statuses.push(s));
    expect(realtime.topics()).toEqual(['presence:a']);
    realtime.joinAll();
    expect(statuses).toEqual(['SUBSCRIBED']);
  });

  it('puts a person online and off, firing the topic sync each time', () => {
    let syncs = 0;
    const ch = client().channel('presence:b').on('presence', {}, () => (syncs += 1));
    realtime.present('b');
    expect(ch.presenceState()).toEqual({ key: [{ at: 'x' }] });
    realtime.present('b', false);
    expect(ch.presenceState()).toEqual({ key: [] });
    expect(syncs).toBe(2);
  });

  it('keeps what a client tracked and closes a removed topic', async () => {
    const ch = client().channel('presence:c');
    await ch.track({ online_at: 't' });
    expect(realtime.tracked('c')).toEqual([{ online_at: 't' }]);
    expect(realtime.isOpen('c')).toBe(true);
    await client().removeChannel(ch);
    expect(realtime.isOpen('c')).toBe(false);
  });

  it('ignores a person with no topic and never answers a removed one', async () => {
    realtime.present('nobody');
    expect(realtime.tracked('nobody')).toEqual([]);
    const statuses: string[] = [];
    const ch = client().channel('presence:d').subscribe((s) => statuses.push(s));
    await client().removeChannel(ch);
    realtime.joinAll();
    expect(statuses).toEqual([]);
  });
});
