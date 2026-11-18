import { describe, expect, it } from 'vitest';
import { lesson } from '@ab/web-kit/portal/portal.fixtures';
import { rowShowsTimer } from './row-clock';

// The way in opens 15:50 UTC, the lesson runs 16:00–16:30 UTC on 27 Oct 2026.
const l = lesson();
const at = (hhmm: string) => new Date(`2026-10-27T${hhmm}:00.000Z`);

describe('a later lesson row’s timer', () => {
  it('none before the way in opens (the row says from when instead)', () => {
    expect(rowShowsTimer(l, at('09:00'))).toBe(false);
    expect(rowShowsTimer(l, new Date('2026-10-23T09:00:00.000Z'))).toBe(false);
  });

  it('the countdown to the start once the way in is open', () => {
    expect(rowShowsTimer(l, at('15:55'))).toBe(true);
  });

  it('«الحلقة جارية الآن» while it runs', () => {
    expect(rowShowsTimer(l, at('16:10'))).toBe(true);
  });
});
