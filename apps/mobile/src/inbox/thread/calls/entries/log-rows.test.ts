import type { CallView, MessageView } from '@ab/shared';
import { logRows } from './log-rows';

const m = (id: string, at: string) => ({ id, created_at: at, direction: 'inbound' }) as MessageView;
const c = (id: string, at: string) => ({ id, started_at: at, direction: 'outbound' }) as CallView;

describe('logRows (calls merged by time into the inverted list)', () => {
  it('newest first, each row keeping its own kind and direction', () => {
    const rows = logRows([m('m1', '2026-10-26T09:00:00Z'), m('m2', '2026-10-26T11:00:00Z')], { calls: [c('c1', '2026-10-26T10:00:00Z')], hasMore: false });
    expect(rows.map((r) => [r.id, r.direction, r.call ? 'call' : 'message'])).toEqual([
      ['m2', 'inbound', 'message'],
      ['c1', 'outbound', 'call'],
      ['m1', 'inbound', 'message'],
    ]);
  });

  it('a call older than the loaded page waits until older messages are loaded', () => {
    const calls = [c('old', '2026-10-25T09:00:00Z')];
    expect(logRows([m('m1', '2026-10-26T09:00:00Z')], { calls, hasMore: true }).map((r) => r.id)).toEqual(['m1']);
    expect(logRows([m('m1', '2026-10-26T09:00:00Z')], { calls, hasMore: false }).map((r) => r.id)).toEqual(['m1', 'old']);
  });

  it('in the window around an old search hit, later calls stay out of it (docs/37)', () => {
    const calls = [c('in', '2026-03-01T10:00:00Z'), c('later', '2026-10-25T09:00:00Z')];
    const shown = [m('m1', '2026-03-01T09:00:00Z'), m('m2', '2026-03-01T11:00:00Z')];
    const rows = logRows(shown, { calls, hasMore: false, to: '2026-03-01T11:00:00Z' });
    expect(rows.map((r) => r.id)).toEqual(['m2', 'in', 'm1']);
    expect(logRows(shown, { calls, hasMore: false, to: null }).map((r) => r.id)[0]).toBe('later');
  });
});
