import { describe, expect, it, vi } from 'vitest';
import { watchModeration } from './livekit-moderated';

vi.mock('livekit-client', () => ({ RoomEvent: { TrackMuted: 'trackMuted' } }));

type Handler = (...a: unknown[]) => void;
function fakeRoom() {
  const handlers = new Map<string, Handler>();
  const room = {
    on: (ev: string, h: Handler) => {
      handlers.set(ev, h);
      return room;
    },
  };
  return { room, fire: (...a: unknown[]) => handlers.get('trackMuted')?.(...a) };
}

describe('watchModeration', () => {
  it('a local mute outside a self-action is the staff’s: microphone or camera', () => {
    const { room, fire } = fakeRoom();
    const w = watchModeration(room as never);
    const seen = vi.fn();
    w.on(seen);
    fire({ source: 'microphone' }, { isLocal: true });
    fire({ source: 'camera' }, { isLocal: true });
    expect(seen.mock.calls).toEqual([[{ source: 'microphone' }], [{ source: 'camera' }]]);
  });

  it('ignores someone else’s mute, a screen share, and my own toggle', async () => {
    const { room, fire } = fakeRoom();
    const w = watchModeration(room as never);
    const seen = vi.fn();
    const off = w.on(seen);
    fire({ source: 'microphone' }, { isLocal: false });
    fire({ source: 'screen_share' }, { isLocal: true });
    await w.self(async () => fire({ source: 'microphone' }, { isLocal: true }));
    expect(seen).not.toHaveBeenCalled();
    off();
    fire({ source: 'microphone' }, { isLocal: true });
    expect(seen).not.toHaveBeenCalled();
  });

  it('a failing self-action still ends the self window', async () => {
    const { room, fire } = fakeRoom();
    const w = watchModeration(room as never);
    const seen = vi.fn();
    w.on(seen);
    await expect(w.self(() => Promise.reject(new Error('denied')))).rejects.toThrow('denied');
    fire({ source: 'microphone' }, { isLocal: true });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
