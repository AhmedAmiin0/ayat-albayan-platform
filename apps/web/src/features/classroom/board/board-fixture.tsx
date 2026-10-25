import type { JoinRole, RoomJoinResult } from '@ab/shared';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ClassroomRoom } from '../room/components/ClassroomRoom';
import { fakeClient, tile, type FakeClient } from '../room/livekit/fake-client';
import { BOARD_TOPIC, decodeMessage, encodeMessage, type BoardMessage } from './model/messages';

// Test data only: a room with the board, driven through the fake client's data channel.

export const joinAs = (role: JoinRole): RoomJoinResult => ({ url: 'wss://lk.test', token: 'tok', room: 'lesson-L1', role });

export function openRoom(role: JoinRole, client: FakeClient = fakeClient({ tiles: [tile({ key: 'me', isLocal: true, role })] })) {
  // jsdom has no 2D canvas: no context, so nothing is painted (draw.ts is tested on its own).
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  render(<ClassroomRoom join={joinAs(role)} make={() => client} />);
  return client;
}

/** What the client sent on the board topic, decoded, with the recipients. */
export function sent(c: FakeClient): { msg: BoardMessage | null; to: string[] | undefined }[] {
  return c.sendData.mock.calls
    .filter(([, o]) => o.topic === BOARD_TOPIC)
    .map(([bytes, o]) => ({ msg: decodeMessage(bytes), to: o.to }));
}

/** A board message from another participant. */
export function from(c: FakeClient, who: { identity: string; role: JoinRole }) {
  return (msg: BoardMessage) => c.receive({ bytes: encodeMessage(msg), topic: BOARD_TOPIC, from: who });
}
