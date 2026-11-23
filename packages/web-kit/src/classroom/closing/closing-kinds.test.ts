import { describe, expect, it } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { CLOSINGS, closingOf, closingSpec } from './closing-kinds';

const base = { status: 'connected' as const, failure: null, endedForAll: false };

describe('closingOf', () => {
  it('is null while the call goes on (connecting, connected, reconnecting)', () => {
    expect(closingOf(base)).toBeNull();
    expect(closingOf({ ...base, status: 'connecting' })).toBeNull();
    expect(closingOf({ ...base, status: 'reconnecting' })).toBeNull();
  });

  it('maps each way out of the call to its screen', () => {
    expect(closingOf({ ...base, status: 'ended' })).toBe('left');
    expect(closingOf({ ...base, status: 'closed' })).toBe('closed');
    expect(closingOf({ ...base, status: 'removed' })).toBe('removed');
    expect(closingOf({ ...base, status: 'duplicate' })).toBe('duplicate');
  });

  it('shows a failed connect, and lets the page’s 410 lesson_ended win over everything', () => {
    expect(closingOf({ ...base, failure: 'تعذّر' })).toBe('failed');
    expect(closingOf({ ...base, status: 'ended', endedForAll: true })).toBe('final');
  });

  it('keeps staff on the plain «خرجت من الحلقة»; the family reads why it ended', () => {
    expect(closingSpec('closed', 'staff')).toMatchObject({ title: t.classroom.ended, body: null });
    expect(closingSpec('left', 'staff').body).toBeNull();
    expect(closingSpec('closed', 'family').title).toBe(t.classroom.closedHint);
    expect(closingSpec('left', 'family').body).toBe(t.mobileRoom.left.body);
    expect(closingSpec('removed', 'staff')).toBe(CLOSINGS.removed);
  });

  it('offers a rejoin only where one can work', () => {
    expect(CLOSINGS.left.rejoin && CLOSINGS.closed.rejoin && CLOSINGS.failed.rejoin).toBe(true);
    const none = [CLOSINGS.final, CLOSINGS.removed, CLOSINGS.duplicate].map((x) => x.rejoin);
    expect(none).toEqual([false, false, false]);
  });
});
