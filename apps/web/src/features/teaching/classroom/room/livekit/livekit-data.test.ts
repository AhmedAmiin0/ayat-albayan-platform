import type { Room } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';
import { listenData, sendData } from './livekit-data';
import type { DataPacketIn } from '@/features/teaching/classroom/room/components/room-types';

vi.mock('livekit-client', () => ({ RoomEvent: { DataReceived: 'dataReceived' } }));

type Handler = (...a: unknown[]) => void;

function fakeRoom() {
  const handlers = new Map<string, Handler>();
  const publishData = vi.fn(() => Promise.resolve());
  const room = {
    localParticipant: { publishData },
    on: (ev: string, h: Handler) => void handlers.set(ev, h),
    off: (ev: string) => void handlers.delete(ev),
  };
  return { room: room as unknown as Room, handlers, publishData };
}

describe('livekit data', () => {
  it('sends reliable data on the topic, to some identities when asked', async () => {
    const { room, publishData } = fakeRoom();
    const bytes = new Uint8Array([1, 2]);
    await sendData(room, bytes, { topic: 'board' });
    await sendData(room, bytes, { topic: 'board', to: ['late'] });
    expect(publishData).toHaveBeenNthCalledWith(1, bytes, { reliable: true, topic: 'board' });
    expect(publishData).toHaveBeenNthCalledWith(2, bytes, { reliable: true, topic: 'board', destinationIdentities: ['late'] });
  });

  it('forwards packets with the sender’s identity and role; drops server packets; unsubscribes', () => {
    const { room, handlers } = fakeRoom();
    const got: DataPacketIn[] = [];
    const off = listenData(room, (p) => got.push(p));
    const bytes = new Uint8Array([7]);
    handlers.get('dataReceived')?.(bytes, { identity: 't', metadata: '{"role":"teacher"}' }, 0, 'board');
    handlers.get('dataReceived')?.(bytes, undefined, 0, 'board');
    expect(got).toEqual([{ bytes, topic: 'board', from: { identity: 't', role: 'teacher' } }]);
    off();
    expect(handlers.has('dataReceived')).toBe(false);
  });
});
