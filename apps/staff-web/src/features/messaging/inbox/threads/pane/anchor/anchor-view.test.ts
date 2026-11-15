import { describe, expect, it } from 'vitest';
import { detail, message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { decideView, LIVE_VIEW, pageRows } from './anchor-view';

const rows = (...ids: string[]) => ids.map((id) => ({ id }));

describe('decideView (docs/37 NEW 3)', () => {
  it('a hit on screen scrolls and keeps the view; any other opens the window around it', () => {
    expect(decideView(LIVE_VIEW, { msg: 'a', shown: rows('a', 'b') })).toEqual({
      msg: 'a',
      window: null,
      scroll: 'a',
    });
    expect(decideView(LIVE_VIEW, { msg: 'z', shown: rows('a') })).toEqual({
      msg: 'z',
      window: 'z',
      scroll: null,
    });
  });

  it('inside a window, a hit it shows scrolls there and the window stays', () => {
    const inWindow = { msg: 'z', window: 'z', scroll: null };
    expect(decideView(inWindow, { msg: 'y', shown: rows('y', 'z') })).toEqual({
      msg: 'y',
      window: 'z',
      scroll: 'y',
    });
  });

  it('no msg is the live chat', () => {
    expect(decideView({ msg: 'z', window: 'z', scroll: null }, { msg: undefined, shown: [] })).toBe(
      LIVE_VIEW,
    );
  });
});

describe('pageRows', () => {
  it('newest page first in, oldest → newest out; nothing without data', () => {
    const newer = detail([message({ id: 'c' })]);
    const older = detail([message({ id: 'a' }), message({ id: 'b' })]);
    expect(pageRows({ pages: [newer, older] }).map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(pageRows(undefined)).toEqual([]);
  });
});
