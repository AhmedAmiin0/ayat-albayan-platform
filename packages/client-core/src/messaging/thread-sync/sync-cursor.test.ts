import { encodeSyncCursor, NIL_UUID } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { compareCursors, EMPTY_SYNC, laterCursor, nextSince, stampMicros } from './sync-cursor.js';

const A = 'c0000000-0000-4000-8000-0000000000a1';
const B = 'c0000000-0000-4000-8000-0000000000b2';
const cur = (at: string, id = A) => encodeSyncCursor({ at, id });

describe('sync cursor (docs/43 §5)', () => {
  it('keeps Postgres microseconds that Date drops', () => {
    const a = stampMicros('2026-11-06T10:00:00.123456+00:00');
    const b = stampMicros('2026-11-06T10:00:00.123457+00:00');
    expect(b - a).toBe(1n);
    expect(stampMicros('2026-11-06T10:00:00Z')).toBe(
      stampMicros('2026-11-06T10:00:00.000000+00:00'),
    );
  });

  it('orders by (updated_at, id): the server keyset', () => {
    const t = '2026-11-06T10:00:00.5+00:00';
    expect(compareCursors({ at: t, id: A }, { at: t, id: B })).toBe(-1);
    expect(compareCursors({ at: t, id: B }, { at: t, id: A })).toBe(1);
    expect(compareCursors({ at: t, id: A }, { at: t, id: A })).toBe(0);
    expect(compareCursors({ at: '2026-11-06T10:00:01Z', id: A }, { at: t, id: B })).toBe(1);
  });

  it('laterCursor never moves the mark back (an overlap re-read answers an older cursor)', () => {
    const old = cur('2026-11-06T10:00:00Z');
    const newer = cur('2026-11-06T10:00:05Z');
    expect(laterCursor(newer, old)).toBe(newer);
    expect(laterCursor(old, newer)).toBe(newer);
    expect(laterCursor(null, old)).toBe(old);
    expect(laterCursor(old, null)).toBe(old);
    expect(laterCursor(null, null)).toBeNull();
  });

  it('nextSince: nothing on the first sync, the mark while pages are full, else 10 s back', () => {
    const mark = cur('2026-11-06T10:00:30.250000+00:00', B);
    expect(nextSince(EMPTY_SYNC)).toBeUndefined();
    expect(nextSince({ cursor: mark, more: true, scope: 's' })).toBe(mark);
    expect(nextSince({ cursor: mark, more: false, scope: 's' })).toBe(
      cur('2026-11-06T10:00:20.250Z', NIL_UUID),
    );
  });

  it('a rewound cursor is not stored: idle syncs never drift back', () => {
    const mark = cur('2026-11-06T10:00:30Z');
    const asked = nextSince({ cursor: mark, more: false, scope: 's' }) ?? '';
    expect(laterCursor(mark, asked)).toBe(mark);
  });
});
