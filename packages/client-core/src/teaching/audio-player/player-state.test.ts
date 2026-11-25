import { describe, expect, it } from 'vitest';
import { initialPlayer, playerReducer, type PlayerEvent, type PlayerState } from '.';

const run = (events: PlayerEvent[], start = initialPlayer()): PlayerState =>
  events.reduce(playerReducer, start);

describe('playerReducer', () => {
  it('loads paused at the saved stop, then plays and pauses', () => {
    const s = run([{ type: 'loaded', duration: 120 }, { type: 'play' }], initialPlayer(40));
    expect(s).toMatchObject({ status: 'playing', position: 40, duration: 120 });
    expect(playerReducer(s, { type: 'pause' }).status).toBe('paused');
  });

  it('skips by 10 s within the file and picks a speed', () => {
    const s = run([
      { type: 'loaded', duration: 30 },
      { type: 'time', position: 25 },
      { type: 'skip', direction: 1 },
      { type: 'speed', speed: 1.5 },
    ]);
    expect(s).toMatchObject({ position: 30, speed: 1.5 });
    expect(playerReducer(s, { type: 'skip', direction: -1 }).position).toBe(20);
  });

  it('ends at the end, fails on a broken file, seeks within bounds', () => {
    const s = run([{ type: 'loaded', duration: 60 }, { type: 'seek', position: 90 }]);
    expect(s.position).toBe(60);
    expect(playerReducer(s, { type: 'ended' })).toMatchObject({ status: 'ended', position: 60 });
    expect(playerReducer(s, { type: 'failed' }).status).toBe('failed');
  });
});
