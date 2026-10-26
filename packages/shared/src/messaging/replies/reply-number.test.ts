import { describe, expect, it } from 'vitest';
import { mergeWindows, replyNumber } from './reply-number.js';

// docs/23c decision 6: the newest open window on a number that can send.
const now = new Date('2026-10-24T12:00:00Z');
const H1 = '2026-10-24T11:00:00Z';
const H2 = '2026-10-24T10:00:00Z';
const CLOSED = '2026-10-23T12:00:00Z';
const all = () => true;

describe('replyNumber', () => {
  it('the newest open window wins', () => {
    const windows = [{ numberId: 'a', lastInboundAt: H2 }, { numberId: 'b', lastInboundAt: H1 }];
    expect(replyNumber({ windows, canSend: all, now })).toEqual({ numberId: 'b' });
  });

  it('skips a number that cannot send, for an older open one', () => {
    const windows = [{ numberId: 'a', lastInboundAt: H2 }, { numberId: 'b', lastInboundAt: H1 }];
    expect(replyNumber({ windows, canSend: (id) => id === 'a', now })).toEqual({ numberId: 'a' });
  });

  it('open windows only on numbers that cannot send → number_not_configured', () => {
    expect(replyNumber({ windows: [{ numberId: 'a', lastInboundAt: H1 }], canSend: () => false, now })).toEqual({ code: 'number_not_configured' });
  });

  it('closed, missing or unreadable windows → session_closed', () => {
    const windows = [{ numberId: 'a', lastInboundAt: CLOSED }, { numberId: 'b', lastInboundAt: null }, { numberId: 'c', lastInboundAt: 'x' }];
    expect(replyNumber({ windows, canSend: all, now })).toEqual({ code: 'session_closed' });
    expect(replyNumber({ windows: [], canSend: all, now })).toEqual({ code: 'session_closed' });
  });
});

describe('mergeWindows', () => {
  it('one entry per number, the newest time wins, a null never replaces a time', () => {
    const merged = mergeWindows([{ numberId: 'a', lastInboundAt: H2 }, { numberId: 'b', lastInboundAt: null }], [
      { numberId: 'a', lastInboundAt: H1 },
      { numberId: 'b', lastInboundAt: H2 },
      { numberId: 'a', lastInboundAt: null },
    ]);
    expect(merged).toEqual([{ numberId: 'a', lastInboundAt: H1 }, { numberId: 'b', lastInboundAt: H2 }]);
  });
});
