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
const raw = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));

describe('share request messages', () => {
  it('round-trips every kind and rejects junk', () => {
    expect(decodeShare(encodeShare({ t: 'request', what: 'draw' }))).toEqual({ t: 'request', what: 'draw' });
    expect(decodeShare(encodeShare({ t: 'deny', who: 'g', what: 'open' }))).toEqual({ t: 'deny', who: 'g', what: 'open' });
    expect(decodeShare(raw({ t: 'deny' }))).toBeNull();
    expect(decodeShare(raw({ t: 'grant' }))).toBeNull();
    expect(decodeShare(raw({ t: 'request', what: 'mic' }))).toBeNull();
    expect(decodeShare(new TextEncoder().encode('nope'))).toBeNull();
  });

  it('an older client’s request without `what` is a screen request', () => {
    expect(decodeShare(raw({ t: 'request' }))).toEqual({ t: 'request', what: 'screen' });
    expect(decodeShare(raw({ t: 'deny', who: 'g' }))).toEqual({ t: 'deny', who: 'g', what: 'screen' });
  });
});

describe('shareReducer', () => {
  it('staff: a guest request is queued once per kind; a staff member cannot «request»', () => {
    let s = shareReducer(EMPTY_SHARE, msg({ t: 'request', what: 'screen' }, guest('g1')));
    s = shareReducer(s, msg({ t: 'request', what: 'screen' }, guest('g1')));
    s = shareReducer(s, msg({ t: 'request', what: 'draw' }, guest('g1')));
    s = shareReducer(s, msg({ t: 'request', what: 'screen' }, teacher));
    expect(s.pending).toEqual([{ identity: 'g1', what: 'screen' }, { identity: 'g1', what: 'draw' }]);
    expect(shareReducer(s, { kind: 'settled', identity: 'g1', what: 'screen' }).pending).toEqual([{ identity: 'g1', what: 'draw' }]);
  });

  it('a staff «رفض» clears that kind for every staff screen and tells the asker', () => {
    const asked = shareReducer(EMPTY_SHARE, { kind: 'asked', what: 'draw' });
    expect(asked.mine.draw).toBe('pending');
    expect(shareReducer(asked, { kind: 'asked', what: 'draw' })).toBe(asked);
    const withPending = { ...asked, pending: [{ identity: 'me', what: 'draw' as const }, { identity: 'me', what: 'screen' as const }] };
    const denied = shareReducer(withPending, msg({ t: 'deny', who: 'me', what: 'draw' }, teacher));
    expect(denied.pending).toEqual([{ identity: 'me', what: 'screen' }]);
    expect(denied.mine).toEqual({ screen: 'idle', draw: 'denied', open: 'idle' });
    expect(shareReducer(asked, msg({ t: 'deny', who: 'me', what: 'screen' }, teacher)).mine.draw).toBe('pending');
    expect(shareReducer(asked, msg({ t: 'deny', who: 'other', what: 'draw' }, teacher)).mine.draw).toBe('pending');
    expect(shareReducer(denied, { kind: 'dismissed' }).mine.draw).toBe('idle');
    expect(shareReducer(asked, { kind: 'dismissed' })).toBe(asked);
  });

  it('only staff may deny: a guest or a salesperson forging «رفض» is ignored', () => {
    const asked = shareReducer(EMPTY_SHARE, { kind: 'asked', what: 'screen' });
    expect(shareReducer(asked, msg({ t: 'deny', who: 'me', what: 'screen' }, guest('g9')))).toBe(asked);
    expect(shareReducer(asked, msg({ t: 'deny', who: 'me', what: 'screen' }, { identity: 's', role: 'sales' }))).toBe(asked);
  });

  it('a grant (the permission or the open board arrived) ends my pending request of that kind', () => {
    const asked = shareReducer(shareReducer(EMPTY_SHARE, { kind: 'asked', what: 'open' }), { kind: 'asked', what: 'screen' });
    const s = shareReducer(asked, { kind: 'granted', what: 'open' });
    expect(s.mine).toEqual({ screen: 'pending', draw: 'idle', open: 'idle' });
  });
});
