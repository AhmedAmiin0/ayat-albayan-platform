import { describe, expect, it } from 'vitest';
import { decodeShare, EMPTY_SHARE, encodeShare, shareReducer, type ShareInput } from './share-messages';

const guest = (identity: string) => ({ identity, role: 'guest' as const });
const teacher = { identity: 'teacher-1', role: 'teacher' as const };
const msg = (m: Extract<ShareInput, { kind: 'message' }>['msg'], from: { identity: string; role: 'guest' | 'teacher' | 'sales' }, me = 'me'): ShareInput => ({
  kind: 'message',
  msg: m,
  from,
  me,
});

describe('share request messages', () => {
  it('round-trips and rejects junk', () => {
    expect(decodeShare(encodeShare({ t: 'request' }))).toEqual({ t: 'request' });
    expect(decodeShare(encodeShare({ t: 'deny', who: 'g' }))).toEqual({ t: 'deny', who: 'g' });
    expect(decodeShare(new TextEncoder().encode('{"t":"deny"}'))).toBeNull();
    expect(decodeShare(new TextEncoder().encode('{"t":"grant"}'))).toBeNull();
    expect(decodeShare(new TextEncoder().encode('nope'))).toBeNull();
  });
});

describe('shareReducer', () => {
  it('staff: a guest request is queued once; a staff member cannot «request»', () => {
    let s = shareReducer(EMPTY_SHARE, msg({ t: 'request' }, guest('g1')));
    s = shareReducer(s, msg({ t: 'request' }, guest('g1')));
    s = shareReducer(s, msg({ t: 'request' }, guest('g2')));
    s = shareReducer(s, msg({ t: 'request' }, teacher));
    expect(s.pending).toEqual(['g1', 'g2']);
    expect(shareReducer(s, { kind: 'settled', identity: 'g1' }).pending).toEqual(['g2']);
  });

  it('a staff «رفض» clears it for every staff screen and tells the asker', () => {
    const asked = shareReducer(EMPTY_SHARE, { kind: 'asked' });
    expect(asked.mine).toBe('pending');
    expect(shareReducer(asked, { kind: 'asked' })).toBe(asked);
    const denied = shareReducer({ ...asked, pending: ['me'] }, msg({ t: 'deny', who: 'me' }, teacher));
    expect(denied).toEqual({ pending: [], mine: 'denied' });
    expect(shareReducer(asked, msg({ t: 'deny', who: 'other' }, teacher)).mine).toBe('pending');
  });

  it('only staff may deny: a guest or a salesperson forging «رفض» is ignored', () => {
    const asked = shareReducer(EMPTY_SHARE, { kind: 'asked' });
    expect(shareReducer(asked, msg({ t: 'deny', who: 'me' }, guest('g9')))).toBe(asked);
    expect(shareReducer(asked, msg({ t: 'deny', who: 'me' }, { identity: 's', role: 'sales' }))).toBe(asked);
  });

  it('a grant (the permission arrived) ends my pending request', () => {
    expect(shareReducer({ pending: [], mine: 'pending' }, { kind: 'granted' }).mine).toBe('idle');
  });
});
