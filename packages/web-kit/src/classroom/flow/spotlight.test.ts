import { describe, expect, it } from 'vitest';
import { tile } from '@ab/web-kit/classroom/room/livekit/fake-client';
import { isAlone, ownTile, roomLayout } from './spotlight';

const me = tile({ key: 'me', isLocal: true });
const teacher = tile({ key: 'fatima', role: 'teacher' });
const assistant = tile({ key: 'maryam', role: 'assistant' });
const screen = tile({ key: 'fatima:screen', role: 'teacher', kind: 'screen' });

describe('roomLayout', () => {
  it('puts the teacher on the stage for the family, everyone else in the strip', () => {
    const layout = roomLayout([me, teacher, assistant], false, true);
    expect(layout).toEqual({ mode: 'stage', board: false, stage: teacher, strip: [me, assistant] });
  });

  it('keeps the even grid for staff, and without a teacher', () => {
    expect(roomLayout([me, teacher], false, false).mode).toBe('grid');
    expect(roomLayout([me, assistant], false, true).mode).toBe('grid');
  });

  it('lets a shared screen or the board win over the teacher', () => {
    const shared = roomLayout([me, teacher, screen], false, true);
    expect(shared.mode === 'stage' && shared.stage).toBe(screen);
    expect(roomLayout([me, teacher], true, true)).toMatchObject({ mode: 'stage', board: true });
  });

  it('leaves a lone teacher tile (a staff preview) in the grid', () => {
    expect(roomLayout([teacher], false, true).mode).toBe('grid');
  });
});

describe('isAlone', () => {
  it('is true with only one’s own camera, false once anyone else is in', () => {
    expect(isAlone([me])).toBe(true);
    expect(isAlone([])).toBe(true);
    expect(isAlone([me, assistant])).toBe(false);
  });
});

describe('ownTile', () => {
  it("finds one's own camera wherever it sits, and nothing before it is there", () => {
    expect(ownTile([teacher, me])).toBe(me);
    expect(ownTile([teacher, assistant])).toBeUndefined();
    expect(ownTile([])).toBeUndefined();
  });
});
